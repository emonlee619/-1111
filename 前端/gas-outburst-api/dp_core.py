import sqlite3, json, os, datetime, math, random

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outburst_warning.db")
def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c
def nw():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
def dr(r):
    return dict(r) if r else None
def gid(p):
    return f"{p}-{datetime.datetime.now().strftime(chr(37)+chr(89)+chr(37)+chr(109)+chr(37)+chr(100)+chr(37)+chr(72)+chr(37)+chr(77)+chr(37)+chr(83))}-{random.randint(100,999)}"
def rc(s):
    if s >= 0.7: return 4, "red", chr(37325)+chr(22823)+chr(39118)+chr(38505)
    if s >= 0.5: return 3, "orange", chr(36739)+chr(22823)+chr(39118)+chr(38505)
    if s >= 0.3: return 2, "yellow", chr(19968)+chr(33324)+chr(39118)+chr(38505)
    return 1, "blue", chr(20302)+chr(39118)+chr(38505)

TABLE_SQL = [
    "CREATE TABLE IF NOT EXISTS dp_hazards (id TEXT PRIMARY KEY,name TEXT,hazard_type TEXT,major_category TEXT,department TEXT,region TEXT,possible_consequences TEXT,source TEXT,static_score REAL,dynamic_score REAL,combined_risk REAL,risk_level TEXT,risk_level_code INTEGER,created_at TEXT,updated_at TEXT,status TEXT DEFAULT 'active')",
    "CREATE TABLE IF NOT EXISTS dp_risk_cards (id TEXT PRIMARY KEY,hazard_id TEXT,hazard_name TEXT,risk_level TEXT,risk_level_code INTEGER,score REAL,potential_consequences TEXT,control_measures TEXT,emergency_response TEXT,responsible_person TEXT,contact TEXT,location TEXT,department TEXT,created_at TEXT,updated_at TEXT)",
    "CREATE TABLE IF NOT EXISTS dp_measures (id TEXT PRIMARY KEY,hazard_type TEXT,risk_level TEXT,measure_category TEXT,measure_content TEXT,source TEXT,standard_ref TEXT,effectiveness REAL DEFAULT 0.0,created_at TEXT,updated_at TEXT)",
    "CREATE TABLE IF NOT EXISTS dp_hazard_ledger (id TEXT PRIMARY KEY,hazard_id TEXT,hazard_name TEXT,location TEXT,description TEXT,cause_analysis TEXT,risk_level TEXT,risk_level_code INTEGER,found_time TEXT,found_by TEXT,responsible_person TEXT,team TEXT,corrective_action TEXT,deadline TEXT,feedback_evidence TEXT,status TEXT DEFAULT 'pending',verified_by TEXT,reviewed_by TEXT,closed_time TEXT,source TEXT,is_recurrence INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS dp_workflow (id INTEGER PRIMARY KEY AUTOINCREMENT,hazard_id TEXT,process_type TEXT,step INTEGER,step_name TEXT,status TEXT DEFAULT 'pending',action_data TEXT,started_at TEXT,completed_at TEXT,operator TEXT,remarks TEXT)",
    "CREATE TABLE IF NOT EXISTS dp_residual_risk (id INTEGER PRIMARY KEY AUTOINCREMENT,hazard_id TEXT,initial_risk REAL,residual_risk REAL,risk_reduction REAL,is_acceptable INTEGER DEFAULT 0,calculated_at TEXT,measures_applied TEXT)",
    "CREATE TABLE IF NOT EXISTS dp_reviews (id TEXT PRIMARY KEY,hazard_id TEXT,review_type TEXT,warning_timeliness TEXT,measure_effectiveness TEXT,lessons_learned TEXT,rule_updates TEXT,created_at TEXT,reviewed_by TEXT)",
    "CREATE TABLE IF NOT EXISTS dp_overdue_log (id INTEGER PRIMARY KEY AUTOINCREMENT,hazard_id TEXT,escalation_level INTEGER,notified_person TEXT,notified_at TEXT,response TEXT,status TEXT)",
]

def register(app):
    @app.on_event("startup")
    def init_dp():
        conn = db(); c = conn.cursor()
        for t in TABLE_SQL:
            try: c.execute(t)
            except: pass
        conn.commit(); conn.close()
        print("[DP] Tables ready")
    print("[DP] Module loaded")
    return app
