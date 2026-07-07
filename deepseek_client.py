import os, json, logging
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
logger = logging.getLogger(__name__)
client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY",""), base_url="https://api.deepseek.com")
MODEL = os.getenv("DEEPSEEK_MODEL","deepseek-chat")
def chat(messages,temperature=0.7,max_tokens=2048):
 try:
  r = client.chat.completions.create(model=MODEL,messages=messages,temperature=temperature,max_tokens=max_tokens)
  return r.choices[0].message.content
 except Exception as e:
  logger.error(f"DeepSeek API调用失败: {e}")
  return None
def nl_query(query:str) -> dict:
  prompt = f"""你是一个煤矿瓦斯安全知识库的智能查询助手。用户提问: {query}
请分析意图并返回JSON（不要markdown包裹）：
{{"intent":"意图类型","answer":"中文回答","indicators":[],"measures":[],"standards":[],"cases":[],"message":""}}
意图类型可以是: query_indicator/query_risk/query_measure/query_standard/query_case/count/unknown"""
  resp = chat([{"role":"system","content":"你是煤矿安全专家"},{"role":"user","content":prompt}],temperature=0.3,max_tokens=1024)
  if not resp: return {"intent":"unknown","answer":"服务暂不可用，请稍后重试。","results":[]}
  import re; m=re.search(r"\{.*\}",resp,re.DOTALL)
  if m:
   try: return json.loads(m.group())
   except: pass
  return {"intent":"unknown","answer":resp,"results":[]}
def ai_answer(question:str,top_k:int=8,context:str="") -> dict:
  sys_prompt = "你是一个煤矿瓦斯突出预警系统的AI助手。请基于知识库内容回答安全问题。"
  if context: sys_prompt += f"\\n参考知识库上下文:\\n{context}"
  prompt = f"""用户问题: {question}
请以中文回复，包含：
1. 直接回答
2. 相关指标和阈值
3. 管控措施建议
4. 法规依据（如果有）
5. 风险等级判断
如果问题不涉及安全知识，请礼貌提示。"""
  resp = chat([{"role":"system","content":sys_prompt},{"role":"user","content":prompt}],temperature=0.5,max_tokens=2048)
  if not resp: resp="抱歉，AI服务暂时不可用。"
  return {"question":question,"mode":"deepseek","answer":resp,"citations":[],"evidence_count":0}
def generate_report(static_risk:float,dynamic_risk:float,combined_risk:float,risk_level:str) -> str:
  prompt = f"""你是煤矿安全工程师，请基于以下数据生成中文预警报告：
静态风险指数: {static_risk:.2f}
动态预警概率: {dynamic_risk:.2f}
综合风险值: {combined_risk:.2f}
风险等级: {risk_level}
请包含：1.整体评估 2.主要风险因素 3.管控建议 4.处置优先级"""
  return chat([{"role":"system","content":"你是煤矿安全专家"},{"role":"user","content":prompt}],temperature=0.4,max_tokens=1024) or "报告生成失败"
