/**
 * ホーンテッド・テキストアドベンチャー
 *
 * お化け屋敷から脱出する、選択肢で進むテキストアドベンチャー。
 * 「ゲームの状態」と「場所の状態」を 2 つの変数で持ち、
 * 入力 → 更新 → 描画 をくり返す。
 */

import * as readline from "node:readline/promises";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

// ゲームの状態: プレイ中。
const GAME_STATE_PLAYING = "playing";
// ゲームの状態: ゲームオーバー。
const GAME_STATE_GAME_OVER = "game_over";
// ゲームの状態: ゲームクリア。
const GAME_STATE_GAME_CLEAR = "game_clear";

// 場所の状態: エントランス。
const LOCATION_HALL = "hall";
// 場所の状態: 古い部屋。
const LOCATION_ROOM = "room";
// 場所の状態: 階段。
const LOCATION_STAIRS = "stairs";
// 場所の状態: 廊下。
const LOCATION_CORRIDOR = "corridor";
// 場所の状態: 廊下の横の扉。
const LOCATION_DOOR = "door";
// 場所の状態: 屋敷の出口。
const LOCATION_EXIT = "exit";

// ---------------------------------------------------------------------------
// 入力
// ---------------------------------------------------------------------------

// キーボードから 1 行ずつ読むための窓口
const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * 選択肢のある場所なら、1 か 2 が入力されるまで待って番号を返す。
 *
 * @param {string} location 今いる場所。
 * @returns {Promise<string>} "1" または "2"。選択肢のない場所では、待たずに空文字を返す。
 */
async function readInput(location) {
  if (location !== LOCATION_HALL && location !== LOCATION_CORRIDOR) {
    return "";
  }
  while (true) {
    const choice = (await terminal.question("> ")).trim();
    if (choice === "1" || choice === "2") {
      return choice;
    }
    console.log("1 か 2 を入力してね。");
  }
}

// ---------------------------------------------------------------------------
// 更新
// ---------------------------------------------------------------------------

/**
 * HALL（エントランス）で選んだ番号から、次の場所を決める。
 *
 * @param {string} choice 選んだ番号。
 * @returns {string} 次の場所。
 */
function updateHall(choice) {
  if (choice === "1") {
    return LOCATION_ROOM;
  }
  return LOCATION_STAIRS;
}

/**
 * CORRIDOR（廊下）で選んだ番号から、次の場所を決める。
 *
 * @param {string} choice 選んだ番号。
 * @returns {string} 次の場所。
 */
function updateCorridor(choice) {
  if (choice === "1") {
    return LOCATION_DOOR;
  }
  return LOCATION_EXIT;
}

/**
 * 今いる場所と選んだ番号から、次の場所とゲームの状態を決める。
 *
 * @param {string} location 今いる場所。
 * @param {string} choice 選んだ番号。選択肢のない場所では空文字。
 * @returns {[string, string]} 次の場所と、次のゲームの状態。
 */
function update(location, choice) {
  // 場所の判定
  let nextLocation = location;
  if (location === LOCATION_HALL) {
    nextLocation = updateHall(choice);
  } else if (location === LOCATION_STAIRS) {
    nextLocation = LOCATION_CORRIDOR;
  } else if (location === LOCATION_CORRIDOR) {
    nextLocation = updateCorridor(choice);
  }

  // ゲーム状態の判定
  if (nextLocation === LOCATION_ROOM || nextLocation === LOCATION_DOOR) {
    return [nextLocation, GAME_STATE_GAME_OVER];
  }
  if (nextLocation === LOCATION_EXIT) {
    return [nextLocation, GAME_STATE_GAME_CLEAR];
  }
  return [nextLocation, GAME_STATE_PLAYING];
}

// ---------------------------------------------------------------------------
// 描画
// ---------------------------------------------------------------------------

/** タイトルとあらすじを表示する。 */
function drawStory() {
  console.log("=== ホーンテッド・テキストアドベンチャー ===");
  console.log();
  console.log("肝だめしで、町はずれの古い屋敷にやってきた。");
  console.log(
    "中に入ったとたん、うしろの扉がバタンと閉まった。もう開かない……。",
  );
  console.log("屋敷のどこかにある出口を探して、脱出しよう！");
}

/** HALL（エントランス）の文章と選択肢を表示する。 */
function drawHall() {
  console.log();
  console.log("目の前に「古い部屋」と「階段」がある。");
  console.log("1. 部屋に入る  2. 階段を上る");
}

/** ROOM（古い部屋）の文章を表示する。 */
function drawRoom() {
  console.log();
  console.log("部屋の奥から声がする。「こっちへおいで……」");
  console.log("近づいた、その瞬間――うわぁぁぁぁ！！");
}

/** STAIRS（階段）の文章を表示する。 */
function drawStairs() {
  console.log();
  console.log("階段を上ると、長い廊下に出た。");
  console.log("奥へ進んでいく。");
}

/** CORRIDOR（廊下）の文章と選択肢を表示する。 */
function drawCorridor() {
  console.log();
  console.log("奥に出口が見える。でも、横の扉から物音がする。");
  console.log("1. 横の扉を開ける  2. 出口へ走る");
}

/** 横の扉を開けたときの文章を表示する。 */
function drawDoor() {
  console.log();
  console.log("ギィィ……「みーつけた」");
  console.log("うわぁぁぁぁ！！");
}

/** 出口へ走ったときの文章を表示する。 */
function drawExit() {
  console.log();
  console.log("出口へ走る！扉を開けると外の光が見えた。");
}

/** ゲームオーバーの表示をする。 */
function drawGameOver() {
  console.log();
  console.log("==============================");
  console.log("          GAME OVER");
  console.log("==============================");
}

/** ゲームクリアの表示をする。 */
function drawGameClear() {
  console.log();
  console.log("==============================");
  console.log("         GAME CLEAR!");
  console.log("==============================");
}

/**
 * 今いる場所の文章を表示する。ゲームが終わっていれば結果も表示する。
 *
 * @param {string} location 今いる場所。
 * @param {string} gameState 今のゲームの状態。
 */
function draw(location, gameState) {
  // 場所毎の表示
  if (location === LOCATION_HALL) {
    drawHall();
  } else if (location === LOCATION_ROOM) {
    drawRoom();
  } else if (location === LOCATION_STAIRS) {
    drawStairs();
  } else if (location === LOCATION_CORRIDOR) {
    drawCorridor();
  } else if (location === LOCATION_DOOR) {
    drawDoor();
  } else if (location === LOCATION_EXIT) {
    drawExit();
  }

  // ゲーム状態の表示
  if (gameState === GAME_STATE_GAME_OVER) {
    drawGameOver();
  } else if (gameState === GAME_STATE_GAME_CLEAR) {
    drawGameClear();
  }
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------

/** ゲームの状態がプレイ中のあいだ、入力 → 更新 → 描画 をくり返す。 */
async function main() {
  // ゲームの状態（GAME_STATE_XXX のどれか）
  let gameState = GAME_STATE_PLAYING;
  // 場所の状態（LOCATION_XXX のどれか）
  let location = LOCATION_HALL;

  // ゲーム開始時の表示
  drawStory();
  draw(location, gameState);

  // ゲームループ
  while (gameState === GAME_STATE_PLAYING) {
    // 入力: 入力を見る
    const choice = await readInput(location);
    // 更新: 状態を更新する
    [location, gameState] = update(location, choice);
    // 表示: 結果を表示する
    draw(location, gameState);
  }

  // キーボードの窓口を閉じて、プログラムを終える
  terminal.close();
}

main();
