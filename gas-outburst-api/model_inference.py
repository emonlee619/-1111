import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv
import numpy as np
import pandas as pd
import joblib
import json
import sqlite3

N_DYNAMIC = 63
ALPHA = 0.25
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'outburst_warning.db')

class SharedTCN(nn.Module):
    def __init__(self, in_dim=1, hidden_dim=8, kernel_size=3, num_layers=2):
        super().__init__()
        layers = []
        for i in range(num_layers):
            in_channels = in_dim if i == 0 else hidden_dim
            dw_conv = nn.Conv1d(in_channels, in_channels,
                               kernel_size=kernel_size,
                               padding=kernel_size//2,
                               groups=in_channels)
            pw_conv = nn.Conv1d(in_channels, hidden_dim, kernel_size=1)
            layers.extend([dw_conv, nn.ReLU(), pw_conv, nn.ReLU()])
        self.tcn = nn.Sequential(*layers)
        self.layer_norms = nn.ModuleList([nn.LayerNorm(hidden_dim) for _ in range(N_DYNAMIC)])

    def forward(self, x):
        B, N, T = x.shape
        x = x.reshape(B * N, 1, T)
        x = self.tcn(x)
        x = x.reshape(B, N, -1)
        out = []
        for i in range(N):
            out.append(self.layer_norms[i](x[:, i, :]))
        x = torch.stack(out, dim=1)
        return x

class SpatialEncoder(nn.Module):
    def __init__(self, in_dim, hidden_dim, out_dim, heads=2):
        super().__init__()
        self.gat1 = GATConv(in_dim, hidden_dim, heads=heads, concat=True, dropout=0.2)
        self.gat2 = GATConv(hidden_dim * heads, out_dim, heads=1, concat=False, dropout=0.2)
        self.norm = nn.LayerNorm(out_dim)

    def forward(self, x, edge_index, edge_weight):
        x = F.elu(self.gat1(x, edge_index, edge_attr=edge_weight))
        x = self.gat2(x, edge_index, edge_attr=edge_weight)
        return self.norm(x)

class TemporalEncoder(nn.Module):
    def __init__(self, in_dim, hidden_dim, num_layers=1):
        super().__init__()
        self.lstm = nn.LSTM(in_dim, hidden_dim, num_layers,
                           batch_first=True, dropout=0.2)

    def forward(self, x):
        B, T, N, D = x.shape
        x = x.permute(0, 2, 1, 3).reshape(B*N, T, D)
        x, _ = self.lstm(x)
        x = x.reshape(B, N, T, -1).permute(0, 2, 1, 3)
        return x

class VariableSelectionNetwork(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_features=63):
        super().__init__()
        self.attention = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1)
        )
        self.num_features = num_features

    def forward(self, x):
        B, T, N, D = x.shape
        x_flat = x.reshape(B*T*N, D)
        attn_logits = self.attention(x_flat)
        attn_logits = attn_logits.reshape(B, T, N)
        alpha = F.softmax(attn_logits.mean(dim=1), dim=1)
        x_weighted = x * attn_logits.unsqueeze(-1)
        x_global = x_weighted.mean(dim=2)
        return x_global, alpha

class OutputHeads(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.risk_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim//2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim//2, 1),
            nn.Sigmoid()
        )

    def forward(self, x_global):
        risk_score = self.risk_head(x_global).squeeze(-1)
        return risk_score

