/**
 * バーガー・タイピング
 *
 * ランダムな順に出るハンバーガーの具材を、制限時間内に全部打ってバーガーを完成させる。
 * 時計つきのゲームループ（FPS とデルタタイム）、待たない入力、
 * ゲームの状態の切り替え、乱数によるシャッフルを組み合わせている。
 */

import { setTimeout as sleep } from "node:timers/promises";

import { readKey } from "./terminal_input.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

// 1 秒間にゲームループを回す回数。
const FPS = 30;
// 制限時間（秒）。
const TIME_LIMIT = 15.0;
// 出題する具材。
const INGREDIENTS = ["cheese", "bacon", "lettuce", "tomato", "onion", "pickle"];
// どの画面にも、いちばん上に出す見出し。
const TITLE_BAR = "=== BURGER TYPING ===\n\n";

// ゲームの状態: タイトル画面。
const GAME_STATE_TITLE = "title";
// ゲームの状態: プレイ中。
const GAME_STATE_PLAYING = "playing";
// ゲームの状態: ゲームクリア。
const GAME_STATE_GAME_CLEAR = "game_clear";
// ゲームの状態: ゲームオーバー（時間切れ）。
const GAME_STATE_GAME_OVER = "game_over";

/** ゲーム全体のデータ。 */
class Game {
  constructor() {
    /** 今のゲームの状態（GAME_STATE_XXX のどれか）。 */
    this.gameState = GAME_STATE_TITLE;
    /** 今回の出題順に並べた具材。 */
    this.words = [];
    /** 今のお題が words の何番目か。 */
    this.wordIndex = 0;
    /** 今のお題に対して、ここまで正しく打てた文字。 */
    this.typedText = "";
    /** 残り時間（秒）。 */
    this.timeLeft = TIME_LIMIT;
    /** false になるとゲームループを抜ける。 */
    this.isRunning = true;
  }
}

// ---------------------------------------------------------------------------
// 状態の切り替え
// ---------------------------------------------------------------------------

/**
 * 配列の並びを、乱数でばらばらに混ぜる（Python の random.shuffle と同じ）。
 *
 * うしろから 1 つずつ、自分より前のどれかと入れかえていく。
 *
 * @param {string[]} items 混ぜる配列。この配列そのものを並べかえる。
 */
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * PLAYING に入るときに 1 回だけ呼ぶ開始処理。出題順を決め、数値を最初に戻す。
 *
 * @param {Game} game 初期化するゲームのデータ。
 */
function startPlaying(game) {
  // 毎回ちがう順番で出題するため、具材の並びを乱数で混ぜる
  game.words = [...INGREDIENTS];
  shuffle(game.words);

  // お題・入力・残り時間を最初に戻す
  game.wordIndex = 0;
  game.typedText = "";
  game.timeLeft = TIME_LIMIT;
}

/**
 * ゲームの状態を切り替え、新しい状態の開始処理を呼ぶ。
 *
 * 切り替えは必ずこの関数を通すので、開始処理のやり忘れが起きない。
 *
 * @param {Game} game 切り替えるゲームのデータ。
 * @param {string} nextState 次のゲームの状態。
 */
function changeState(game, nextState) {
  game.gameState = nextState;
  if (nextState === GAME_STATE_PLAYING) {
    startPlaying(game);
  }
}

// ---------------------------------------------------------------------------
// 更新
// ---------------------------------------------------------------------------

/**
 * TITLE の更新。Enter で開始、q で終了する。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {string} key このフレームで押されたキー。
 */
function updateTitle(game, key) {
  if (key === "enter") {
    changeState(game, GAME_STATE_PLAYING);
  } else if (key === "q") {
    game.isRunning = false;
  }
}

/**
 * PLAYING の更新。残り時間を減らし、打ったキーがお題の次の文字なら進める。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {string} key このフレームで押されたキー。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 */
function updatePlaying(game, key, deltaTime) {
  // 残り時間の判定
  // フレームの回数ではなく経過時間で減らすので、パソコンの速さが違っても 15 秒は 15 秒
  game.timeLeft -= deltaTime;
  if (game.timeLeft <= 0) {
    changeState(game, GAME_STATE_GAME_OVER);
    return;
  }

  // 入力の判定: 打ったキーが、お題の次の 1 文字と同じなら進める
  const word = game.words[game.wordIndex];
  const nextChar = word[game.typedText.length];
  if (key === nextChar) {
    game.typedText += key;
  }

  // お題の判定: 打ち終わったら次のお題へ。全部打ったらクリア
  if (game.typedText === word) {
    game.wordIndex += 1;
    game.typedText = "";
    if (game.wordIndex === game.words.length) {
      changeState(game, GAME_STATE_GAME_CLEAR);
    }
  }
}

/**
 * GAME_CLEAR と GAME_OVER の更新。r でタイトルに戻り、q で終了する。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {string} key このフレームで押されたキー。
 */
