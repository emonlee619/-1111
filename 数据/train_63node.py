"""
63节点GNN-TFT瓦斯突出动态预警模型训练脚本
双模型架构：静态风险子模型（模糊数学）+ 动态预警子模型（GNN-TFT）
综合风险概率 = α × S + (1-α) × P_dynamic  (α=0.25)
"""

import pandas as pd
import numpy as np
import sqlite3
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
from torch_geometric.nn import GATConv
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib

N_DYNAMIC = 63
N_STATIC_RISK = 1
ALPHA = 0.25
N_STATIC = None

from 模糊数学评价 import fuzzy_comprehensive_evaluation

def compute_static_risk_index(static_mine_row):
    fuzzy_input = {
        "煤层瓦斯压力": static_mine_row.get('煤层瓦斯压力_MPa', 0),
        "煤坚固性系数": static_mine_row.get('煤坚固性系数_f', 1),
        "瓦斯放散初速度": static_mine_row.get('瓦斯放散初速度_mmHg', 0),
        "煤层埋藏深度": static_mine_row.get('煤层埋藏深度_m', 0),
        "地质构造": {'无构造': 0, '一般构造': 1, '复杂构造': 2}.get(
            static_mine_row.get('地质构造类型', '无构造'), 0
        ),
        "断层距工作面距离": static_mine_row.get('断层距工作面距离_m', 1000),
        "工作面与构造带距离": static_mine_row.get('工作面与构造带距离_m', 1000),
        "突出危险性综合指标D": static_mine_row.get('D值', 0),
        "突出危险性综合指标K": static_mine_row.get('K值', 0),
        "煤层厚度": static_mine_row.get('煤层厚度_m', 0),
        "煤层倾角": static_mine_row.get('煤层倾角_°', 0),
        "煤层自燃倾向性": {'不易自燃': 0, '自燃': 1, '容易自燃': 2}.get(
            static_mine_row.get('煤层自燃倾向性', '不易自燃'), 0
        ),
        "主通风系统合理性": {'合理': 0, '待改善': 1, '不合理': 2}.get(
            static_mine_row.get('主通风系统合理性', '合理'), 0
        ),
        "瓦斯抽采效果检验达标": bool(static_mine_row.get('瓦斯抽采效果达标', 1)),
        "瓦斯抽采效果接续合理": bool(static_mine_row.get('瓦斯抽采接续合理', 1)),
        "风速异常报警次数": static_mine_row.get('风速异常报警次数', 0),
        "局部通风机馈电异常次数": static_mine_row.get('局部通风机馈电异常次数', 0),
        "甲烷电风电闭锁失效次数": static_mine_row.get('甲烷电风电闭锁失效次数', 0),
        "瓦斯传感器超限时长": static_mine_row.get('瓦斯传感器超限时长_min', 0),
        "瓦斯传感器超限次数": static_mine_row.get('瓦斯传感器超限次数', 0),
        "应断未断电次数": static_mine_row.get('应断未断电次数', 0),
        "瓦检员空班漏检假检次数": static_mine_row.get('瓦检员空班漏检假检次数', 0),
        "通风专业瓦斯相关三违数量": static_mine_row.get('通风瓦斯三违数量', 0),
        "安全培训率": static_mine_row.get('安全培训率', 1),
        "持证上岗率": static_mine_row.get('持证上岗率', 1),
        "吨煤安全费用提取": static_mine_row.get('吨煤安全费用_元', 0),
        "矿井瓦斯等级": {'低瓦斯': 0, '高瓦斯': 1, '突出': 2}.get(
            static_mine_row.get('矿井瓦斯等级', '低瓦斯'), 0
        ),
        "火源管理合规": bool(static_mine_row.get('火源管理合规', 1)),
        "有防灭火设计": bool(static_mine_row.get('有防灭火设计', 1)),
        "支护材料可燃": bool(static_mine_row.get('支护材料可燃', 0)),
        "煤尘爆炸指数": static_mine_row.get('煤尘爆炸指数', 0),
        "瓦斯爆炸类隐患数量": static_mine_row.get('瓦斯爆炸隐患数量', 0),
        "事故历史": (bool(static_mine_row.get('有事故历史', 0)), 
                   static_mine_row.get('事故严重程度', 0))
    }
    comprehensive_score = fuzzy_comprehensive_evaluation(fuzzy_input)['综合评分']
    S = 1 - (comprehensive_score / 100)
    return S

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
    def __init__(self, in_dim, hidden_dim, num_layers=2):
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
    def __init__(self):
        super().__init__()
        self.tcn = SharedTCN(in_dim=1, hidden_dim=8, kernel_size=3, num_layers=2)
        self.gat = SpatialEncoder(in_dim=8, hidden_dim=16, out_dim=16, heads=2)
        self.lstm = TemporalEncoder(in_dim=16, hidden_dim=32, num_layers=1)
        self.vsn = VariableSelectionNetwork(input_dim=32, hidden_dim=32, num_features=N_DYNAMIC)
        self.decoder = None

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
        x_global = lstm_out.mean(dim=1).mean(dim=1)
        mine_static_expanded = mine_static.expand(B, -1)
        x_global = torch.cat([x_global, mine_static_expanded], dim=1)
        static_risk_expanded = static_risk.expand(B, -1)
        x_global = torch.cat([x_global, static_risk_expanded], dim=1)
        if self.decoder is None:
            self.decoder = OutputHeads(hidden_dim=x_global.shape[-1]).to(x_global.device)
        _, heatmap = self.vsn(lstm_out)
        dynamic_score = self.decoder(x_global)
        return dynamic_score, heatmap

    def compute_combined_risk(self, dynamic_score, static_risk, alpha=ALPHA):
        S = static_risk.squeeze(1)
        combined_risk = alpha * S + (1 - alpha) * dynamic_score
        return combined_risk

