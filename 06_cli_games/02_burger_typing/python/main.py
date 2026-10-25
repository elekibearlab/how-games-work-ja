"""バーガー・タイピング

ランダムな順に出るハンバーガーの具材を、制限時間内に全部打ってバーガーを完成させる。
時計つきのゲームループ（FPS とデルタタイム）、待たない入力、
ゲームの状態の切り替え、乱数によるシャッフルを組み合わせている。
"""

import random
import time
from dataclasses import dataclass, field

from terminal_input import read_key

# ---------------------------------------------------------------------------
# 定数
# ---------------------------------------------------------------------------

# 1 秒間にゲームループを回す回数。
FPS: int = 30
# 制限時間（秒）。
TIME_LIMIT: float = 15.0
# 出題する具材。
INGREDIENTS: list[str] = ["cheese", "bacon", "lettuce", "tomato", "onion", "pickle"]
# どの画面にも、いちばん上に出す見出し。
TITLE_BAR: str = "=== BURGER TYPING ===\n\n"

# ゲームの状態: タイトル画面。
GAME_STATE_TITLE: str = "title"
# ゲームの状態: プレイ中。
GAME_STATE_PLAYING: str = "playing"
# ゲームの状態: ゲームクリア。
GAME_STATE_GAME_CLEAR: str = "game_clear"
# ゲームの状態: ゲームオーバー（時間切れ）。
GAME_STATE_GAME_OVER: str = "game_over"


@dataclass
class Game:
    """ゲーム全体のデータ。

    Attributes:
        game_state (str): 今のゲームの状態（GAME_STATE_XXX のどれか）。
        words (list[str]): 今回の出題順に並べた具材。
        word_index (int): 今のお題が words の何番目か。
        typed_text (str): 今のお題に対して、ここまで正しく打てた文字。
        time_left (float): 残り時間（秒）。
        is_running (bool): False になるとゲームループを抜ける。
    """

    game_state: str = GAME_STATE_TITLE
    words: list[str] = field(default_factory=list)
    word_index: int = 0
    typed_text: str = ""
    time_left: float = TIME_LIMIT
    is_running: bool = True


# ---------------------------------------------------------------------------
# 状態の切り替え
# ---------------------------------------------------------------------------


def start_playing(game: Game) -> None:
    """PLAYING に入るときに 1 回だけ呼ぶ開始処理。出題順を決め、数値を最初に戻す。

    Args:
        game (Game): 初期化するゲームのデータ。
    """
    # 毎回ちがう順番で出題するため、具材の並びを乱数で混ぜる
    game.words = INGREDIENTS.copy()
    random.shuffle(game.words)

    # お題・入力・残り時間を最初に戻す
    game.word_index = 0
    game.typed_text = ""
    game.time_left = TIME_LIMIT


def change_state(game: Game, next_state: str) -> None:
    """ゲームの状態を切り替え、新しい状態の開始処理を呼ぶ。

    切り替えは必ずこの関数を通すので、開始処理のやり忘れが起きない。

    Args:
        game (Game): 切り替えるゲームのデータ。
        next_state (str): 次のゲームの状態。
    """
    game.game_state = next_state
    if next_state == GAME_STATE_PLAYING:
        start_playing(game)


# ---------------------------------------------------------------------------
# 更新
# ---------------------------------------------------------------------------


def update_title(game: Game, key: str) -> None:
    """TITLE の更新。Enter で開始、q で終了する。

    Args:
        game (Game): 更新するゲームのデータ。
        key (str): このフレームで押されたキー。
    """
    if key == "enter":
        change_state(game, GAME_STATE_PLAYING)
    elif key == "q":
        game.is_running = False


def update_playing(game: Game, key: str, delta_time: float) -> None:
    """PLAYING の更新。残り時間を減らし、打ったキーがお題の次の文字なら進める。

    Args:
        game (Game): 更新するゲームのデータ。
        key (str): このフレームで押されたキー。
        delta_time (float): 前のフレームから何秒たったか。
    """
    # 残り時間の判定
    # フレームの回数ではなく経過時間で減らすので、パソコンの速さが違っても 15 秒は 15 秒
    game.time_left -= delta_time
    if game.time_left <= 0:
        change_state(game, GAME_STATE_GAME_OVER)
        return

    # 入力の判定: 打ったキーが、お題の次の 1 文字と同じなら進める
    word: str = game.words[game.word_index]
    next_char: str = word[len(game.typed_text)]
    if key == next_char:
        game.typed_text += key

    # お題の判定: 打ち終わったら次のお題へ。全部打ったらクリア
    if game.typed_text == word:
        game.word_index += 1
        game.typed_text = ""
        if game.word_index == len(game.words):
            change_state(game, GAME_STATE_GAME_CLEAR)


