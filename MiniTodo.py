"""
MiniTodo —— 桌面便签式 Todo 代办清单应用
使用 pywebview + SQLite，关闭后最小化到系统托盘。
"""

import json
import os
import sys
import threading

import webview

from database import (
    init_db,
    add_todo,
    delete_todo,
    update_todo,
    get_pending_todos,
    get_done_todos,
    get_all_todos,
)


def get_resource_dir():
    """获取资源目录：PyInstaller 打包后在临时目录，Nuitka 在 exe 目录，开发时在脚本目录"""
    if getattr(sys, 'frozen', False):
        # PyInstaller: 资源在 _MEIPASS 临时目录
        return getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(sys.executable)))
    elif '__compiled__' in dir():
        # Nuitka standalone: 资源用 --include-data-dir 嵌入，在 exe 旁边
        return os.path.dirname(os.path.abspath(sys.argv[0]))
    return os.path.dirname(os.path.abspath(__file__))


def get_data_dir():
    """获取数据目录：打包后在 exe 所在目录，开发时在当前脚本目录"""
    if getattr(sys, 'frozen', False):
        # PyInstaller
        return os.path.dirname(os.path.abspath(sys.executable))
    elif '__compiled__' in dir():
        # Nuitka
        return os.path.dirname(os.path.abspath(sys.argv[0]))
    return os.path.dirname(os.path.abspath(__file__))


# ---- 常量 ----
WINDOW_WIDTH = 460
WINDOW_HEIGHT = 760
TITLE = "Mini Todo"

# 获取前端目录
FRONTEND_DIR = os.path.join(get_resource_dir(), "frontend")

# 便签文件路径
NOTE_FILE = os.path.join(get_data_dir(), "data", "note.txt")


# ---- API 类 ----
class TodoAPI:
    """暴露给前端 JS 的 API。pywebview 的 expose() 只能接受一个函数，
    所以用 handle(action, **kwargs) 作为统一入口，内部委托给各个独立方法。"""

    def __init__(self, window):
        self._window = window

    # ---- 统一入口（暴露给 pywebview） ----
    def handle(self, action: str, params: dict = None):
        """前端调用 window.pywebview.api.handle(action, params) 进入此方法。"""
        method = getattr(self, f"_handle_{action}", None)
        if method is None:
            return {"error": f"unknown action: {action}"}
        try:
            return method(params or {})
        except Exception as e:
            return {"error": str(e)}

    # ---- 查询 ----
    def _handle_get_pending(self, _):
        return get_pending_todos()

    def _handle_get_done(self, _):
        return get_done_todos()

    def _handle_get_all(self, _):
        return get_all_todos()

    # ---- 新增 ----
    def _handle_add(self, params):
        title = params.get("title", "").strip()
        if not title:
            return {"error": "标题不能为空"}
        add_todo(title, params.get("due_date") or None, params.get("priority") or "normal")
        return {"ok": True}

    # ---- 删除 ----
    def _handle_delete(self, params):
        delete_todo(params["id"])
        return {"ok": True}

    # ---- 修改 ----
    def _handle_update(self, params):
        done_at = params.get("done_at")
        created_at = params.get("created_at")
        update_todo(
            params["id"],
            title=params.get("title"),
            due_date=params.get("due_date"),
            priority=params.get("priority"),
            done_at=done_at or None,
            created_at=created_at or None,
        )
        return {"ok": True}

    # ---- 完成/取消完成 ----
    def _handle_toggle(self, params):
        todo_id = params["id"]
        todos = get_pending_todos() + get_done_todos()
        target = next((t for t in todos if t["id"] == todo_id), None)
        if target:
            new_status = "done" if target["status"] == "pending" else "pending"
            update_todo(todo_id, status=new_status)
        return {"ok": True}

    # ---- 便签（文件存储） ----
    def _handle_get_note(self, _):
        """读取便签文件内容"""
        if os.path.exists(NOTE_FILE):
            with open(NOTE_FILE, "r", encoding="utf-8") as f:
                return {"content": f.read()}
        return {"content": ""}

    def _handle_save_note(self, params):
        """保存便签到文件"""
        content = params.get("content", "")
        os.makedirs(os.path.dirname(NOTE_FILE), exist_ok=True)
        with open(NOTE_FILE, "w", encoding="utf-8") as f:
            f.write(content)
        return {"ok": True}

    # ---- 窗口控制 ----
    def _handle_minimize(self, _):
        self._window.minimize()
        return {"ok": True}

    def _handle_close_to_tray(self, _):
        self._window.hide()
        return {"ok": True}

    def _handle_move_window(self, params):
        """前端拖拽标题栏时移动窗口（相对偏移）"""
        dx = params.get("dx", 0)
        dy = params.get("dy", 0)
        # pywebview 的 window 有 x, y 属性表示当前位置
        self._window.move(self._window.x + dx, self._window.y + dy)
        return {"ok": True}


# ---- 系统托盘 ----
def create_tray(window):
    """创建系统托盘图标及右键菜单。"""
    import pystray
    from PIL import Image, ImageDraw

    # 生成一个简单的托盘图标 (16x16 彩色方块)
    def _make_icon():
        img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([2, 2, 30, 30], radius=6, fill="#e94560")
        draw.text((10, 6), "✓", fill="white")
        return img

    icon = _make_icon()

    def on_show(icon_item, item):
        window.show()
        window.restore()

    def on_quit(icon_item, item):
        icon_item.stop()
        # 在主线程中销毁窗口
        if window:
            try:
                window.destroy()
            except Exception:
                pass
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("显示窗口", on_show, default=True),
        pystray.MenuItem("退出 MiniTodo", on_quit),
    )

    tray_icon = pystray.Icon("MiniTodo", icon, "MiniTodo", menu)
    return tray_icon


# ---- 主入口 ----
def main():
    # 初始化数据库
    init_db()

    # 创建窗口
    html_path = os.path.join(FRONTEND_DIR, "index.html")
    window = webview.create_window(
        title=TITLE,
        url=html_path,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        resizable=True,
        frameless=True,        # 无边框，实现自定义标题栏
        easy_drag=False,       # 关闭自动拖拽，由前端标题栏手动处理
        on_top=True,           # 常驻桌面
        background_color="#1a1a2e",
    )

    # 绑定 API —— pywebview 只接受单个函数，暴露 handle 作为统一入口
    api = TodoAPI(window)
    window.expose(api.handle)

    # 启动系统托盘
    tray = create_tray(window)

    # 在子线程中运行托盘
    tray_thread = threading.Thread(target=tray.run, daemon=True)
    tray_thread.start()

    # 启动 webview（阻塞）
    webview.start(debug=False)

    # webview 退出后，停止托盘
    tray.stop()


if __name__ == "__main__":
    main()