class MultiTaskLoss(nn.Module):
    def __init__(self, alpha=1.0, beta=0.3):
        super().__init__()
        self.alpha = alpha
        self.beta = beta

    def forward(self, pred_score, pred_heatmap, target_score, target_cls, target_heatmap, is_disaster):
        loss_bce = F.binary_cross_entropy(pred_score, target_score)
        loss_kl = torch.tensor(0.0, device=pred_heatmap.device)
        if is_disaster.any():
            disaster_mask = is_disaster.nonzero().squeeze(1)
            if disaster_mask.dim() == 0:
                disaster_mask = disaster_mask.unsqueeze(0)
            kl_div = F.kl_div(torch.log(pred_heatmap[disaster_mask] + 1e-10),
                             target_heatmap[disaster_mask],
                             reduction='none').sum(dim=1)
            loss_kl = kl_div.mean()
        return self.alpha * loss_bce + self.beta * loss_kl, {
            'bce': loss_bce.item(),
            'kl': loss_kl.item() if is_disaster.any() else 0.0
        }

def compute_target_heatmap(x_seq):
    B, T, N, C = x_seq.shape
    deviation = x_seq[:, -1, :, :].norm(dim=2)
    return F.softmax(deviation * 2, dim=1)

def build_sequences(X, y_cls, y_reg, seq_len=60, pred_horizon=5):
    samples = []
    T = len(X)
    for i in range(T - seq_len - pred_horizon + 1):
        x_seq = X[i : i + seq_len]
        y_c = y_cls[i + seq_len + pred_horizon - 1]
        y_r = y_reg[i + seq_len + pred_horizon - 1]
        samples.append((x_seq, y_c, y_r))
    return samples

