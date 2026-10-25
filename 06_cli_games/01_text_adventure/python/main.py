"""ホーンテッド・テキストアドベンチャー

お化け屋敷から脱出する、選択肢で進むテキストアドベンチャー。
「ゲームの状態」と「場所の状態」を 2 つの変数で持ち、
入力 → 更新 → 描画 をくり返す。
"""

# ---------------------------------------------------------------------------
# 定数
# ---------------------------------------------------------------------------

# ゲームの状態: プレイ中。
GAME_STATE_PLAYING: str = "playing"
# ゲームの状態: ゲームオーバー。
GAME_STATE_GAME_OVER: str = "game_over"
# ゲームの状態: ゲームクリア。
GAME_STATE_GAME_CLEAR: str = "game_clear"

# 場所の状態: エントランス。
LOCATION_HALL: str = "hall"
# 場所の状態: 古い部屋。
LOCATION_ROOM: str = "room"
# 場所の状態: 階段。
LOCATION_STAIRS: str = "stairs"
# 場所の状態: 廊下。
LOCATION_CORRIDOR: str = "corridor"
# 場所の状態: 廊下の横の扉。
LOCATION_DOOR: str = "door"
# 場所の状態: 屋敷の出口。
LOCATION_EXIT: str = "exit"


# ---------------------------------------------------------------------------
# 入力
# ---------------------------------------------------------------------------


def read_input(location: str) -> str:
    """選択肢のある場所なら、1 か 2 が入力されるまで待って番号を返す。

    Args:
        location (str): 今いる場所。

    Returns:
        str: "1" または "2"。選択肢のない場所では、待たずに空文字を返す。
    """
    if location != LOCATION_HALL and location != LOCATION_CORRIDOR:
        return ""
    while True:
        choice: str = input("> ").strip()
        if choice == "1" or choice == "2":
            return choice
        print("1 か 2 を入力してね。")


# ---------------------------------------------------------------------------
# 更新
# ---------------------------------------------------------------------------


def update_hall(choice: str) -> str:
    """HALL（エントランス）で選んだ番号から、次の場所を決める。

    Args:
        choice (str): 選んだ番号。

    Returns:
        str: 次の場所。
    """
    if choice == "1":
        return LOCATION_ROOM
    return LOCATION_STAIRS


def update_corridor(choice: str) -> str:
    """CORRIDOR（廊下）で選んだ番号から、次の場所を決める。

    Args:
        choice (str): 選んだ番号。

    Returns:
        str: 次の場所。
    """
    if choice == "1":
        return LOCATION_DOOR
    return LOCATION_EXIT


def update(location: str, choice: str) -> tuple[str, str]:
    """今いる場所と選んだ番号から、次の場所とゲームの状態を決める。

    Args:
        location (str): 今いる場所。
        choice (str): 選んだ番号。選択肢のない場所では空文字。

    Returns:
        tuple[str, str]: 次の場所と、次のゲームの状態。
    """
    # 場所の判定
    next_location: str = location
    if location == LOCATION_HALL:
        next_location = update_hall(choice)
    elif location == LOCATION_STAIRS:
        next_location = LOCATION_CORRIDOR
    elif location == LOCATION_CORRIDOR:
        next_location = update_corridor(choice)

    # ゲーム状態の判定
    if next_location == LOCATION_ROOM or next_location == LOCATION_DOOR:
        return next_location, GAME_STATE_GAME_OVER
    if next_location == LOCATION_EXIT:
        return next_location, GAME_STATE_GAME_CLEAR
    return next_location, GAME_STATE_PLAYING


# ---------------------------------------------------------------------------
# 描画
# ---------------------------------------------------------------------------


def draw_story() -> None:
    """タイトルとあらすじを表示する。"""
    print("=== ホーンテッド・テキストアドベンチャー ===")
    print()
    print("肝だめしで、町はずれの古い屋敷にやってきた。")
    print("中に入ったとたん、うしろの扉がバタンと閉まった。もう開かない……。")
    print("屋敷のどこかにある出口を探して、脱出しよう！")


def draw_hall() -> None:
    """HALL（エントランス）の文章と選択肢を表示する。"""
    print()
    print("目の前に「古い部屋」と「階段」がある。")
    print("1. 部屋に入る  2. 階段を上る")


def draw_room() -> None:
    """ROOM（古い部屋）の文章を表示する。"""
    print()
    print("部屋の奥から声がする。「こっちへおいで……」")
    print("近づいた、その瞬間――うわぁぁぁぁ！！")


def draw_stairs() -> None:
    """STAIRS（階段）の文章を表示する。"""
    print()
    print("階段を上ると、長い廊下に出た。")
    print("奥へ進んでいく。")


def draw_corridor() -> None:
    """CORRIDOR（廊下）の文章と選択肢を表示する。"""
    print()
    print("奥に出口が見える。でも、横の扉から物音がする。")
    print("1. 横の扉を開ける  2. 出口へ走る")


def draw_door() -> None:
    """横の扉を開けたときの文章を表示する。"""
    print()
    print("ギィィ……「みーつけた」")
    print("うわぁぁぁぁ！！")


def draw_exit() -> None:
    """出口へ走ったときの文章を表示する。"""
    print()
    print("出口へ走る！扉を開けると外の光が見えた。")


def draw_game_over() -> None:
    """ゲームオーバーの表示をする。"""
    print()
    print("==============================")
    print("          GAME OVER")
    print("==============================")


def draw_game_clear() -> None:
    """ゲームクリアの表示をする。"""
    print()
    print("==============================")
    print("         GAME CLEAR!")
    print("==============================")


def draw(location: str, game_state: str) -> None:
    """今いる場所の文章を表示する。ゲームが終わっていれば結果も表示する。

    Args:
        location (str): 今いる場所。
        game_state (str): 今のゲームの状態。
    """
    # 場所毎の表示
    if location == LOCATION_HALL:
        draw_hall()
    elif location == LOCATION_ROOM:
        draw_room()
    elif location == LOCATION_STAIRS:
        draw_stairs()
    elif location == LOCATION_CORRIDOR:
        draw_corridor()
    elif location == LOCATION_DOOR:
        draw_door()
    elif location == LOCATION_EXIT:
        draw_exit()

    # ゲーム状態の表示
    if game_state == GAME_STATE_GAME_OVER:
        draw_game_over()
    elif game_state == GAME_STATE_GAME_CLEAR:
        draw_game_clear()


# ---------------------------------------------------------------------------
# メイン処理
# ---------------------------------------------------------------------------


def main() -> None:
    """ゲームの状態がプレイ中のあいだ、入力 → 更新 → 描画 をくり返す。"""
    # ゲームの状態（GAME_STATE_XXX のどれか）
    game_state: str = GAME_STATE_PLAYING
    # 場所の状態（LOCATION_XXX のどれか）
    location: str = LOCATION_HALL

    # ゲーム開始時の表示
    draw_story()
    draw(location, game_state)

    # ゲームループ
    while game_state == GAME_STATE_PLAYING:
        # 入力: 入力を見る
        choice: str = read_input(location)
        # 更新: 状態を更新する
        location, game_state = update(location, choice)
        # 表示: 結果を表示する
        draw(location, game_state)


if __name__ == "__main__":
    main()
