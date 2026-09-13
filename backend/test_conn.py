import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'app.db')
print("SQLite db exists:", os.path.exists(db_path))
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    print("SQLite tables:", tables)
    for (t,) in tables:
        cur.execute(f"SELECT count(*) FROM {t}")
        print(f"Table {t} count:", cur.fetchone()[0])
