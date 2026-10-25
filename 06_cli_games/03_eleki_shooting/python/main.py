"""エレキシューティング

上から降りてくる敵を、弾で撃ち落とすリアルタイムのシューティング。
ゲームループ・デルタタイム・待たない入力・ゲームの状態・乱数の、
これまでの仕組みを全部使っている。
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
# 盤面の横のマス数。
WIDTH: int = 15
# 盤面の縦のマス数。
HEIGHT: int = 12
# 自機がいる行（いちばん下の行）。
PLAYER_ROW: int = HEIGHT - 1
# クリアに必要な、倒す敵の数。
GOAL_SCORE: int = 10
# 敵が 1 秒間に進むマス数。
ENEMY_SPEED: float = 2.0
# 弾が 1 秒間に進むマス数。
BULLET_SPEED: float = 15.0
# 敵が出てくる間隔（秒）。
SPAWN_INTERVAL: float = 1.0
# どの画面にも、いちばん上に出す見出し。
TITLE_BAR: str = "=== ELEKI SHOOTING ===\n\n"

# ゲームの状態: タイトル画面。
GAME_STATE_TITLE: str = "title"
# ゲームの状態: プレイ中。
GAME_STATE_PLAYING: str = "playing"
# ゲームの状態: ゲームクリア。
GAME_STATE_GAME_CLEAR: str = "game_clear"
# ゲームの状態: ゲームオーバー。
GAME_STATE_GAME_OVER: str = "game_over"


@dataclass
class Enemy:
    """敵 1 体のデータ。

    Attributes:
        x (int): 敵がいる列。
        y (float): 敵がいる行。なめらかに動かすため小数で持ち、描くときだけ整数にする。
        is_alive (bool): 弾に当たると False になり、そのフレームの最後に消える。
    """

    x: int
    y: float
    is_alive: bool = True


@dataclass
class Bullet:
    """弾 1 発のデータ。

    Attributes:
        x (int): 弾がある列。
        y (float): 弾がある行。敵と同じく小数で持つ。
        is_alive (bool): 敵に当たると False になり、そのフレームの最後に消える。
    """

    x: int
    y: float
    is_alive: bool = True


@dataclass
class Game:
    """ゲーム全体のデータ。

    Attributes:
        game_state (str): 今のゲームの状態（GAME_STATE_XXX のどれか）。
        player_x (int): 自機がいる列。
        enemies (list[Enemy]): 画面にいる敵。
        bullets (list[Bullet]): 画面にある弾。
        score (int): 倒した敵の数。
        spawn_timer (float): 次の敵が出るまでの残り秒数。
        is_running (bool): False になるとゲームループを抜ける。
    """

    game_state: str = GAME_STATE_TITLE
    player_x: int = WIDTH // 2
    enemies: list[Enemy] = field(default_factory=list)
    bullets: list[Bullet] = field(default_factory=list)
    score: int = 0
    spawn_timer: float = SPAWN_INTERVAL
    is_running: bool = True


# ---------------------------------------------------------------------------
# 状態の切り替え
# ---------------------------------------------------------------------------


def start_playing(game: Game) -> None:
    """PLAYING に入るときに 1 回だけ呼ぶ開始処理。
    自機・敵・弾・スコアを最初に戻す。

    Args:
        game (Game): 初期化するゲームのデータ。
    """
    game.player_x = WIDTH // 2
    game.enemies = []
    game.bullets = []
    game.score = 0
    game.spawn_timer = SPAWN_INTERVAL


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
# 更新（プレイ中オブジェクト）
# ---------------------------------------------------------------------------


def update_playing_player(game: Game, key: str) -> None:
    """押されたキーで、自機を左右に動かすか弾を撃つ。

    Args:
        game (Game): 更新するゲームのデータ。
        key (str): このフレームで押されたキー。
    """
    # 入力キーに応じて移動・攻撃を行う
    if key == "a":
        game.player_x = max(0, game.player_x - 1)
    elif key == "d":
        game.player_x = min(WIDTH - 1, game.player_x + 1)
    elif key == " ":
        game.bullets.append(Bullet(game.player_x, float(PLAYER_ROW - 1)))


def update_playing_bullets(game: Game, delta_time: float) -> None:
    """弾を上へ進め、画面の上から出た弾を消す。

    Args:
        game (Game): 更新するゲームのデータ。
        delta_time (float): 前のフレームから何秒たったか。
    """
    # 移動: 速さは「1 秒あたりのマス数 × デルタタイム」。FPS が変わっても同じ速さで動く
    for bullet in game.bullets:
        bullet.y -= BULLET_SPEED * delta_time

    # 画面の上から出た弾を消す
    game.bullets = [bullet for bullet in game.bullets if bullet.y >= 0]


def update_playing_enemies(game: Game, delta_time: float) -> None:
    """敵を出して下へ進め、画面の下から出た敵を消す。

    Args:
        game (Game): 更新するゲームのデータ。
        delta_time (float): 前のフレームから何秒たったか。
    """
    # 出現: タイマーが 0 になったら、ランダムな列に敵を 1 体出す
    game.spawn_timer -= delta_time
    if game.spawn_timer <= 0:
        game.enemies.append(Enemy(random.randrange(WIDTH), 0.0))
        game.spawn_timer = SPAWN_INTERVAL

    # 移動: 弾と同じく「1 秒あたりのマス数 × デルタタイム」で進める
    for enemy in game.enemies:
        enemy.y += ENEMY_SPEED * delta_time

    # 画面の下から出た敵を消す
    game.enemies = [enemy for enemy in game.enemies if enemy.y < HEIGHT]


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


def hit_bullets_and_enemies(game: Game) -> None:
    """弾と敵の当たりを調べ、当たった弾と敵を消してスコアを増やす。

    Args:
        game (Game): 更新するゲームのデータ。
    """
    # 当たり: 回している途中で消すと次に調べる要素がずれるので、まずは印を付けるだけ
    for bullet in game.bullets:
        for enemy in game.enemies:
            # 同じマスかではなく「同じ列で、弾が敵の位置を越えたか」で見る
            # 速い弾が 1 フレームで何マスも進んでも、敵をすり抜けない
            if (
                bullet.is_alive
                and enemy.is_alive
                and bullet.x == enemy.x
                and bullet.y <= enemy.y
            ):
                bullet.is_alive = False
                enemy.is_alive = False
                game.score += 1

    # 印の付いた弾と敵を、最後にまとめて消す
    game.bullets = [bullet for bullet in game.bullets if bullet.is_alive]
    game.enemies = [enemy for enemy in game.enemies if enemy.is_alive]


def is_player_hit(game: Game) -> bool:
    """自機が敵に当たったかを調べる。

    Args:
        game (Game): 調べるゲームのデータ。

    Returns:
        bool: 自機と同じマスに敵がいれば True。
    """
    for enemy in game.enemies:
        if enemy.x == game.player_x and int(enemy.y) == PLAYER_ROW:
            return True
    return False


def update_playing(game: Game, key: str, delta_time: float) -> None:
    """PLAYING の更新。自機・弾・敵を動かし、クリアとゲームオーバーを判別する。

    Args:
        game (Game): 更新するゲームのデータ。
        key (str): このフレームで押されたキー。
        delta_time (float): 前のフレームから何秒たったか。
    """
    # 自機・弾・敵の更新
    update_playing_player(game, key)
    update_playing_bullets(game, delta_time)
    update_playing_enemies(game, delta_time)

    # 当たり判定
    hit_bullets_and_enemies(game)

    # ゲーム状態の判定
    if game.score >= GOAL_SCORE:
        change_state(game, GAME_STATE_GAME_CLEAR)
    elif is_player_hit(game):
        change_state(game, GAME_STATE_GAME_OVER)


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
    elif (
        game.game_state == GAME_STATE_GAME_CLEAR
        or game.game_state == GAME_STATE_GAME_OVER
    ):
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
        "降りてくる敵 V を撃ち落とそう！\n"
        f"{GOAL_SCORE} 体倒せばクリア。敵に当たったらゲームオーバー。\n"
        "\n"
        "a: 左 / d: 右 / Space: 弾を撃つ\n"
        "\n"
        "Enter: スタート / q: 終了\n"
    )


def draw_playing(game: Game) -> str:
    """PLAYING の画面を作る。盤面を文字のマス目で描く。

    Args:
        game (Game): 表示するゲームのデータ。

    Returns:
        str: 画面に出す文字列。
    """
    # 盤面: 空きマス "." の上に、敵 → 弾 → 自機 の順に置く
    grid: list[list[str]] = []
    # 空きマス
    for y in range(HEIGHT):
        grid.append(["."] * WIDTH)
    # 敵
    for enemy in game.enemies:
        grid[int(enemy.y)][enemy.x] = "V"
    # 弾
    for bullet in game.bullets:
        grid[int(bullet.y)][bullet.x] = "ϟ"
    # 自機
    grid[PLAYER_ROW][game.player_x] = "A"

    # 画面: スコアの下に盤面を 1 行ずつ並べる
    screen: str = f"SCORE: {game.score}/{GOAL_SCORE}\n"
    for row in grid:
        screen += "".join(row) + "\n"
    return screen


def draw_result(game: Game, message: str) -> str:
    """GAME_CLEAR と GAME_OVER の画面を作る。最後の盤面の下にメッセージを出す。

    Args:
        game (Game): 表示するゲームのデータ。
        message (str): 盤面の下に出す結果のメッセージ。

    Returns:
        str: 画面に出す文字列。
    """
    screen: str = draw_playing(game)
    screen += f"\n{message}\n"
    screen += "r: タイトルへ / q: 終了\n"
    return screen


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
        screen = draw_result(game, "GAME CLEAR!!")
    else:
        screen = draw_result(game, "やられた…… GAME OVER")

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
