"""
Nuitka 打包脚本 —— 将 MiniTodo 编译为独立 exe

用法:
    uv run python build_nuitka.py           # 完整 standalone 打包
    uv run python build_nuitka.py --clean   # 清理后重新打包
    uv run python build_nuitka.py --debug   # debug 模式（带控制台）
"""

import os
import sys
import shutil
import subprocess
import glob

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(PROJECT_DIR, "dist_nuitka")
SITE_PACKAGES = None


def get_site_packages():
    """获取 venv 的 site-packages 路径"""
    global SITE_PACKAGES
    if SITE_PACKAGES:
        return SITE_PACKAGES
    result = subprocess.run(
        [sys.executable, "-c", "import site; print(site.getsitepackages()[0])"],
        capture_output=True, text=True, cwd=PROJECT_DIR
    )
    SITE_PACKAGES = result.stdout.strip()
    return SITE_PACKAGES


def run_cmd(cmd, desc=""):
    label = f"[{desc}]" if desc else ""
    print(f"\n{label} 执行: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=PROJECT_DIR)
    if result.returncode != 0:
        print(f"\n[错误] {desc} 失败，退出码: {result.returncode}")
        sys.exit(result.returncode)


def copy_missing_dlls(dist_dir):
    """复制 Nuitka 遗漏的关键 DLL 到输出目录"""
    site_pkg = get_site_packages()
    print(f"\n[补充DLL] site-packages: {site_pkg}")

    # 1. pythonnet runtime DLLs（Windows 上 pywebview 必需）
    runtime_src = os.path.join(site_pkg, "pythonnet", "runtime")
    runtime_dst = os.path.join(dist_dir, "pythonnet", "runtime")
    if os.path.isdir(runtime_src):
        os.makedirs(runtime_dst, exist_ok=True)
        # 先清空，再全量复制（确保所有 .NET System.*.dll 都在）
        for f in os.listdir(runtime_dst):
            os.remove(os.path.join(runtime_dst, f))
        for f in os.listdir(runtime_src):
            src = os.path.join(runtime_src, f)
            dst = os.path.join(runtime_dst, f)
            if os.path.isfile(src):
                shutil.copy2(src, dst)
        count = len(os.listdir(runtime_dst))
        print(f"  已复制 pythonnet/runtime/ : {count} 个文件")

    # 2. clr_loader ffi DLLs（ClrLoader.dll 等）
    clr_ffi_src = os.path.join(site_pkg, "clr_loader", "ffi")
    clr_ffi_dst = os.path.join(dist_dir, "clr_loader", "ffi")
    if os.path.isdir(clr_ffi_src):
        if os.path.exists(clr_ffi_dst):
            shutil.rmtree(clr_ffi_dst)
        shutil.copytree(clr_ffi_src, clr_ffi_dst)
        print(f"  已复制 clr_loader/ffi/")

    # 3. webview lib DLLs（Windows WebView2 相关）
    webview_lib_src = os.path.join(site_pkg, "webview", "lib")
    webview_lib_dst = os.path.join(dist_dir, "webview", "lib")
    if os.path.isdir(webview_lib_src):
        os.makedirs(webview_lib_dst, exist_ok=True)
        for f in os.listdir(webview_lib_src):
            src = os.path.join(webview_lib_src, f)
            dst = os.path.join(webview_lib_dst, f)
            if not os.path.exists(dst):
                if os.path.isfile(src):
                    shutil.copy2(src, dst)
                else:
                    if not os.path.exists(dst):
                        shutil.copytree(src, dst)
        print(f"  已复制 webview/lib/")

    # 4. webview js 文件
    webview_js_src = os.path.join(site_pkg, "webview", "js")
    webview_js_dst = os.path.join(dist_dir, "webview", "js")
    if os.path.isdir(webview_js_src) and not os.path.exists(webview_js_dst):
        shutil.copytree(webview_js_src, webview_js_dst)
        print(f"  已复制 webview/js/")

    # 5. 确保 data 目录存在
    data_dir = os.path.join(dist_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    print(f"  已创建 data/ 目录")


def build(debug=False, clean=False):
    print("=" * 60)
    print("  MiniTodo Nuitka 打包")
    print(f"  Python: {sys.version}")
    print(f"  Debug: {debug}")
    print("=" * 60)

    # 清理
    if clean:
        print("\n[清理] 删除旧的构建文件...")
        for d in [OUTPUT_DIR, "MiniTodo.build", "MiniTodo.dist", "MiniTodo.onefile-build"]:
            p = os.path.join(PROJECT_DIR, d)
            if os.path.exists(p):
                shutil.rmtree(p)
                print(f"  已删除: {d}")

    # 检查 Nuitka
    try:
        result = subprocess.run(
            [sys.executable, "-m", "nuitka", "--version"],
            capture_output=True, text=True
        )
        print(f"\n[检查] Nuitka: {result.stdout.strip()}")
    except Exception:
        print("[错误] Nuitka 未安装，请运行: uv pip install nuitka")
        return 1

    # 构建命令
    cmd = [
        sys.executable, "-m", "nuitka",
        "--standalone",
        "--assume-yes-for-downloads",
        "--output-dir=" + OUTPUT_DIR,
        "--include-data-dir=frontend=frontend",
    ]

    if debug:
        cmd.append("--windows-console-mode=force")
    else:
        cmd.append("--windows-console-mode=disable")

    # 图标
    ico_path = os.path.join(PROJECT_DIR, "wg.ico")
    if os.path.exists(ico_path):
        cmd.append("--windows-icon-from-ico=wg.ico")

    # 禁止 Nuitka 排除平台相关模块（如 webview.platforms.win32）
    cmd.append("--no-deployment-flag=excluded-module-usage")

    # 禁用 pywebview 插件，手动控制包含哪些模块
    cmd.append("--disable-plugin=pywebview")

    cmd += [
        "--include-package=webview",
        "--include-package=pythonnet",
        "--include-package=clr_loader",
    ]

    # 排除不需要的模块
    cmd += [
        "--nofollow-import-to=tkinter",
        "--nofollow-import-to=matplotlib",
        "--nofollow-import-to=numpy",
        "--nofollow-import-to=pandas",
        "--nofollow-import-to=IPython",
        "--nofollow-import-to=jupyter",
        "--nofollow-import-to=PyQt5",
        "--nofollow-import-to=PyQt6",
        "--nofollow-import-to=PySide2",
        "--nofollow-import-to=PySide6",
        "--nofollow-import-to=wx",
        "--nofollow-import-to=kivy",
    ]

    cmd.append("MiniTodo.py")

    # 执行 Nuitka 打包
    run_cmd(cmd, "Nuitka 编译打包")

    # 查找输出目录
    dist_dir = os.path.join(OUTPUT_DIR, "MiniTodo.dist")
    if not os.path.isdir(dist_dir):
        print("[错误] 未找到输出目录")
        return 1

    # 补充遗漏的 DLL
    copy_missing_dlls(dist_dir)

    # 输出结果
    exe_path = os.path.join(dist_dir, "MiniTodo.exe")
    if os.path.exists(exe_path):
        total_size = 0
        for root, dirs, files in os.walk(dist_dir):
            for f in files:
                total_size += os.path.getsize(os.path.join(root, f))
        print(f"\n[成功] 打包完成!")
        print(f"  exe: {exe_path}")
        print(f"  大小: {total_size / (1024*1024):.1f} MB")
        print(f"  目录: {dist_dir}")
    else:
        print(f"\n[警告] 未找到 MiniTodo.exe")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="MiniTodo Nuitka 打包")
    parser.add_argument("--clean", action="store_true", help="清理旧的构建文件")
    parser.add_argument("--debug", action="store_true", help="debug 模式（带控制台窗口）")
    args = parser.parse_args()

    build(debug=args.debug, clean=args.clean)
