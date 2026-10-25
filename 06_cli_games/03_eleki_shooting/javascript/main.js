/**
 * エレキシューティング
 *
 * 上から降りてくる敵を、弾で撃ち落とすリアルタイムのシューティング。
 * ゲームループ・デルタタイム・待たない入力・ゲームの状態・乱数の、
 * これまでの仕組みを全部使っている。
 */

import { setTimeout as sleep } from "node:timers/promises";

import { readKey } from "./terminal_input.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

// 1 秒間にゲームループを回す回数。
const FPS = 30;
// 盤面の横のマス数。
const WIDTH = 15;
// 盤面の縦のマス数。
const HEIGHT = 12;
// 自機がいる行（いちばん下の行）。
const PLAYER_ROW = HEIGHT - 1;
// クリアに必要な、倒す敵の数。
const GOAL_SCORE = 10;
// 敵が 1 秒間に進むマス数。
const ENEMY_SPEED = 2.0;
// 弾が 1 秒間に進むマス数。
const BULLET_SPEED = 15.0;
// 敵が出てくる間隔（秒）。
const SPAWN_INTERVAL = 1.0;
// どの画面にも、いちばん上に出す見出し。
const TITLE_BAR = "=== ELEKI SHOOTING ===\n\n";

// ゲームの状態: タイトル画面。
const GAME_STATE_TITLE = "title";
// ゲームの状態: プレイ中。
const GAME_STATE_PLAYING = "playing";
// ゲームの状態: ゲームクリア。
const GAME_STATE_GAME_CLEAR = "game_clear";
// ゲームの状態: ゲームオーバー。
const GAME_STATE_GAME_OVER = "game_over";

/** 敵 1 体のデータ。 */
class Enemy {
  /**
   * @param {number} x 敵がいる列。
   * @param {number} y 敵がいる行。
   */
  constructor(x, y) {
    /** 敵がいる列。 */
    this.x = x;
    /** 敵がいる行。なめらかに動かすため小数で持ち、描くときだけ整数にする。 */
    this.y = y;
    /** 弾に当たると false になり、そのフレームの最後に消える。 */
    this.isAlive = true;
  }
}

/** 弾 1 発のデータ。 */
class Bullet {
  /**
   * @param {number} x 弾がある列。
   * @param {number} y 弾がある行。
   */
  constructor(x, y) {
    /** 弾がある列。 */
    this.x = x;
    /** 弾がある行。敵と同じく小数で持つ。 */
    this.y = y;
    /** 敵に当たると false になり、そのフレームの最後に消える。 */
    this.isAlive = true;
  }
}

/** ゲーム全体のデータ。 */
class Game {
  constructor() {
    /** 今のゲームの状態（GAME_STATE_XXX のどれか）。 */
    this.gameState = GAME_STATE_TITLE;
    /** 自機がいる列。 */
    this.playerX = Math.floor(WIDTH / 2);
    /** 画面にいる敵。 */
    this.enemies = [];
    /** 画面にある弾。 */
    this.bullets = [];
    /** 倒した敵の数。 */
    this.score = 0;
    /** 次の敵が出るまでの残り秒数。 */
    this.spawnTimer = SPAWN_INTERVAL;
    /** false になるとゲームループを抜ける。 */
    this.isRunning = true;
  }
}

// ---------------------------------------------------------------------------
// 状態の切り替え
// ---------------------------------------------------------------------------

/**
 * PLAYING に入るときに 1 回だけ呼ぶ開始処理。
 * 自機・敵・弾・スコアを最初に戻す。
 *
 * @param {Game} game 初期化するゲームのデータ。
 */