def update_result(game: Game, key: str) -> None:
    """GAME_CLEAR と GAME_OVER の更新。r でタイトルに戻り、q で終了する。

    Args:
        game (Game): 更新するゲームのデータ。
        key (str): このフレームで押されたキー。
    """
    if key == "r":
        change_state(game, GAME_STATE_TITLE)
    elif key == "q":
        game.is_running = False


def update(game: Game, key: str, delta_time: float) -> None:
    """今のゲームの状態に応じて、状態ごとの更新を呼び分ける。

    Args:
        game (Game): 更新するゲームのデータ。
        key (str): このフレームで押されたキー。押されていなければ空文字。
        delta_time (float): 前のフレームから何秒たったか。
    """
    if game.game_state == GAME_STATE_TITLE:
        update_title(game, key)
    elif game.game_state == GAME_STATE_PLAYING:
        update_playing(game, key, delta_time)
    elif game.game_state == GAME_STATE_GAME_CLEAR or game.game_state == GAME_STATE_GAME_OVER:
        update_result(game, key)


# ---------------------------------------------------------------------------
# 描画
# ---------------------------------------------------------------------------


def draw_title() -> str:
    """TITLE の画面を作る。

    Returns:
        str: 画面に出す文字列。
    """
    return (
        "ランダムな順に出る具材を、全部打ってバーガーを完成させよう！\n"
        f"制限時間は {TIME_LIMIT:.0f} 秒。\n"
        "\n"
        "Enter: スタート / q: 終了\n"
    )


def draw_playing(game: Game) -> str:
    """PLAYING の画面を作る。

    最後の行を改行で終えないので、描いたあとのカーソルが入力の横に残る。

    Args:
        game (Game): 表示するゲームのデータ。

    Returns:
        str: 画面に出す文字列。
    """
    return (
        f"残り時間: {game.time_left:.1f} 秒\n"
        f"具材: {game.word_index + 1}/{len(game.words)}\n"
        "\n"
        f"お題: {game.words[game.word_index]}\n"
        f"入力: {game.typed_text}"
    )


def draw_game_clear(game: Game) -> str:
    """GAME_CLEAR の画面を作る。打った具材を積んだバーガーを出す。

    Args:
        game (Game): 表示するゲームのデータ。

    Returns:
        str: 画面に出す文字列。
    """
    # バーガー: 上のバンズ → 具材 → 下のバンズ の順に積む
    screen: str = "  /~~~~~~~~~~\\\n"
    for word in game.words:
        screen += f"  [ {word:^8} ]\n"
    screen += "  \\__________/\n"

    # 結果
    screen += "\n"
    screen += "バーガー完成！ GAME CLEAR!\n"
    screen += f"タイム: {TIME_LIMIT - game.time_left:.1f} 秒\n"
    screen += "\n"
    screen += "r: タイトルへ / q: 終了\n"
    return screen


def draw_game_over() -> str:
    """GAME_OVER の画面を作る。

    Returns:
        str: 画面に出す文字列。
    """
    return "時間切れ…… GAME OVER\n\nr: タイトルへ / q: 終了\n"


def draw(game: Game) -> None:
    """今のゲームの状態の画面を作り、見出しをつけて描き直す。

    Args:
        game (Game): 表示するゲームのデータ。
    """
    # 状態毎の画面
    if game.game_state == GAME_STATE_TITLE:
        screen: str = draw_title()
    elif game.game_state == GAME_STATE_PLAYING:
        screen = draw_playing(game)
    elif game.game_state == GAME_STATE_GAME_CLEAR:
        screen = draw_game_clear(game)
    else:
        screen = draw_game_over()

    # 描き直し: "\033[H" でカーソルを左上に戻し、"\033[J" で前の画面を消してから描く
    print("\033[H\033[J" + TITLE_BAR + screen, end="", flush=True)


# ---------------------------------------------------------------------------
# メイン処理
# ---------------------------------------------------------------------------


def main() -> None:
    """時計つきのゲームループで、入力 → 更新 → 描画 をくり返す。"""
    # ゲーム全体のデータ
    game: Game = Game()
    # 前の周の始まりの時刻（秒）
    previous_time: float = time.perf_counter()

    # ゲームループ
    while game.is_running:
        # 時間計算: 前の周から何秒たったかを測る
        current_time: float = time.perf_counter()
        delta_time: float = current_time - previous_time
        previous_time = current_time

        # 入力: 押されたキーを見る（押されていなければ空文字）
        key: str = read_key()
        # 更新: 状態を更新する
        update(game, key, delta_time)
        # 描画: 画面を描き直す
        draw(game)

        # フレームレート考慮: 処理が早く終わったら 1/FPS 秒になるまで待ち、1 秒に FPS 回へそろえる
        elapsed_time: float = time.perf_counter() - current_time
        time.sleep(max(0.0, 1 / FPS - elapsed_time))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n終了しました。")
