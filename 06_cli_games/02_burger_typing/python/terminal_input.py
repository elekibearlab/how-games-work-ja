"""Enter を待たずにキーを読むための補助

input() は Enter が押されるまでプログラムを止めてしまう。
リアルタイムのゲームでは、毎フレーム「今押されたキーはあるか」を見に行き、
なければ空文字を返して先へ進む。

使い方:
    from terminal_input import read_key

    key = read_key()  # 毎フレーム呼ぶ

端末の準備は import したときに行い、元に戻すのはプログラムの終了時に自動で行う。
"""

import os
import sys

# ---------------------------------------------------------------------------
# 端末の準備
# ---------------------------------------------------------------------------

if os.name == "nt":
    import msvcrt

    # 古いコンソールでも、画面を描き直すための制御文字を有効にする
    os.system("")
else:
    import atexit
    import select
    import termios
    import tty

    # Enter を待たずに 1 文字ずつ届くよう端末の設定を変え、終了時に元へ戻す
    saved_settings = termios.tcgetattr(sys.stdin)
    tty.setcbreak(sys.stdin)
    atexit.register(termios.tcsetattr, sys.stdin, termios.TCSADRAIN, saved_settings)


# ---------------------------------------------------------------------------
# 入力
# ---------------------------------------------------------------------------


def read_key_windows() -> str:
    """Windows で、押されたキーを 1 文字読む。

    Returns:
        str: 押されたキー。押されていなければ空文字。
    """
    if not msvcrt.kbhit():
        return ""
    key: str = msvcrt.getwch()

    # Ctrl+C: この読み方では文字として届くので、自分で中断する
    if key == "\x03":
        raise KeyboardInterrupt
    return key


def read_key_unix() -> str:
    """macOS・Linux で、押されたキーを 1 文字読む。

    Returns:
        str: 押されたキー。押されていなければ空文字。
    """
    if not select.select([sys.stdin], [], [], 0)[0]:
        return ""
    return os.read(sys.stdin.fileno(), 1).decode()


def read_key() -> str:
    """押されたキーを返す。押されていなければ待たずに空文字を返す。

    Returns:
        str: 押されたキーの文字。Enter は "enter"。押されていなければ空文字。
    """
    # OS 毎の読み方
    if os.name == "nt":
        key: str = read_key_windows()
    else:
        key = read_key_unix()

    # Enter は OS によって "\r" と "\n" のどちらかで届くので、名前をそろえる
    if key == "\r" or key == "\n":
        return "enter"
    return key
