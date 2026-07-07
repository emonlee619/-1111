# 63 节点 GNN-TFT 瓦斯突出动态预警模型训练策略

> 适用：TRAE CN 代码生成与执行  
> 数据现状：63 指标 × 10127 分钟级样本，含 risk_state（0~3）与 risk_score（连续）真实标签。
> 数据构成：A01~A22（22个真实传感器.db文件）+ B01~B41（41个物理约束生成指标，CSV列）

---

## 一、数据预处理

### 1.1 数据构成与映射

**数据源说明**：

| 数据文件 | 内容 | 格式 |
|---------|------|------|
| `动态数据（真实传感器）/*.db` | 22个A编号传感器的时序监测数据 | SQLite（db202502/db202503表） |
| `动态数据（物理约束生成）.csv` | 41个B编号物理约束生成指标 + 风险标签 | CSV（10127行 × 44列：timestamp, risk_state, risk_score, B01~B41） |
| `动态空间数据指标总览.xlsx` | 63个指标的元数据（监测指标、空间位置、传感器编号） | Excel（63行） |
| `虚拟矿井32项静态数据_50条.csv` | 矿井静态属性（瓦斯压力、煤层厚度等） | CSV（50行 × 40列） |

**节点编号映射**（与Excel 63行严格对齐）：

| 节点范围 | 数据源 | 类型 | 对应传感器编号 |
|---------|--------|------|--------------|
| 0~21（索引） | `动态数据（真实传感器）/*.db` | 真实传感器（A编号） | 34A01, 35A09, 35A10, 35A11, 35A12, 38A01, 38A02, 38A03, 38A04, 38A09, 39A01, 39A02, 39A03, 39A04, 39A05, 39A07, 39A13, 39A14, 39A15, 39A16, 40A05, 40D14 |
| 22~62（索引） | `动态数据（物理约束生成）.csv` | 物理约束生成（B编号） | B01~B41 |

**标签定义**（四分类风险等级）：

| risk_state | 风险等级 | risk_score范围 | 含义 |
|------------|---------|---------------|------|
| 0 | 低风险 | [0, 0.3) | 正常生产状态 |
| 1 | 一般风险 | [0.3, 0.5) | 轻微异常，需关注 |
| 2 | 较大风险 | [0.5, 0.7) | 明显异常，需预警 |
| 3 | 重大风险 | [0.7, 1] | 严重异常，需紧急处置 |

### 1.2 数据加载与对齐

```python
import pandas as pd
import numpy as np
import sqlite3
import os

sensor_dir = '动态数据（真实传感器）'
gen_data_path = '动态数据（物理约束生成）.csv'
meta_path = '动态空间数据指标总览.xlsx'
static_path = '虚拟矿井32项静态数据_50条.csv'

df_gen = pd.read_csv(gen_data_path)
df_gen['timestamp'] = pd.to_datetime(df_gen['timestamp'])
df_gen = df_gen.sort_values('timestamp').reset_index(drop=True)

a_sensor_files = sorted([f for f in os.listdir(sensor_dir) if f.endswith('.db')])
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

meta_all = pd.read_excel(meta_path)

static_mine = pd.read_csv(static_path)

a_cols = [f.replace('.db', '') for f in a_sensor_files]
b_cols = [c for c in df_gen.columns if c.startswith('B')]
feature_cols = a_cols + b_cols
assert len(feature_cols) == 63, f"特征列数量错误：{len(feature_cols)} != 63"

y_cls = df_combined['risk_state'].astype(int).values
y_reg = df_combined['risk_score'].values
```

### 1.3 异构数据缺失值处理

```python
for col in a_cols:
    df_combined[col] = df_combined[col].interpolate(method='linear').fillna(method='bfill').fillna(method='ffill')
    mean, std = df_combined[col].mean(), df_combined[col].std()
    df_combined[col] = df_combined[col].clip(mean - 3*std, mean + 3*std)

for col in b_cols:
    mean, std = df_combined[col].mean(), df_combined[col].std()
    df_combined[col] = df_combined[col].clip(mean - 3*std, mean + 3*std)
```

