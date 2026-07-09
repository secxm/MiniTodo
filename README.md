# MiniTodo

轻量级桌面待办清单应用，基于 Python + Web 技术构建，支持便签备忘，无边框设计常驻桌面，关闭后最小化到系统托盘。

## 功能

- **待办管理** — 增删改查，支持标题、到期日期、优先级（一般/重要）
- **多视图筛选** — 今日、重要、过期、全部，快速定位待办事项
- **一键完成/取消** — 切换完成状态，自动记录完成时间
- **历史记录** — 查看所有已完成和未完成事项，支持分页浏览
- **右键快捷菜单** — 编辑、切换状态、删除
- **便签功能** — 独立的便签页，自动保存临时记录
- **自定义日期选择器** — 内置日历组件，选择到期日期
- **系统托盘** — 关闭窗口后最小化到托盘，右键菜单可显示窗口或彻底退出
- **自定义标题栏** — 无边框窗口，支持拖拽移动，暗色主题

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [pywebview](https://github.com/r0x0r/pywebview) |
| 数据库 | SQLite（本地文件存储） |
| 系统托盘 | [pystray](https://github.com/moses-palmer/pystray) |
| 图标生成 | [Pillow](https://python-pillow.org/) |
| 前端 UI | HTML5 + CSS3 + Vanilla JS + Bootstrap 5 |
| 打包 | Nuitka（推荐）/ PyInstaller |
| 包管理 | [uv](https://github.com/astral-sh/uv) |

## 快速开始

### 环境要求

- Python >= 3.10
- Windows 10+（依赖 WebView2，Win10 默认已内置）

### 安装依赖

```bash
# 使用 uv（推荐）
uv sync

# 或使用 pip
pip install pywebview pystray pillow
```

### 运行

```bash
uv run python MiniTodo.py
```

## 打包

### Nuitka（推荐）

```bash
# 正式打包（无控制台窗口）
uv run python build_nuitka.py

# Debug 模式（显示控制台，排查问题用）
uv run python build_nuitka.py --debug

# 清理后重新打包
uv run python build_nuitka.py --clean
```

打包输出：`dist_nuitka/MiniTodo.dist/MiniTodo.exe`


## 项目结构

```
MiniTodo/
├── MiniTodo.py              # 主入口（窗口、API、托盘）
├── database.py              # SQLite 数据库模块
├── frontend/                # 前端资源
│   ├── index.html           # 主页面
│   ├── css/
│   │   ├── app.css          # 应用样式（暗色主题）
│   │   └── bootstrap.min.css
│   └── js/
│       ├── api.js           # 后端通信封装
│       ├── state.js         # 全局状态管理
│       ├── render.js        # UI 渲染
│       ├── events.js        # 事件处理
│       ├── modals.js        # 弹窗（编辑/确认/右键菜单）
│       ├── calendar.js      # 日期选择器
│       ├── notes.js         # 便签功能
│       └── app.js           # 应用初始化
├── data/                    # 运行时数据（数据库、便签）
├── build_nuitka.py          # Nuitka 打包脚本
├── wg.ico                   # 应用图标
└── pyproject.toml
```

## 数据库

使用 SQLite 本地存储，数据库文件位于 `data/todo.db`。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键自增 |
| title | TEXT | 待办标题 |
| created_at | TEXT | 创建日期 (YYYY-MM-DD) |
| due_date | TEXT | 到期日期 (YYYY-MM-DD) |
| done_at | TEXT | 完成日期 |
| status | TEXT | 状态: pending / done |
| priority | TEXT | 优先级: normal / important |

## License

MIT
