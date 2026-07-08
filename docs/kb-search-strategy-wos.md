# Web of Science / Scopus 检索策略

## 检索目标

英文文献用于国际研究综述、机理解释、工程应用、传感技术和模型方法，不作为中国煤矿法规标准替代依据。

## 核心检索式

```text
TS=("coal and gas outburst" OR "coal-gas outburst") AND TS=("early warning" OR prediction OR forecasting)
TS=("coal and gas outburst") AND TS=("gas pressure" OR "gas content" OR "desorption index" OR K1)
TS=("coal mine safety") AND TS=("gas outburst" OR "gas explosion" OR "methane overrun")
TS=("coal mine") AND TS=(microseismic OR "acoustic emission" OR "electromagnetic radiation")
TS=("coal mine safety") AND TS=("digital twin" OR "knowledge graph" OR "large language model" OR RAG)
TS=("coal mine") AND TS=("time series anomaly detection" OR "explainable AI" OR "deep learning")
```

## 筛选规则

近 10 年优先，高被引、Review、Engineering application 优先。有真实数据、现场实验、工程应用、公开指标定义的优先。仅有概念性框架、缺少验证数据、缺少适用边界的资料降级。与中国法规、标准冲突时，以 L1/L2 为准。

## 下载上限

每个英文主题首轮下载不超过 10 篇高质量全文。不得无差别批量镜像 Web of Science、Scopus 或出版商数据库。扩展下载必须说明业务模块、缺口和预期用途。

## 可映射业务模块

`monitoring_warning`、`source_tracing`、`dual_prevention`、`digital_twin`、`data_model`、`knowledge_intelligence`、`report_generation`。