### 1.4 标准化

```python
from sklearn.preprocessing import StandardScaler

scaler_a = StandardScaler()
scaler_b = StandardScaler()

X_a = scaler_a.fit_transform(df_combined[a_cols].values)
X_b = scaler_b.fit_transform(df_combined[b_cols].values)

X = np.concatenate([X_a, X_b], axis=1)

import joblib
joblib.dump(scaler_a, 'scaler_a.pkl')
joblib.dump(scaler_b, 'scaler_b.pkl')
```

### 1.5 滑动窗口构建

```python
def build_sequences(X, y_cls, y_reg, seq_len=60, pred_horizon=5):
    samples = []
    T = len(X)
    for i in range(T - seq_len - pred_horizon + 1):
        x_seq = X[i : i + seq_len]
        y_c = y_cls[i + seq_len + pred_horizon - 1]
        y_r = y_reg[i + seq_len + pred_horizon - 1]
        samples.append((x_seq, y_c, y_r))
    return samples

samples = build_sequences(X, y_cls, y_reg, seq_len=60, pred_horizon=5)
```

### 1.6 时序划分

```python
n = len(samples)
train_end = int(n * 0.70)
val_end   = int(n * 0.85)

train_samples = samples[:train_end]
val_samples   = samples[train_end:val_end]
test_samples  = samples[val_end:]
```

### 1.7 静态风险指数计算（模糊数学评价）

```python
from 模糊数学评价 import fuzzy_comprehensive_evaluation

def compute_static_risk_index(static_mine_row):
    """
    使用模糊数学评价计算静态本底风险指数
    
    参数：
        static_mine_row: 单行静态数据（Pandas Series）
    
    返回：
        S: 静态风险指数，范围 [0, 1]，值越大风险越高
    """
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
        "综合防治措施": {
            "通风系统合理性": 10, "测风制度执行": 15, "通风设施质量": 15,
            "局部通风机管理": 10, "巷道维修": 10, "闲散巷道管理": 10,
            "瓦斯检查制度": 10, "安全监控系统": 20
        },
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
    
    result = fuzzy_comprehensive_evaluation(fuzzy_input)
    
    comprehensive_score = result['综合评分']
    S = 1 - (comprehensive_score / 100)
    
    return S

static_risk_indices = []
for idx, row in static_mine.iterrows():
    S = compute_static_risk_index(row)
    static_risk_indices.append(S)

static_risk_array = np.array(static_risk_indices, dtype=np.float32)

S_mean = static_risk_array.mean()
S_std = static_risk_array.std()
print(f"静态风险指数统计：均值={S_mean:.4f}, 标准差={S_std:.4f}, 范围=[{static_risk_array.min():.4f}, {static_risk_array.max():.4f}]")
```

---

## 二、63 节点图结构构建

### 2.1 节点定义

```python
N_DYNAMIC = 63
N_STATIC  = 32
N_STATIC_RISK = 1  
```

### 2.2 空间邻接矩阵构建（基于物理距离阈值法）

