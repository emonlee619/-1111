def double_prevention_routes(app, get_db_connection, json, logger):
    @app.get("/api/double-prevention/overview")
    def dp_overview():
        conn = get_db_connection()
        c = conn.cursor()
        counts = {}
        for t in ["warning_results","dynamic_sensor_data","meta_info","static_mine_data"]:
            try:
                c.execute("SELECT COUNT(*) FROM " + t)
                counts[t] = c.fetchone()[0]
            except: counts[t] = 0
        conn.close()
        return {"success":True, "data":{
            "riskControlCount":counts.get("static_mine_data",0),
            "riskMapCount":counts.get("dynamic_sensor_data",0),
            "riskCardCount":counts.get("warning_results",0),
            "measureCount":counts.get("meta_info",0),
            "hazardCount":counts.get("warning_results",0),
            "overdueCount":0,"reviewCount":0,
            "sourceTypes":["warning_results","dynamic_sensor_data","meta_info","static_mine_data"],
            "boundary":"real_data"}}
    @app.get("/api/double-prevention/risk-cards")
    def dp_risk_cards():
        conn = get_db_connection(); c = conn.cursor()
        try:
            c.execute("SELECT id, timestamp, combined_risk, risk_level, heatmap_data, sensor_contribution FROM warning_results ORDER BY timestamp DESC LIMIT 50")
            rows = [dict(r) for r in c.fetchall()]
            for row in rows:
                for f in ["heatmap_data","sensor_contribution"]:
                    v = row.get(f)
                    if v and isinstance(v,str):
                        try: row[f] = json.loads(v)
                        except: pass
        except Exception as e:
            conn.close(); return {"success":False,"message":str(e),"data":[]}
        conn.close(); return {"success":True,"data":rows}
    @app.get("/api/double-prevention/risk-cards/{card_id}")
    def dp_risk_card(card_id:str):
        conn = get_db_connection(); c = conn.cursor()
        try:
            c.execute("SELECT * FROM warning_results WHERE id = ?",(card_id,))
            row = c.fetchone()
        except: conn.close(); return {"success":False,"message":"查询失败"}
        conn.close()
        if row:
            d = dict(row)
            for f in ["heatmap_data","sensor_contribution"]:
                v = d.get(f)
                if v and isinstance(v,str):
                    try: d[f] = json.loads(v)
                    except: pass
            return {"success":True,"data":d}
        return {"success":False,"message":"未找到该风险卡"}
    @app.get("/api/double-prevention/risk-map")
    def dp_risk_map():
        conn = get_db_connection(); c = conn.cursor()
        try:
            c.execute("SELECT sensor_id, sensor_type, spatial_position, indicator_name, risk_level FROM meta_info LIMIT 200")
            rows = [dict(r) for r in c.fetchall()]
        except:
            try:
                c.execute("SELECT DISTINCT sensor_id, sensor_type FROM dynamic_sensor_data LIMIT 200")
                rows = [dict(r) for r in c.fetchall()]
            except: rows = []
        conn.close(); return {"success":True,"data":rows}
    @app.get("/api/double-prevention/hazard-ledger")
    def dp_hazard_ledger():
        conn = get_db_connection(); c = conn.cursor()
        try:
            c.execute("SELECT id, timestamp, combined_risk, risk_level, heatmap_data, sensor_contribution FROM warning_results WHERE combined_risk >= 0.5 ORDER BY combined_risk DESC LIMIT 100")
            rows = [dict(r) for r in c.fetchall()]
            for row in rows:
                for f in ["heatmap_data","sensor_contribution"]:
                    v = row.get(f)
                    if v and isinstance(v,str):
                        try: row[f] = json.loads(v)
                        except: pass
        except: rows = []
        conn.close(); return {"success":True,"data":rows}
    @app.get("/api/double-prevention/risk-controls")
    def dp_risk_controls():
        conn = get_db_connection(); c = conn.cursor()
        try:
            c.execute("SELECT * FROM static_mine_data LIMIT 50")
            rows = [dict(r) for r in c.fetchall()]
        except: rows = []
        conn.close(); return {"success":True,"data":rows}
    @app.get("/api/double-prevention/measures")
    def dp_measures():
        conn = get_db_connection(); c = conn.cursor()
        try:
            c.execute("SELECT id, indicator_name, spatial_position, threshold, risk_level, unit FROM meta_info WHERE risk_level IS NOT NULL LIMIT 200")
            rows = [dict(r) for r in c.fetchall()]
        except: rows = []
        conn.close(); return {"success":True,"data":rows}
    @app.get("/api/double-prevention/stats")
    def dp_stats():
        conn = get_db_connection(); c = conn.cursor()
        counts = {}
        for t in ["warning_results","dynamic_sensor_data","static_mine_data","meta_info"]:
            try:
                c.execute("SELECT COUNT(*) FROM " + t)
                counts[t] = c.fetchone()[0]
            except: counts[t] = 0
        conn.close(); return {"success":True,"data":counts}
    @app.get("/api/double-prevention/workflow/{hazard_id}")
    def dp_workflow(hazard_id:str):
        conn = get_db_connection(); c = conn.cursor()
        try:
            c.execute("SELECT * FROM warning_results WHERE id = ?",(hazard_id,))
            row = c.fetchone()
        except: row = None
        conn.close()
        if not row: return {"success":False,"message":"未找到该隐患"}
        rd = dict(row)
        rv = rd.get("combined_risk",0.5)
        wf = [
            {"step":1,"action":"预警确认","status":"pending","desc":"确认预警真实性，排除传感器误报"},
            {"step":2,"action":"风险研判","status":"pending","desc":"结合 heatmap 分析风险源空间位置"},
            {"step":3,"action":"原因分析","status":"pending","desc":"AI 分析：传感器贡献度排序，定位主要危险源"},
            {"step":4,"action":"措施制定","status":"pending","desc":"参考知识库匹配管控措施"},
            {"step":5,"action":"措施执行","status":"pending","desc":"分配责任人执行处置"},
            {"step":6,"action":"效果复核","status":"pending","desc":"确认风险值下降至安全阈值以下"},
            {"step":7,"action":"闭环归档","status":"pending","desc":"隐患消除，归档记录"},
        ]
        if rv >= 0.7:
            wf.insert(2,{"step":"2a","action":"紧急处置","status":"pending","desc":"高风险：建议立即断电撤人"})
        return {"success":True,"data":{"hazard_id":hazard_id,"workflow":wf}}
    logger.info("Double-prevention routes registered from real data")
    return app