function updateResult(game, key) {
  if (key === "r") {
    changeState(game, GAME_STATE_TITLE);
  } else if (key === "q") {
    game.isRunning = false;
  }
}

/**
 * 今のゲームの状態に応じて、状態ごとの更新を呼び分ける。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {string} key このフレームで押されたキー。押されていなければ空文字。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 */
function update(game, key, deltaTime) {
  if (game.gameState === GAME_STATE_TITLE) {
    updateTitle(game, key);
  } else if (game.gameState === GAME_STATE_PLAYING) {
    updatePlaying(game, key, deltaTime);
  } else if (game.gameState === GAME_STATE_GAME_CLEAR || game.gameState === GAME_STATE_GAME_OVER) {
    updateResult(game, key);
  }
}

// ---------------------------------------------------------------------------
// 描画
// ---------------------------------------------------------------------------

/**
 * TITLE の画面を作る。
 *
 * @returns {string} 画面に出す文字列。
 */
function drawTitle() {
  return (
    "ランダムな順に出る具材を、全部打ってバーガーを完成させよう！\n" +
    `制限時間は ${TIME_LIMIT} 秒。\n` +
    "\n" +
    "Enter: スタート / q: 終了\n"
  );
}

/**
 * PLAYING の画面を作る。
 *
 * 最後の行を改行で終えないので、描いたあとのカーソルが入力の横に残る。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @returns {string} 画面に出す文字列。
 */
function drawPlaying(game) {
  return (
    `残り時間: ${game.timeLeft.toFixed(1)} 秒\n` +
    `具材: ${game.wordIndex + 1}/${game.words.length}\n` +
    "\n" +
    `お題: ${game.words[game.wordIndex]}\n` +
    `入力: ${game.typedText}`
  );
}

/**
 * GAME_CLEAR の画面を作る。打った具材を積んだバーガーを出す。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @returns {string} 画面に出す文字列。
 */
function drawGameClear(game) {
  // バーガー: 上のバンズ → 具材 → 下のバンズ の順に積む
  let screen = "  /~~~~~~~~~~\\\n";
  for (const word of game.words) {
    // 8 文字の幅のまん中に具材の名前を置く
    const centered = word.padStart(Math.floor((8 + word.length) / 2)).padEnd(8);
    screen += `  [ ${centered} ]\n`;
  }
  screen += "  \\__________/\n";

  // 結果
  screen += "\n";
  screen += "バーガー完成！ GAME CLEAR!\n";
  screen += `タイム: ${(TIME_LIMIT - game.timeLeft).toFixed(1)} 秒\n`;
  screen += "\n";
  screen += "r: タイトルへ / q: 終了\n";
  return screen;
}

/**
 * GAME_OVER の画面を作る。
 *
 * @returns {string} 画面に出す文字列。
 */
function drawGameOver() {
  return "時間切れ…… GAME OVER\n\nr: タイトルへ / q: 終了\n";
}

/**
 * 今のゲームの状態の画面を作り、見出しをつけて描き直す。
 *
 * @param {Game} game 表示するゲームのデータ。
 */
function draw(game) {
  // 状態毎の画面
  let screen;
  if (game.gameState === GAME_STATE_TITLE) {
    screen = drawTitle();
  } else if (game.gameState === GAME_STATE_PLAYING) {
    screen = drawPlaying(game);
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    screen = drawGameClear(game);
  } else {
    screen = drawGameOver();
  }

  // 描き直し: "\x1b[H" でカーソルを左上に戻し、"\x1b[J" で前の画面を消してから描く
  process.stdout.write("\x1b[H\x1b[J" + TITLE_BAR + screen);
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------

/** 時計つきのゲームループで、入力 → 更新 → 描画 をくり返す。 */
async function main() {
  // ゲーム全体のデータ
  const game = new Game();
  // 前の周の始まりの時刻（秒）
  let previousTime = performance.now() / 1000;

  // ゲームループ
  while (game.isRunning) {
    // 時間計算: 前の周から何秒たったかを測る
    const currentTime = performance.now() / 1000;
    const deltaTime = currentTime - previousTime;
    previousTime = currentTime;

    // 入力: 押されたキーを見る（押されていなければ空文字）
    const key = readKey();
    // 更新: 状態を更新する
    update(game, key, deltaTime);
    // 描画: 画面を描き直す
    draw(game);

    // フレームレート考慮: 処理が早く終わったら 1/FPS 秒になるまで待ち、1 秒に FPS 回へそろえる
    // 待っているあいだに、押されたキーが terminal_input.js にためられる
    const elapsedTime = performance.now() / 1000 - currentTime;
    await sleep(Math.max(0, 1 / FPS - elapsedTime) * 1000);
  }

  // キーを受け取り続けているので、ループを抜けたら自分でプログラムを終える
  process.exit();
}

main();