```python
import torch
from torch_geometric.data import Data

meta_all = meta_all.reset_index(drop=True)

A = np.zeros((N_DYNAMIC, N_DYNAMIC), dtype=np.float32)

# 规则 1：同位置不同指标 → 全连接
for pos in meta_all['空间位置'].unique():
    idxs = meta_all[meta_all['空间位置'] == pos].index.tolist()
    for i in idxs:
        for j in idxs:
            if i != j:
                A[i, j] = 1.0

# 规则 2：同一通风分支/同一采掘工作面 → 全连接
mine_locations = ['采面', '回风', '进风', '切眼', '上隅角', '工作面', '埋管']
for loc_keyword in mine_locations:
    idxs = meta_all[meta_all['空间位置'].str.contains(loc_keyword)].index.tolist()
    for i in idxs:
        for j in idxs:
            if i != j:
                A[i, j] = 1.0

# 规则 3：同指标不同位置 → 全连接
for ind in meta_all['监测指标'].unique():
    idxs = meta_all[meta_all['监测指标'] == ind].index.tolist()
    for i in idxs:
        for j in idxs:
            if i != j:
                A[i, j] = 1.0

# 规则 4：物理耦合关系（先验）
coupling_pairs = [
    ('甲烷', '一氧化碳'),
    ('甲烷', '煤层瓦斯压力'),
    ('微震事件频次', '微震事件能量'),
    ('微震 b 值', '微震事件能量'),
    ('电磁辐射强度', '声发射事件率'),
    ('管道瓦斯', '管道流量'),
    ('管道压力', '管道流量'),
]
for ind_a, ind_b in coupling_pairs:
    idxs_a = meta_all[meta_all['监测指标'].str.contains(ind_a)].index.tolist()
    idxs_b = meta_all[meta_all['监测指标'].str.contains(ind_b)].index.tolist()
    for ia in idxs_a:
        for ib in idxs_b:
            A[ia, ib] = 1.0
            A[ib, ia] = 1.0

# 规则 5：A类传感器与B类指标的耦合关系（基于物理意义）
for i in range(len(a_cols)):
    sensor_name = a_cols[i]
    for j in range(len(b_cols)):
        b_idx = len(a_cols) + j
        indicator_name = meta_all.loc[b_idx, '监测指标']
        if '甲烷' in indicator_name or '瓦斯' in indicator_name:
            A[i, b_idx] = 0.5
            A[b_idx, i] = 0.5

edge_index = torch.tensor(np.where(A > 0), dtype=torch.long)
edge_weight = torch.tensor(A[A > 0], dtype=torch.float).unsqueeze(1)
```

### 2.3 节点静态特征

```python
from sklearn.preprocessing import LabelEncoder

le_ind = LabelEncoder().fit(meta_all['监测指标'])
le_pos = LabelEncoder().fit(meta_all['空间位置'])

static_node_feat = np.zeros((N_DYNAMIC, 2))
static_node_feat[:, 0] = le_ind.transform(meta_all['监测指标'])
static_node_feat[:, 1] = le_pos.transform(meta_all['空间位置'])
static_node_feat = torch.tensor(static_node_feat, dtype=torch.long)

exclude_cols = ['样本编号', '矿井类型', '地质构造类型', '煤层自燃倾向性', 
                '主通风系统合理性', '矿井瓦斯等级', '风险等级', '红线熔断', '事故严重程度']
numeric_cols = [c for c in static_mine.columns if c not in exclude_cols]
mine_static = static_mine[numeric_cols].values.astype(np.float32)
mine_static_scaler = StandardScaler()
mine_static = mine_static_scaler.fit_transform(mine_static)
mine_static_tensor = torch.tensor(mine_static[0], dtype=torch.float).unsqueeze(0)
joblib.dump(mine_static_scaler, 'scaler_static.pkl')
```

---

## 三、GNN-TFT 模型架构（63 节点适配版）

### 3.1 整体架构

```
输入: [batch, seq_len=60, N_dynamic=63, F_feature=1]
       ↓
TCN 局部波形特征提取（共享权重，Depthwise Conv + 逐点卷积）
       ↓
[batch, seq_len, 63, tcn_dim]
       ↓
GAT 空间信息融合（基于邻接矩阵）
       ↓
[batch, seq_len, 63, gat_dim]
       ↓
LSTM 时序长期依赖捕获
       ↓
[batch, seq_len, 63, lstm_dim]
       ↓
自适应平均池化 → 全局特征向量 [batch, lstm_dim]
       ↓
与静态属性向量拼接 [batch, lstm_dim + static_dim]
       ↓
与静态风险指数拼接 [batch, lstm_dim + static_dim + 1]
       ↓
TFT 变量选择网络
       ↓
双输出头
  ├── Head A: 动态预警概率（2层MLP + Sigmoid）→ [0,1]连续值
  └── Head B: 传感器-位置注意力热力图（VSN权重均值）→ [63]权重向量
       ↓
综合风险概率 = α × S + (1-α) × 动态预警概率  (α=0.25)
```