class OutburstGNN_TFT(nn.Module):
    def __init__(self, decoder_input_dim=64):
        super().__init__()
        self.tcn = SharedTCN(in_dim=1, hidden_dim=8, kernel_size=3, num_layers=2)
        self.gat = SpatialEncoder(in_dim=8, hidden_dim=16, out_dim=16, heads=2)
        self.lstm = TemporalEncoder(in_dim=16, hidden_dim=32, num_layers=1)
        self.vsn = VariableSelectionNetwork(input_dim=32, hidden_dim=32, num_features=N_DYNAMIC)
        self.decoder = OutputHeads(hidden_dim=decoder_input_dim)

    def forward(self, x_seq, edge_index, edge_weight, mine_static, static_risk):
        B, T, N, C = x_seq.shape
        tcn_out = []
        for t in range(T):
            xt = x_seq[:, t, :, :].reshape(B, N, -1)
            xt = self.tcn(xt)
            tcn_out.append(xt)
        tcn_out = torch.stack(tcn_out, dim=1)
        gat_out = []
        for t in range(T):
            xt = self.gat(tcn_out[:, t, :, :].reshape(B*N, -1), edge_index, edge_weight)
            gat_out.append(xt.reshape(B, N, -1))
        gat_out = torch.stack(gat_out, dim=1)
        lstm_out = self.lstm(gat_out)
        x_global = lstm_out[:, -1, :, :].mean(dim=1)
        mine_static_expanded = mine_static.expand(B, -1)
        x_global = torch.cat([x_global, mine_static_expanded], dim=1)
        static_risk_expanded = static_risk.expand(B, -1)
        x_global = torch.cat([x_global, static_risk_expanded], dim=1)
        _, heatmap = self.vsn(lstm_out)
        dynamic_score = self.decoder(x_global)
        return dynamic_score, heatmap

    def compute_combined_risk(self, dynamic_score, static_risk, alpha=ALPHA):
        S = static_risk.squeeze(1)
        combined_risk = alpha * S + (1 - alpha) * dynamic_score
        return combined_risk

def build_graph_structure():
    import pandas as pd
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    data_dir = os.path.join(project_root, '数据')
    meta_path = os.path.join(data_dir, '动态空间数据指标总览.xlsx')
    
    meta_all = pd.read_excel(meta_path)
    meta_all = meta_all.reset_index(drop=True)
    A = np.zeros((N_DYNAMIC, N_DYNAMIC), dtype=np.float32)

    for pos in meta_all['空间位置'].unique():
        idxs = meta_all[meta_all['空间位置'] == pos].index.tolist()
        for i in idxs:
            for j in idxs:
                if i != j:
                    A[i, j] = 1.0

    mine_locations = ['采面', '回风', '进风', '切眼', '上隅角', '工作面', '埋管']
    for loc_keyword in mine_locations:
        idxs = meta_all[meta_all['空间位置'].str.contains(loc_keyword)].index.tolist()
        for i in idxs:
            for j in idxs:
                if i != j:
                    A[i, j] = 1.0

    for ind in meta_all['监测指标'].unique():
        idxs = meta_all[meta_all['监测指标'] == ind].index.tolist()
        for i in idxs:
            for j in idxs:
                if i != j:
                    A[i, j] = 1.0

    coupling_pairs = [
        ('甲烷', '一氧化碳'), ('甲烷', '煤层瓦斯压力'),
        ('微震事件频次', '微震事件能量'), ('微震 b 值', '微震事件能量'),
        ('电磁辐射强度', '声发射事件率'), ('管道瓦斯', '管道流量'),
        ('管道压力', '管道流量'),
    ]
    for ind_a, ind_b in coupling_pairs:
        idxs_a = meta_all[meta_all['监测指标'].str.contains(ind_a)].index.tolist()
        idxs_b = meta_all[meta_all['监测指标'].str.contains(ind_b)].index.tolist()
        for ia in idxs_a:
            for ib in idxs_b:
                A[ia, ib] = 1.0
                A[ib, ia] = 1.0

    return A