def main():
    print("=" * 70)
    print("63节点GNN-TFT瓦斯突出动态预警模型训练")
    print("=" * 70)

    sensor_dir = '动态数据（真实传感器）'
    gen_data_path = '动态数据（物理约束生成）.csv'
    meta_path = '动态空间数据指标总览.xlsx'
    static_path = '虚拟矿井32项静态数据_50条.csv'

    print("\n[1/5] 加载物理约束生成数据...")
    df_gen = pd.read_csv(gen_data_path)
    df_gen['timestamp'] = pd.to_datetime(df_gen['timestamp'])
    df_gen = df_gen.sort_values('timestamp').reset_index(drop=True)
    print(f"  物理约束生成数据: {len(df_gen)} 行")

    print("\n[2/5] 加载真实传感器数据...")
    a_sensor_files = sorted([f for f in os.listdir(sensor_dir) if f.endswith('.db')])
    print(f"  发现 {len(a_sensor_files)} 个传感器文件")
    a_sensors = []
    for filename in a_sensor_files:
        filepath = os.path.join(sensor_dir, filename)
        conn = sqlite3.connect(filepath)
        df_a = pd.read_sql('SELECT * FROM db202502', conn)
        try:
            df_a = pd.concat([df_a, pd.read_sql('SELECT * FROM db202503', conn)], ignore_index=True)
        except:
            pass
        conn.close()
        df_a['timestamp'] = pd.to_datetime(df_a['date'])
        df_a = df_a.sort_values('timestamp').reset_index(drop=True)
        sensor_id = filename.replace('.db', '')
        df_a = df_a.rename(columns={'value': sensor_id})
        a_sensors.append(df_a[['timestamp', sensor_id]])

    df_combined = df_gen.copy()
    for df_a in a_sensors:
        df_a_resampled = df_a.set_index('timestamp').resample('1min').mean().interpolate(method='linear')
        df_a_resampled = df_a_resampled.reindex(df_gen['timestamp'], method='nearest')
        sensor_id = df_a_resampled.columns[0]
        df_combined[sensor_id] = df_a_resampled.values.flatten()
    print(f"  合并后数据: {len(df_combined)} 行 × {len(df_combined.columns)} 列")

    print("\n[3/5] 加载元数据和静态数据...")
    meta_all = pd.read_excel(meta_path)
    static_mine = pd.read_csv(static_path)
    print(f"  元数据: {len(meta_all)} 项指标")
    print(f"  静态数据: {len(static_mine)} 条记录")

    a_cols = [f.replace('.db', '') for f in a_sensor_files]
    b_cols = [c for c in df_gen.columns if c.startswith('B')]
    feature_cols = a_cols + b_cols
    print(f"  A类传感器: {len(a_cols)} 个")
    print(f"  B类指标: {len(b_cols)} 个")
    print(f"  总特征数: {len(feature_cols)}")
    assert len(feature_cols) == 63, f"特征列数量错误：{len(feature_cols)} != 63"

    df_combined['risk_state'] = df_combined['risk_state'].fillna(0).astype(int)
    df_combined['risk_score'] = df_combined['risk_score'].fillna(0.0)
    y_cls = df_combined['risk_state'].values
    y_reg = df_combined['risk_score'].values

    print("\n[4/5] 数据预处理...")
    for col in a_cols:
        df_combined[col] = df_combined[col].interpolate(method='linear').fillna(method='bfill').fillna(method='ffill')
        mean, std = df_combined[col].mean(), df_combined[col].std()
        df_combined[col] = df_combined[col].clip(mean - 3*std, mean + 3*std)

    for col in b_cols:
        mean, std = df_combined[col].mean(), df_combined[col].std()
        df_combined[col] = df_combined[col].clip(mean - 3*std, mean + 3*std)

    scaler_a = StandardScaler()
    scaler_b = StandardScaler()
    X_a = scaler_a.fit_transform(df_combined[a_cols].values)
    X_b = scaler_b.fit_transform(df_combined[b_cols].values)
    X = np.concatenate([X_a, X_b], axis=1)
    joblib.dump(scaler_a, 'scaler_a.pkl')
    joblib.dump(scaler_b, 'scaler_b.pkl')
    print("  标准化完成，保存 scaler_a.pkl 和 scaler_b.pkl")

    print("\n[5/5] 计算静态风险指数...")
    static_risk_indices = []
    for idx, row in static_mine.iterrows():
        S = compute_static_risk_index(row)
        static_risk_indices.append(S)
    static_risk_array = np.array(static_risk_indices, dtype=np.float32)
    print(f"  静态风险指数统计：均值={static_risk_array.mean():.4f}, 标准差={static_risk_array.std():.4f}")
    print(f"  静态风险指数范围: [{static_risk_array.min():.4f}, {static_risk_array.max():.4f}]")

    print("\n构建滑动窗口...")
    samples = build_sequences(X, y_cls, y_reg, seq_len=60, pred_horizon=5)
    print(f"  生成 {len(samples)} 个样本")

    print("\n构建图结构...")
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

    for i in range(len(a_cols)):
        for j in range(len(b_cols)):
            b_idx = len(a_cols) + j
            indicator_name = meta_all.loc[b_idx, '监测指标']
            if '甲烷' in indicator_name or '瓦斯' in indicator_name:
                A[i, b_idx] = 0.5
                A[b_idx, i] = 0.5

    edge_index = torch.tensor(np.where(A > 0), dtype=torch.long)
    edge_weight = torch.tensor(A[A > 0], dtype=torch.float).unsqueeze(1)
    print(f"  图结构: {edge_index.shape[1]} 条边")

    print("\n处理静态属性...")
    exclude_cols = ['样本编号', '矿井类型', '地质构造类型', '煤层自燃倾向性', 
                    '主通风系统合理性', '矿井瓦斯等级', '风险等级', '红线熔断', '事故严重程度']
    numeric_cols = [c for c in static_mine.columns if c not in exclude_cols]
    mine_static = static_mine[numeric_cols].values.astype(np.float32)
    mine_static_scaler = StandardScaler()
    mine_static = mine_static_scaler.fit_transform(mine_static)
    mine_static_tensor = torch.tensor(mine_static[0], dtype=torch.float).unsqueeze(0)
    joblib.dump(mine_static_scaler, 'scaler_static.pkl')
    print(f"  静态属性维度: {len(numeric_cols)}")

    print("\n划分数据集...")
    n = len(samples)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    X_seq_tensor = torch.tensor([s[0] for s in samples], dtype=torch.float).unsqueeze(-1)
    y_cls_tensor = torch.tensor([s[1] for s in samples], dtype=torch.long)
    y_reg_tensor = torch.tensor([s[2] for s in samples], dtype=torch.float)

    static_risk_tensor = torch.tensor(static_risk_array[:len(samples)], dtype=torch.float).unsqueeze(1)
    if len(static_risk_tensor) < len(samples):
        pad = torch.zeros(len(samples) - len(static_risk_tensor), 1)
        static_risk_tensor = torch.cat([static_risk_tensor, pad])

    train_dataset = TensorDataset(
        X_seq_tensor[:train_end], y_cls_tensor[:train_end], y_reg_tensor[:train_end],
        static_risk_tensor[:train_end]
    )
    val_dataset = TensorDataset(
        X_seq_tensor[train_end:val_end], y_cls_tensor[train_end:val_end], y_reg_tensor[train_end:val_end],
        static_risk_tensor[train_end:val_end]
    )
    test_dataset = TensorDataset(
        X_seq_tensor[val_end:], y_cls_tensor[val_end:], y_reg_tensor[val_end:],
        static_risk_tensor[val_end:]
    )

    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=8, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=8, shuffle=False)

    print(f"  训练集: {len(train_dataset)} 样本")
    print(f"  验证集: {len(val_dataset)} 样本")
    print(f"  测试集: {len(test_dataset)} 样本")

    print("\n初始化模型...")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = OutburstGNN_TFT().to(device)
    criterion = MultiTaskLoss(alpha=1.0, beta=0.5)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
    print(f"  设备: {device}")

    print("\n开始训练...")
    best_val_loss = float('inf')

    for epoch in range(1, 11):
        model.train()
        train_losses = []
        train_bce_losses = []
        train_kl_losses = []

        for xb, yb_cls, yb_reg, sb in train_loader:
            xb = xb.to(device)
            yb_cls = yb_cls.to(device)
            yb_reg = yb_reg.to(device)
            sb = sb.to(device)

            is_disaster = (yb_cls >= 2)
            target_heatmap = compute_target_heatmap(xb).to(device)

            if is_disaster.any():
                disaster_mask = is_disaster.nonzero().squeeze(1)
                if disaster_mask.dim() == 0:
                    disaster_mask = disaster_mask.unsqueeze(0)
                xb = torch.cat([xb, xb[disaster_mask].repeat(2, 1, 1, 1)], dim=0)
                yb_reg = torch.cat([yb_reg, yb_reg[disaster_mask].repeat(2)], dim=0)
                yb_cls = torch.cat([yb_cls, yb_cls[disaster_mask].repeat(2)], dim=0)
                sb = torch.cat([sb, sb[disaster_mask].repeat(2)], dim=0)
                is_disaster = (yb_cls >= 2)
                target_heatmap = torch.cat([target_heatmap, target_heatmap[disaster_mask].repeat(2)], dim=0)

            optimizer.zero_grad()
            pred_score, pred_heatmap = model(
                xb, edge_index.to(device), edge_weight.to(device),
                mine_static_tensor.to(device), sb
            )
            loss, loss_dict = criterion(pred_score, pred_heatmap, yb_reg, yb_cls,
                                       target_heatmap, is_disaster)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_losses.append(loss.item())
            train_bce_losses.append(loss_dict['bce'])
            train_kl_losses.append(loss_dict['kl'])

        model.eval()
        val_losses = []
        val_preds = []
        val_combined_preds = []
        val_true = []

        with torch.no_grad():
            for xb, yb_cls, yb_reg, sb in val_loader:
                xb = xb.to(device)
                yb_cls = yb_cls.to(device)
                yb_reg = yb_reg.to(device)
                sb = sb.to(device)

                is_disaster = (yb_cls >= 2)
                target_heatmap = compute_target_heatmap(xb).to(device)

                pred_score, pred_heatmap = model(
                    xb, edge_index.to(device), edge_weight.to(device),
                    mine_static_tensor.to(device), sb
                )
                loss, _ = criterion(pred_score, pred_heatmap, yb_reg, yb_cls,
                                   target_heatmap, is_disaster)
                val_losses.append(loss.item())
                val_preds.extend(pred_score.cpu().numpy())

                combined_risk = model.compute_combined_risk(pred_score, sb)
                val_combined_preds.extend(combined_risk.cpu().numpy())

                val_true.extend(yb_reg.cpu().numpy())

        avg_val_loss = np.mean(val_losses)
        scheduler.step(avg_val_loss)

        if epoch % 5 == 0:
            mae_dynamic = mean_absolute_error(val_true, val_preds)
            mae_combined = mean_absolute_error(val_true, val_combined_preds)
            rmse_dynamic = np.sqrt(mean_squared_error(val_true, val_preds))
            rmse_combined = np.sqrt(mean_squared_error(val_true, val_combined_preds))
            print(f"Epoch {epoch:03d} | Train: {np.mean(train_losses):.4f} | Val: {avg_val_loss:.4f}")
            print(f"  MAE(dynamic): {mae_dynamic:.4f} | MAE(combined): {mae_combined:.4f}")
            print(f"  RMSE(dynamic): {rmse_dynamic:.4f} | RMSE(combined): {rmse_combined:.4f}")
            print(f"  BCE: {np.mean(train_bce_losses):.4f} | KL: {np.mean(train_kl_losses):.4f}")
        else:
            print(f"Epoch {epoch:03d} | Train: {np.mean(train_losses):.4f} | Val: {avg_val_loss:.4f}")

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), 'best_63node.pt')
            print(f"  保存最佳模型: best_63node.pt")

    print("\n" + "=" * 70)
    print("训练完成！")
    print("=" * 70)

    print("\n在测试集上评估...")
    model.load_state_dict(torch.load('best_63node.pt'))
    model.eval()

    test_preds = []
    test_combined_preds = []
    test_true = []
    test_heatmaps = []

    with torch.no_grad():
        for xb, yb_cls, yb_reg, sb in test_loader:
            xb = xb.to(device)
            yb_reg = yb_reg.to(device)
            sb = sb.to(device)

            pred_score, pred_heatmap = model(
                xb, edge_index.to(device), edge_weight.to(device),
                mine_static_tensor.to(device), sb
            )
            test_preds.extend(pred_score.cpu().numpy())
            combined_risk = model.compute_combined_risk(pred_score, sb)
            test_combined_preds.extend(combined_risk.cpu().numpy())
            test_true.extend(yb_reg.cpu().numpy())
            test_heatmaps.extend(pred_heatmap.cpu().numpy())

    mae_dynamic = mean_absolute_error(test_true, test_preds)
    mae_combined = mean_absolute_error(test_true, test_combined_preds)
    rmse_dynamic = np.sqrt(mean_squared_error(test_true, test_preds))
    rmse_combined = np.sqrt(mean_squared_error(test_true, test_combined_preds))

    print(f"\n测试集评估结果:")
    print(f"  MAE(dynamic): {mae_dynamic:.4f}")
    print(f"  MAE(combined): {mae_combined:.4f}")
    print(f"  RMSE(dynamic): {rmse_dynamic:.4f}")
    print(f"  RMSE(combined): {rmse_combined:.4f}")

    y_true_cls = np.array([0 if s < 0.3 else 1 if s < 0.5 else 2 if s < 0.7 else 3 for s in test_true])
    y_pred_cls = np.array([0 if s < 0.3 else 1 if s < 0.5 else 2 if s < 0.7 else 3 for s in test_combined_preds])
    accuracy = (y_true_cls == y_pred_cls).mean()
    print(f"  风险等级准确率: {accuracy:.4f}")

    disaster_mask = np.array(test_true) >= 0.5
    if disaster_mask.any():
        disaster_recall = (y_pred_cls[disaster_mask] >= 2).mean()
        print(f"  灾害样本召回率: {disaster_recall:.4f}")

    np.save('test_heatmaps.npy', np.array(test_heatmaps))
    np.save('test_predictions.npy', np.array(test_combined_preds))
    np.save('test_true.npy', np.array(test_true))
    print("\n保存测试结果: test_heatmaps.npy, test_predictions.npy, test_true.npy")

if __name__ == '__main__':
    main()