### 3.2 共享权重 TCN 层（深度可分离卷积）

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class SharedTCN(nn.Module):
    def __init__(self, in_dim=1, hidden_dim=16, kernel_size=3, num_layers=3):
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
        """x: [B, 63, T]"""
        B, N, T = x.shape
        x = x.reshape(B * N, 1, T)
        x = self.tcn(x)
        x = x.reshape(B, N, -1)
        
        out = []
        for i in range(N):
            out.append(self.layer_norms[i](x[:, i, :]))
        x = torch.stack(out, dim=1)
        
        return x
```

### 3.3 GAT 空间编码层

```python
from torch_geometric.nn import GATConv

class SpatialEncoder(nn.Module):
    def __init__(self, in_dim, hidden_dim, out_dim, heads=4):
        super().__init__()
        self.gat1 = GATConv(in_dim, hidden_dim, heads=heads, concat=True, dropout=0.2)
        self.gat2 = GATConv(hidden_dim * heads, out_dim, heads=1, concat=False, dropout=0.2)
        self.norm = nn.LayerNorm(out_dim)

    def forward(self, x, edge_index, edge_weight):
        x = F.elu(self.gat1(x, edge_index, edge_attr=edge_weight))
        x = self.gat2(x, edge_index, edge_attr=edge_weight)
        return self.norm(x)
