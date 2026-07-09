"""
SQLite 数据库模块 —— 管理 todo 代办事项的持久化存储。
"""

import sqlite3
import os
import sys
from datetime import date

# 打包后 __file__ 指向临时目录，数据会丢失
# 需要用 sys.argv[0] 获取 exe 所在目录（兼容 PyInstaller / Nuitka / 开发模式）
if getattr(sys, 'frozen', False) or getattr(sys, '_MEIPASS', None):
    # PyInstaller: sys.frozen=True, _MEIPASS=临时目录
    _BASE_DIR = os.path.dirname(os.path.abspath(sys.executable))
elif '__compiled__' in dir():
    # Nuitka standalone: __compiled__ 存在，sys.argv[0] 为 exe 路径
    _BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
else:
    _BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(_BASE_DIR, "data", "todo.db")


def get_connection():
    # 确保 data 目录存在（打包后 exe 目录下可能没有）
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS todos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL,
            created_at  TEXT    NOT NULL,
            due_date    TEXT,
            done_at     TEXT,            -- 完成时间
            status      TEXT    NOT NULL DEFAULT 'pending',  -- pending | done
            priority    TEXT    NOT NULL DEFAULT 'normal'    -- normal | important
        )
        """
    )
    # 兼容旧表：如果 done_at 列不存在则添加
    try:
        conn.execute("SELECT done_at FROM todos LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE todos ADD COLUMN done_at TEXT")
    # 兼容旧表：如果 priority 列不存在则添加
    try:
        conn.execute("SELECT priority FROM todos LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'")
    conn.commit()
    conn.close()


# ---- 增 ----
def add_todo(title: str, due_date: str | None = None, priority: str = 'normal') -> int:
    conn = get_connection()
    today = date.today().isoformat()  # "YYYY-MM-DD"
    cur = conn.execute(
        "INSERT INTO todos (title, created_at, due_date, status, priority) VALUES (?, ?, ?, 'pending', ?)",
        (title, today, due_date, priority),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


# ---- 删 ----
def delete_todo(todo_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    conn.commit()
    conn.close()


# ---- 改 ----
def update_todo(todo_id: int, title: str = None, due_date: str = None, status: str = None, priority: str = None, done_at: str = None, created_at: str = None):
    conn = get_connection()
    fields = []
    values = []
    today = date.today().isoformat()  # "YYYY-MM-DD"
    if title is not None:
        fields.append("title = ?")
        values.append(title)
    if due_date is not None:
        fields.append("due_date = ?")
        values.append(due_date)
    if status is not None:
        fields.append("status = ?")
        values.append(status)
        # 状态变更时，如果未手动指定 done_at，自动设置/清除完成时间
        if done_at is None:
            if status == "done":
                fields.append("done_at = ?")
                values.append(today)
            else:
                fields.append("done_at = ?")
                values.append(None)
    if priority is not None:
        fields.append("priority = ?")
        values.append(priority)
    if done_at is not None:
        fields.append("done_at = ?")
        values.append(done_at)
    if created_at is not None:
        fields.append("created_at = ?")
        values.append(created_at)
    if not fields:
        conn.close()
        return
    values.append(todo_id)
    conn.execute(f"UPDATE todos SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()


# ---- 查 ----
def get_pending_todos():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM todos WHERE status = 'pending' ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_done_todos():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM todos WHERE status = 'done' ORDER BY done_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_todos():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM todos ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