function startPlaying(game) {
  game.playerX = Math.floor(WIDTH / 2);
  game.enemies = [];
  game.bullets = [];
  game.score = 0;
  game.spawnTimer = SPAWN_INTERVAL;
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
// 更新（プレイ中オブジェクト）
// ---------------------------------------------------------------------------

/**
 * 押されたキーで、自機を左右に動かすか弾を撃つ。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {string} key このフレームで押されたキー。
 */
function updatePlayer(game, key) {
  // 入力キーに応じて移動・攻撃を行う
  if (key === "a") {
    game.playerX = Math.max(0, game.playerX - 1);
  } else if (key === "d") {
    game.playerX = Math.min(WIDTH - 1, game.playerX + 1);
  } else if (key === " ") {
    game.bullets.push(new Bullet(game.playerX, PLAYER_ROW - 1));
  }
}

/**
 * 弾を上へ進め、画面の上から出た弾を消す。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 */
function updateBullets(game, deltaTime) {
  // 移動: 速さは「1 秒あたりのマス数 × デルタタイム」。FPS が変わっても同じ速さで動く
  for (const bullet of game.bullets) {
    bullet.y -= BULLET_SPEED * deltaTime;
  }

  // 画面の上から出た弾を消す
  game.bullets = game.bullets.filter((bullet) => bullet.y >= 0);
}

/**
 * 敵を出して下へ進め、画面の下から出た敵を消す。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 */
function updateEnemies(game, deltaTime) {
  // 出現: タイマーが 0 になったら、ランダムな列に敵を 1 体出す
  // 列は 0 〜 WIDTH - 1 のどれか（Python の random.randrange(WIDTH) と同じ）
  game.spawnTimer -= deltaTime;
  if (game.spawnTimer <= 0) {
    game.enemies.push(new Enemy(Math.floor(Math.random() * WIDTH), 0));
    game.spawnTimer = SPAWN_INTERVAL;
  }

  // 移動: 弾と同じく「1 秒あたりのマス数 × デルタタイム」で進める
  for (const enemy of game.enemies) {
    enemy.y += ENEMY_SPEED * deltaTime;
  }

  // 画面の下から出た敵を消す
  game.enemies = game.enemies.filter((enemy) => enemy.y < HEIGHT);
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
 * 弾と敵の当たりを調べ、当たった弾と敵を消してスコアを増やす。
 *
 * @param {Game} game 更新するゲームのデータ。
 */
function hitBulletsAndEnemies(game) {
  // 当たり: 回している途中で消すと次に調べる要素がずれるので、まずは印を付けるだけ
  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      // 同じマスかではなく「同じ列で、弾が敵の位置を越えたか」で見る
      // 速い弾が 1 フレームで何マスも進んでも、敵をすり抜けない
      if (
        bullet.isAlive &&
        enemy.isAlive &&
        bullet.x === enemy.x &&
        bullet.y <= enemy.y
      ) {
        bullet.isAlive = false;
        enemy.isAlive = false;
        game.score += 1;
      }
    }
  }

  // 印の付いた弾と敵を、最後にまとめて消す
  game.bullets = game.bullets.filter((bullet) => bullet.isAlive);
  game.enemies = game.enemies.filter((enemy) => enemy.isAlive);
}

/**
 * 自機が敵に当たったかを調べる。
 *
 * @param {Game} game 調べるゲームのデータ。
 * @returns {boolean} 自機と同じマスに敵がいれば true。
 */
function isPlayerHit(game) {
  for (const enemy of game.enemies) {
    if (enemy.x === game.playerX && Math.floor(enemy.y) === PLAYER_ROW) {
      return true;
    }
  }
  return false;
}

/**
 * PLAYING の更新。自機・弾・敵を動かし、クリアとゲームオーバーを判別する。
 *
 * @param {Game} game 更新するゲームのデータ。
 * @param {string} key このフレームで押されたキー。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 */
function updatePlaying(game, key, deltaTime) {
  // 自機・弾・敵の更新
  updatePlayer(game, key);
  updateBullets(game, deltaTime);
  updateEnemies(game, deltaTime);

  // 当たり判定
  hitBulletsAndEnemies(game);

  // ゲーム状態の判定
  if (game.score >= GOAL_SCORE) {
    changeState(game, GAME_STATE_GAME_CLEAR);
  } else if (isPlayerHit(game)) {
    changeState(game, GAME_STATE_GAME_OVER);
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
  } else if (
    game.gameState === GAME_STATE_GAME_CLEAR ||
    game.gameState === GAME_STATE_GAME_OVER
  ) {
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
    "降りてくる敵 V を撃ち落とそう！\n" +
    `${GOAL_SCORE} 体倒せばクリア。敵に当たったらゲームオーバー。\n` +
    "\n" +
    "a: 左 / d: 右 / Space: 弾を撃つ\n" +
    "\n" +
    "Enter: スタート / q: 終了\n"
  );
}

/**
 * PLAYING の画面を作る。盤面を文字のマス目で描く。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @returns {string} 画面に出す文字列。
 */
function drawPlaying(game) {
  // 盤面: 空きマス "." の上に、敵 → 弾 → 自機 の順に置く
  const grid = [];
  // 空きマス
  for (let y = 0; y < HEIGHT; y++) {
    grid.push(Array(WIDTH).fill("."));
  }
  // 敵
  for (const enemy of game.enemies) {
    grid[Math.floor(enemy.y)][enemy.x] = "V";
  }
  // 弾
  for (const bullet of game.bullets) {
    grid[Math.floor(bullet.y)][bullet.x] = "ϟ";
  }
  // 自機
  grid[PLAYER_ROW][game.playerX] = "A";

  // 画面: スコアの下に盤面を 1 行ずつ並べる
  let screen = `SCORE: ${game.score}/${GOAL_SCORE}\n`;
  for (const row of grid) {
    screen += row.join("") + "\n";
  }
  return screen;
}

/**
 * GAME_CLEAR と GAME_OVER の画面を作る。最後の盤面の下にメッセージを出す。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @param {string} message 盤面の下に出す結果のメッセージ。
 * @returns {string} 画面に出す文字列。
 */
function drawResult(game, message) {
  let screen = drawPlaying(game);
  screen += `\n${message}\n`;
  screen += "r: タイトルへ / q: 終了\n";
  return screen;
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
    screen = drawResult(game, "GAME CLEAR!!");
  } else {
    screen = drawResult(game, "やられた…… GAME OVER");
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