```

### 3.4 LSTM 时序编码层

```python
class TemporalEncoder(nn.Module):
    def __init__(self, in_dim, hidden_dim, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(in_dim, hidden_dim, num_layers,
                           batch_first=True, dropout=0.2)

    def forward(self, x):
        """x: [B, T, 63, in_dim]"""
        B, T, N, D = x.shape
        x = x.permute(0, 2, 1, 3).reshape(B*N, T, D)
        x, _ = self.lstm(x)
        x = x.reshape(B, N, T, -1).permute(0, 2, 1, 3)
        return x
```

### 3.5 TFT 变量选择网络

```python
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
        """x: [B, T, 63, input_dim]"""
        B, T, N, D = x.shape
        x_flat = x.reshape(B*T*N, D)
        attn_logits = self.attention(x_flat)
        attn_logits = attn_logits.reshape(B, T, N)
        
        alpha = F.softmax(attn_logits.mean(dim=1), dim=1)
        
        x_weighted = x * attn_logits.unsqueeze(-1)
        x_global = x_weighted.mean(dim=2)
        
        return x_global, alpha
```

### 3.6 输出头

```python
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
```

### 3.7 完整模型（融合静态风险指数）

```python
class OutburstGNN_TFT(nn.Module):
    def __init__(self):
        super().__init__()
        self.tcn = SharedTCN(in_dim=1, hidden_dim=16, kernel_size=3, num_layers=3)
        self.gat = SpatialEncoder(in_dim=16, hidden_dim=32, out_dim=32, heads=4)
        self.lstm = TemporalEncoder(in_dim=32, hidden_dim=64, num_layers=2)
        self.vsn = VariableSelectionNetwork(input_dim=64, hidden_dim=64, num_features=N_DYNAMIC)
        self.decoder = OutputHeads(hidden_dim=64 + N_STATIC + N_STATIC_RISK)

    def forward(self, x_seq, edge_index, edge_weight, mine_static, static_risk):
        """
        x_seq: [B, T, 63, 1]
        mine_static: [B, 32]
        static_risk: [B, 1] 静态风险指数 S
        """
        B, T, N, F = x_seq.shape
        
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
        
        _, heatmap = self.vsn(lstm_out)
        
        dynamic_score = self.decoder(x_global)
        
        return dynamic_score, heatmap

    def compute_combined_risk(self, dynamic_score, static_risk, alpha=0.25):
        """
        计算综合风险概率
        
        公式：综合风险概率 = α × S + (1-α) × 动态预警概率
        
        参数：
            dynamic_score: [B] 动态预警概率
            static_risk: [B, 1] 静态风险指数 S
            alpha: 静态风险权重（默认0.25）
        
        返回：
            combined_risk: [B] 综合风险概率
        """
        S = static_risk.squeeze(1)
        combined_risk = alpha * S + (1 - alpha) * dynamic_score
        return combined_risk
```

---

## 四、联合损失函数

```python
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
```

**目标注意力生成**：

```python
def compute_target_heatmap(x_seq, disaster_source_pos=None):
    """
    x_seq: [B, T, 63, F]
    """
    B, T, N, F = x_seq.shape
    
    if disaster_source_pos is not None:
        source_idx = meta_all[meta_all['空间位置'].str.contains(disaster_source_pos)].index.tolist()
        if source_idx:
            source_idx = source_idx[0]
            dist = np.zeros(N)
            visited = {source_idx}
            queue = [(source_idx, 0)]
            while queue:
                idx, d = queue.pop(0)
                neighbors = np.where(A[idx] > 0)[0]
                for n in neighbors:
                    if n not in visited:
                        visited.add(n)
                        dist[n] = d + 1
                        queue.append((n, d + 1))
            tau = 10.0
            target = F.softmax(torch.tensor(-dist / tau, dtype=torch.float), dim=0)
            return target.unsqueeze(0).expand(B, -1)
    else:
        deviation = x_seq[:, -1, :, :].norm(dim=2)
        return F.softmax(deviation * 2, dim=1)
```

---

## 五、训练流程（融合静态风险指数）

```python
def train():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = OutburstGNN_TFT().to(device)
    criterion = MultiTaskLoss(alpha=1.0, beta=0.5)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    best_val_loss = float('inf')
    
    static_risk_tensor = torch.tensor(static_risk_array[:len(samples)], dtype=torch.float).unsqueeze(1)

    for epoch in range(1, 101):
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
        val_true = []
        val_combined_preds = []
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

        if epoch % 10 == 0:
            from sklearn.metrics import mean_absolute_error
            mae_dynamic = mean_absolute_error(val_true, val_preds)
            mae_combined = mean_absolute_error(val_true, val_combined_preds)
            print(f"Epoch {epoch:03d} | Train: {np.mean(train_losses):.4f} | Val: {avg_val_loss:.4f}")
            print(f"  MAE(dynamic): {mae_dynamic:.4f} | MAE(combined): {mae_combined:.4f}")
            print(f"  BCE: {np.mean(train_bce_losses):.4f} | KL: {np.mean(train_kl_losses):.4f}")

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), 'best_63node.pt')
```

**DataLoader构建说明**：

```python
from torch.utils.data import DataLoader, TensorDataset

X_seq_tensor = torch.tensor([s[0] for s in samples], dtype=torch.float).unsqueeze(-1)
y_cls_tensor = torch.tensor([s[1] for s in samples], dtype=torch.long)
y_reg_tensor = torch.tensor([s[2] for s in samples], dtype=torch.float)
static_risk_tensor = torch.tensor(static_risk_array[:len(samples)], dtype=torch.float).unsqueeze(1)

train_dataset = TensorDataset(
    X_seq_tensor[:train_end], 
    y_cls_tensor[:train_end], 
    y_reg_tensor[:train_end],
    static_risk_tensor[:train_end]
)
val_dataset = TensorDataset(
    X_seq_tensor[train_end:val_end], 
    y_cls_tensor[train_end:val_end], 
    y_reg_tensor[train_end:val_end],
    static_risk_tensor[train_end:val_end]
)
test_dataset = TensorDataset(
    X_seq_tensor[val_end:], 
    y_cls_tensor[val_end:], 
    y_reg_tensor[val_end:],
    static_risk_tensor[val_end:]
)