def get_sensor_order():
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    data_dir = os.path.join(project_root, '数据')
    
    sensor_dir = os.path.join(data_dir, '动态数据（真实传感器）')
    if os.path.exists(sensor_dir):
        a_sensor_files = sorted([f for f in os.listdir(sensor_dir) if f.endswith('.db')])
        a_cols = [f.replace('.db', '') for f in a_sensor_files]
    else:
        a_cols = ['34A01', '35A09', '35A10', '35A11', '35A12', '38A01', '38A02', '38A03', '38A04', '38A09', '39A01', '39A02', '39A03', '39A04', '39A05', '39A07', '39A13', '39A14', '39A15', '39A16', '40A05', '40D14']
    
    gen_data_path = os.path.join(data_dir, '动态数据（物理约束生成）.csv')
    df_gen = pd.read_csv(gen_data_path)
    b_cols = [c for c in df_gen.columns if c.startswith('B')]
    
    return a_cols + b_cols

class ModelInference:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.scaler_a = None
        self.scaler_b = None
        self.scaler_static = None
        self.edge_index = None
        self.edge_weight = None
        self.mine_static_tensor = None
        self.sensor_order = None
        self._initialized = False
        
        self.data_pool = None
        self.data_pool_timestamps = None
        self.pool_start_time = None
        self.pool_end_time = None
        self.current_pool_index = 0
        self.seq_len = 60
        self.total_pool_samples = 0

    def initialize(self):
        if self._initialized:
            return
        
        print(f"初始化模型推理模块，设备: {self.device}")
        
        self.sensor_order = get_sensor_order()
        
        print("加载标准化器...")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.scaler_a = joblib.load(os.path.join(base_dir, 'scaler_a.pkl'))
        self.scaler_b = joblib.load(os.path.join(base_dir, 'scaler_b.pkl'))
        self.scaler_static = joblib.load(os.path.join(base_dir, 'scaler_static.pkl'))
        
        print("构建图结构...")
        A = build_graph_structure()
        self.edge_index = torch.tensor(np.where(A > 0), dtype=torch.long).to(self.device)
        self.edge_weight = torch.tensor(A[A > 0], dtype=torch.float).unsqueeze(1).to(self.device)
        
        print("加载模型...")
        model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'best_63node.pt')
        self.model = OutburstGNN_TFT().to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()
        
        print("加载静态属性...")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(base_dir)
        data_dir = os.path.join(project_root, '数据')
        static_path = os.path.join(data_dir, '虚拟矿井32项静态数据_50条.csv')
        static_mine = pd.read_csv(static_path)
        exclude_cols = ['样本编号', '矿井类型', '地质构造类型', '煤层自燃倾向性', 
                        '主通风系统合理性', '矿井瓦斯等级', '风险等级', '红线熔断', '事故严重程度']
        numeric_cols = [c for c in static_mine.columns if c not in exclude_cols]
        mine_static = static_mine[numeric_cols].values.astype(np.float32)
        mine_static = self.scaler_static.transform(mine_static)
        safe_indices = static_mine[static_mine['红线熔断'] == 0].index.tolist()
        self.mine_static_tensors = [torch.tensor(mine_static[i], dtype=torch.float).unsqueeze(0).to(self.device) for i in safe_indices]
        self.safe_indices = safe_indices
        self.current_mine_index = 0
        self.total_mines = len(self.mine_static_tensors)
        self.mine_static_tensor = self.mine_static_tensors[0]
        print(f"  加载了 {self.total_mines} 条安全矿井静态数据")
        
        print("时空配准与数据池构建...")
        self.build_data_pool()
        
        self._initialized = True
        print("模型推理模块初始化完成！")
        print(f"  数据池大小: {self.total_pool_samples} 个时间步")
        print(f"  覆盖时间: {self.pool_start_time} ~ {self.pool_end_time}")

    def build_data_pool(self):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT sensor_id, MIN(timestamp), MAX(timestamp) FROM dynamic_sensor_data GROUP BY sensor_id')
        sensor_ranges = cursor.fetchall()
        
        a_sensors = [r[0] for r in sensor_ranges if not r[0].startswith('B')]
        b_sensors = [r[0] for r in sensor_ranges if r[0].startswith('B')]
        
        print(f"  A类传感器: {len(a_sensors)}个, B类传感器: {len(b_sensors)}个")
        
        cursor.execute('SELECT timestamp, sensor_id, value FROM dynamic_sensor_data')
        rows = cursor.fetchall()
        conn.close()
        
        df = pd.DataFrame(rows, columns=['timestamp', 'sensor_id', 'value'])
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        print("  数据加载完成，开始时空配准...")
        
        a_df = df[df['sensor_id'].isin(a_sensors)]
        b_df = df[df['sensor_id'].isin(b_sensors)]
        
        a_pivot = a_df.pivot(index='timestamp', columns='sensor_id', values='value').sort_index()
        b_pivot = b_df.pivot(index='timestamp', columns='sensor_id', values='value').sort_index()
        
        print(f"  A类原始数据: {len(a_pivot)} 时间点, B类原始数据: {len(b_pivot)} 时间点")
        
        target_freq = '1min'
        
        a_resampled = a_pivot.resample(target_freq).mean().interpolate(method='linear').bfill().ffill()
        b_resampled = b_pivot.resample(target_freq).mean().interpolate(method='linear').bfill().ffill()
        
        print(f"  A类重采样后: {len(a_resampled)} 时间点, B类重采样后: {len(b_resampled)} 时间点")
        
        b_start = b_resampled.index[0]
        b_end = b_resampled.index[-1]
        b_duration = b_end - b_start
        
        a_start = a_resampled.index[0]
        a_end = a_resampled.index[-1]
        a_duration = a_end - a_start
        
        target_duration = min(a_duration, b_duration)
        
        a_cropped = a_resampled.iloc[:int(target_duration.total_seconds() / 60) + 1]
        
        a_offset = b_start - a_cropped.index[0]
        a_shifted_index = a_cropped.index + a_offset
        
        a_shifted = a_cropped.copy()
        a_shifted.index = a_shifted_index
        
        print(f"  B类时间范围: {b_start} ~ {b_end}")
        print(f"  A类平移后时间范围: {a_shifted.index[0]} ~ {a_shifted.index[-1]}")
        
        unified_df = pd.concat([a_shifted, b_resampled], axis=1)
        
        for sensor in self.sensor_order:
            if sensor not in unified_df.columns:
                unified_df[sensor] = 0
        
        unified_df = unified_df[self.sensor_order]
        
        unified_df = unified_df.interpolate(method='linear').bfill().ffill()
        
        unified_df = unified_df.loc[b_start:b_end]
        
        print(f"  对齐后统一时间范围: {b_start} ~ {b_end}")
        print(f"  统一后时间点数: {len(unified_df)}")
        
        self.data_pool = unified_df.values.astype(np.float32)
        self.data_pool_timestamps = unified_df.index
        self.pool_start_time = b_start
        self.pool_end_time = b_end
        self.total_pool_samples = len(self.data_pool)
        
        print(f"  数据池构建完成: {self.total_pool_samples} 个时间步, {len(self.sensor_order)} 个传感器")

    def get_next_window(self):
        if self.total_pool_samples <= self.seq_len:
            return self.data_pool, self.data_pool_timestamps[-self.seq_len:]
        
        if self.current_pool_index + self.seq_len > self.total_pool_samples:
            self.current_pool_index = 0
        
        start_idx = self.current_pool_index
        end_idx = start_idx + self.seq_len
        window_data = self.data_pool[start_idx:end_idx]
        window_timestamps = self.data_pool_timestamps[start_idx:end_idx]
        
        self.current_pool_index += 30
        
        return window_data, window_timestamps

    def map_to_real_time(self, historical_timestamp):
        now = pd.Timestamp.now()
        pool_duration = self.pool_end_time - self.pool_start_time
        
        elapsed_since_start = historical_timestamp - self.pool_start_time
        ratio = elapsed_since_start / pool_duration
        
        mapped_time = now - pool_duration + ratio * pool_duration
        return mapped_time.isoformat()

    def query_recent_data(self, seq_len=60):
        self.seq_len = seq_len
        window_data, window_timestamps = self.get_next_window()
        return window_data, window_timestamps

    def predict(self, X_seq=None, static_risk=None):
        if not self._initialized:
            self.initialize()
        
        window_timestamps = None
        if X_seq is None:
            X_seq, window_timestamps = self.query_recent_data()
            if X_seq is None:
                return None
        
        n_a = len(self.scaler_a.feature_names_in_) if hasattr(self.scaler_a, 'feature_names_in_') else 22
        n_b = len(self.sensor_order) - n_a
        
        X_a = self.scaler_a.transform(X_seq[:, :n_a])
        X_b = self.scaler_b.transform(X_seq[:, n_a:])
        X_scaled = np.concatenate([X_a, X_b], axis=1)
        
        X_tensor = torch.tensor(X_scaled, dtype=torch.float).unsqueeze(0).unsqueeze(-1).to(self.device)
        
        self.current_mine_index = (self.current_mine_index + 1) % self.total_mines
        self.mine_static_tensor = self.mine_static_tensors[self.current_mine_index]
        
        if static_risk is None:
            static_risk = self.get_static_risk_from_db()
        
        static_risk_tensor = torch.tensor([[static_risk]], dtype=torch.float).to(self.device)
        
        with torch.no_grad():
            dynamic_score, heatmap = self.model(
                X_tensor, self.edge_index, self.edge_weight,
                self.mine_static_tensor, static_risk_tensor
            )
            combined_risk = self.model.compute_combined_risk(dynamic_score, static_risk_tensor)
        
        dynamic_score = dynamic_score.cpu().numpy()[0]
        combined_risk = combined_risk.cpu().numpy()[0]
        heatmap = heatmap.cpu().numpy()[0]
        
        risk_level = self.get_risk_level(combined_risk)
        
        mapped_timestamp = pd.Timestamp.now().isoformat()
        if window_timestamps is not None and len(window_timestamps) > 0:
            mapped_timestamp = self.map_to_real_time(window_timestamps[-1])
        
        return {
            'dynamic_risk': float(dynamic_score),
            'static_risk': float(static_risk),
            'combined_risk': float(combined_risk),
            'risk_level': risk_level,
            'heatmap': heatmap.tolist(),
            'timestamp': mapped_timestamp,
            'window_timestamps': [self.map_to_real_time(ts) for ts in window_timestamps] if window_timestamps is not None else []
        }
    
    def get_static_risk_from_db(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(base_dir)
        data_dir = os.path.join(project_root, '数据')
        static_path = os.path.join(data_dir, '虚拟矿井32项静态数据_50条.csv')
        static_mine = pd.read_csv(static_path)
        actual_index = self.safe_indices[self.current_mine_index]
        row = static_mine.iloc[actual_index]
        risk_level = row['风险等级']
        red_line = row['红线熔断']
        
        if red_line == 1 or risk_level == '危险（红线熔断）':
            return 1.0
        elif risk_level == '安全':
            return 0.2
        elif risk_level == '较安全':
            return 0.35
        elif risk_level == '一般':
            return 0.5
        elif risk_level == '较危险':
            return 0.7
        elif risk_level == '危险':
            return 0.9
        else:
            return 0.5
    
    def get_risk_level(self, score):
        if score < 0.3:
            return '安全'
        elif score < 0.5:
            return '较安全'
        elif score < 0.7:
            return '一般'
        elif score < 0.9:
            return '较危险'
        else:
            return '危险'

    def get_sensor_contribution(self, heatmap):
        contribution = []
        for i, sensor_id in enumerate(self.sensor_order):
            contribution.append({
                'sensor_id': sensor_id,
                'contribution': float(heatmap[i]),
                'rank': int(np.argsort(heatmap)[::-1].tolist().index(i) + 1)
            })
        return sorted(contribution, key=lambda x: x['contribution'], reverse=True)

import pandas as pd

inference = ModelInference()