train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
```

---

## 六、评估指标

| 指标 | 计算方式 | 目标 |
|---|---|---|
| 回归 MAE | \|pred_score - risk_score\| | < 0.05 |
| 回归 RMSE | 同上平方平均 | < 0.08 |
| 风险等级准确率 | 四分类准确率（按概率阈值划分） | > 85% |
| 空间定位 Top-3 命中率 | 真实高异常节点是否在 heatmap Top-3 | > 75% |
| AUC (二分类: 正常 vs 异常) | risk_state ≥ 1 为正类 | > 0.90 |
| 灾害样本召回率 | 灾害样本（risk_state ≥ 2）被正确识别的比例 | > 90% |

**风险等级划分规则**：
- 低风险：[0, 0.3)
- 一般风险：[0.3, 0.5)
- 较大风险：[0.5, 0.7)
- 重大风险：[0.7, 1]

---

## 七、关键改进点（对比原30节点版）

| 维度 | 30 节点版 | 63 节点版 |
|---|---|---|
| 标签 | 弱标签（合成） | **真实标签 risk_state + risk_score** |
| 节点数 | 30（18 实测 + 4 微震 + 8 静态） | **63（22真实传感器 + 41生成指标）** |
| 采样间隔 | 30 分钟 | **1 分钟** |
| 序列长度 | 24 步（12h） | **60 步（1h）** |
| 编码器 | 单一 GNN | **TCN → GAT → LSTM 级联** |
| TCN | 无 | **深度可分离卷积，共享权重** |
| 静态属性 | 8个类别编码 | **32项矿井静态属性** |
| 损失 | BCE + KL | **BCE + KL（灾害样本增强）** |
| 解码头 | 2 头（概率 + 注意力） | **2 头（概率 + 63维热力图）** |
| 邻接矩阵 | 基于指标/位置规则 | **基于物理距离阈值法** |

---

## 八、部署推理（融合静态风险指数）

```python
def infer(model, x_seq, edge_index, edge_weight, mine_static, static_risk, alpha=0.25):
    """
    单条推理
    
    参数：
        x_seq: [1, 60, 63, 1] 时序输入
        mine_static: [1, 32] 矿井静态属性
        static_risk: [1, 1] 静态风险指数 S
        alpha: 静态风险权重（默认0.25）
    
    返回：
        推理结果字典
    """
    model.eval()
    with torch.no_grad():
        dynamic_score, heatmap = model(x_seq, edge_index, edge_weight, mine_static, static_risk)
        
        combined_risk = model.compute_combined_risk(dynamic_score, static_risk, alpha)
        
        def get_risk_level(score):
            if score < 0.3:
                return '低风险'
            elif score < 0.5:
                return '一般风险'
            elif score < 0.7:
                return '较大风险'
            else:
                return '重大风险'
        
        top3_idx = torch.topk(heatmap[0], 3).indices.cpu().numpy()
        top3_sensors = meta_all.iloc[top3_idx]['传感器编号'].tolist()
        top3_positions = meta_all.iloc[top3_idx]['空间位置'].tolist()
        top3_weights = heatmap[0][top3_idx].cpu().numpy()
        
        return {
            'dynamic_risk_score': dynamic_score.item(),
            'static_risk_index': static_risk.item(),
            'combined_risk_score': combined_risk.item(),
            'dynamic_risk_level': get_risk_level(dynamic_score.item()),
            'combined_risk_level': get_risk_level(combined_risk.item()),
            'alpha_weight': alpha,
            'heatmap': heatmap[0].cpu().numpy(),
            'top3_hazard_sources': [
                {'sensor': s, 'position': p, 'weight': w} 
                for s, p, w in zip(top3_sensors, top3_positions, top3_weights)
            ]
        }
```

**在线更新**：每周用新数据微调最后 2 层（学习率 1e-5），GNN/TCN 层冻结防止拓扑过拟合。

**双模型架构说明**：

| 子模型 | 输入 | 输出 | 作用 |
|--------|------|------|------|
| 静态风险模型（模糊数学） | 32项矿井静态属性 | 静态风险指数 S ∈ [0,1] | 提供风险基线，反映矿井固有危险性 |
| 动态预警模型（GNN-TFT） | 63个传感器时序数据 + 静态属性 + S | 动态预警概率 P_dynamic ∈ [0,1] | 捕捉实时异常变化 |

**综合风险概率计算公式**：

```
综合风险概率 = α × S + (1-α) × P_dynamic

其中 α = 0.25（静态风险权重）
```

**α=0.25 的设计理由**：
- 静态风险 S 作为基线偏移，不淹没动态异常信号
- 动态预警概率占主导（75%权重），确保能快速响应实时变化
- 即使动态信号为0，高静态风险矿井仍有最低风险阈值（α×S）
- 对于低静态风险矿井，需要更大的动态异常才能触发预警

---

## 九、数据流向总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    静态风险子模型（模糊数学评价）                          │
│                                                                         │
│  [虚拟矿井32项静态数据_50条.csv] → 模糊综合评价 → 静态风险指数 S ∈ [0,1]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ↓ S（融入模型特征）
┌─────────────────────────────────────────────────────────────────────────┐
│                    动态预警子模型（GNN-TFT）                              │
│                                                                         │
│  [动态数据（真实传感器）/*.db] → 读取 → 时间对齐 → 标准化(scaler_a)        │
│        ↓                                                                │
│  [动态数据（物理约束生成）.csv] → 读取 → 标准化(scaler_b)                 │
│        ↓                                                                │
│  X = [X_a, X_b] → 滑动窗口[10063, 60, 63] → 时序划分(70%/15%/15%)       │
│        ↓                                                                │
│  [动态空间数据指标总览.xlsx] → 构建邻接矩阵A[63×63] → GAT边信息           │
│        ↓                                                                │
│  模型输入: [B, 60, 63, 1] + mine_static[B, 32] + static_risk[B, 1]      │
│        ↓                                                                │
│  TCN → GAT → LSTM → 自适应平均池化 → 拼接静态属性 → 拼接S → VSN           │
│        ↓                                                                │
│  输出: [动态预警概率 P_dynamic, 63维热力图]                              │
│        ↓                                                                │
│  综合风险概率 = α × S + (1-α) × P_dynamic  (α=0.25)                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 十、关键修正说明

### 10.1 数据加载修正
- 物理约束生成数据实际为44列（timestamp + risk_state + risk_score + B01~B41）
- 真实传感器.db文件包含db202502和db202503两个表，需合并加载
- A类传感器数据采用线性插值+最近邻重采样对齐到生成数据时间戳

### 10.2 TCN层修正
- 原实现输入维度不匹配：`x.reshape(B * N, 1, T)` 确保深度可分离卷积正确应用
- 共享权重设计：所有63个节点共享同一TCN参数，减少过拟合风险

### 10.3 模型数据流修正
- 静态属性通过`expand(B, -1)`正确扩展到batch维度
- VSN输出的全局特征与静态属性拼接后传入输出头

### 10.4 损失函数修正
- KL散度仅在灾害样本上计算，避免非灾害样本干扰
- 修复disaster_mask的维度处理，支持单样本情况

### 10.5 邻接矩阵修正
- 增加A类传感器与B类指标的耦合关系（0.5权重）
- 边权重从二值改为连续值，支持soft attention

### 10.6 静态风险指数融合（新增）
- 使用模糊数学评价对32项静态指标进行综合评判，得到静态本底风险指数 S ∈ [0,1]
- S 作为额外特征输入到模型，在全局特征拼接阶段加入
- 新增 `compute_combined_risk()` 方法，实现综合风险概率计算：`α × S + (1-α) × P_dynamic`
- α=0.25 确保静态风险仅作为基线偏移，不淹没动态异常信号
- DataLoader 新增 static_risk 字段，训练时同步传入