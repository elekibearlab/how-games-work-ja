/**
 * エレキシューティング 3D
 *
 * 上から降りてくる敵を、弾で撃ち落とすリアルタイムのシューティング。
 * 06_cli_games/03_eleki_shooting と同じ仕様を、Three.js の Cube で組んだモデルで描く。
 */

import * as THREE from "three";

import {
  createBoard,
  createBulletModel,
  createDebrisModel,
  createEnemyModel,
  createPlayerModel,
} from "./models.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

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
// 1 マスの 3D 空間での大きさ。
const CELL_SIZE = 1.0;

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
    /** 敵がいる行。なめらかに動かすため小数で持つ。 */
    this.y = y;
    /** 弾に当たると false になり、そのフレームの最後に消える。 */
    this.isAlive = true;
    /** 描画用のモデル。 */
    this.model = null;
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
    /** 描画用のモデル。 */
    this.model = null;
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
    /** このフレームで倒した敵の位置（描画の爆発演出に使う）。 */
    this.hitPositions = [];
    /** false になるとゲームループを抜ける。 */
    this.isRunning = true;
  }
}

// ---------------------------------------------------------------------------
// 入力
// ---------------------------------------------------------------------------

// 届いたキーをためておく列（terminal_input.js と同じ形）
const keyQueue = [];
window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  if (event.key === "Enter") {
    keyQueue.push("enter");
  } else if (event.key === " ") {
    event.preventDefault();
    keyQueue.push(" ");
  } else if (event.key.length === 1) {
    keyQueue.push(event.key.toLowerCase());
  }
});

/**
 * 押されたキーを 1 つ取り出す。押されていなければ待たずに空文字を返す。
 *
 * @returns {string} 押されたキー。
 */
function readKey() {
  return keyQueue.shift() ?? "";
}

// ---------------------------------------------------------------------------
// 3D の準備
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d1a);
scene.fog = new THREE.Fog(0x0b0d1a, 18, 40);

// カメラの縦の画角（度）
const CAMERA_FOV = 50;
const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 13, 11);
camera.lookAt(0, 0, 0.5);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
sunLight.position.set(5, 12, 6);
scene.add(sunLight);

// 縦長の画面（スマホの縦向き）でも、横はこの縦横比のときと同じ範囲を見せる
const MIN_ASPECT = 1.2;

/**
 * 画面の大きさに合わせて、描く大きさとカメラを直す。
 * 縦長の画面では左右が切れないように、横に見える範囲が MIN_ASPECT のときと同じになるまで画角を広げる。
 */
function fitScreen() {
  const aspect = window.innerWidth / window.innerHeight;
  const widen = Math.max(1, MIN_ASPECT / aspect);
  const halfFov = Math.atan(
    Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * widen,
  );
  camera.fov = THREE.MathUtils.radToDeg(halfFov * 2);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
fitScreen();
window.addEventListener("resize", fitScreen);

/**
 * マスの座標を 3D 空間の座標に変える。
 *
 * @param {number} x 列。
 * @param {number} y 行（小数でもよい）。
 * @returns {THREE.Vector3} 3D 空間の座標。
 */
function toWorld(x, y) {
  return new THREE.Vector3(
    (x - (WIDTH - 1) / 2) * CELL_SIZE,
    0,
    (y - (HEIGHT - 1) / 2) * CELL_SIZE,
  );
}

scene.add(createBoard(WIDTH, HEIGHT, PLAYER_ROW, CELL_SIZE));
const playerModel = createPlayerModel();
scene.add(playerModel);

// 撃破時に飛び散る小さな Cube（描画だけで使う）
const particles = [];

/**
 * 倒した場所に、飛び散る小さな Cube を出す。
 *
 * @param {THREE.Vector3} position 出す場所。
 */
function spawnParticles(position) {
  for (let i = 0; i < 14; i++) {
    const mesh = createDebrisModel(i % 2 === 1);
    mesh.position.copy(position);
    const velocity = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.8 + 0.3,
      Math.random() - 0.5,
    ).multiplyScalar(8);
    scene.add(mesh);
    particles.push({ mesh, velocity, life: 0.6 });
  }
}

// ---------------------------------------------------------------------------
// 状態の切り替え
// ---------------------------------------------------------------------------

/**
 * 敵と弾のモデルを、シーンからすべて外す。
 *
 * @param {Game} game ゲームのデータ。
 */
function removeAllModels(game) {
  for (const item of [...game.enemies, ...game.bullets]) {
    if (item.model) {
      scene.remove(item.model);
    }
  }
}

/**
 * PLAYING に入るときに 1 回だけ呼ぶ開始処理。
 * 自機・敵・弾・スコアを最初に戻す。
 *
 * @param {Game} game 初期化するゲームのデータ。
 */
function startPlaying(game) {
  removeAllModels(game);
  game.playerX = Math.floor(WIDTH / 2);
  game.enemies = [];
  game.bullets = [];
  game.score = 0;
  game.spawnTimer = SPAWN_INTERVAL;
}

/**
 * ゲームの状態を切り替え、新しい状態の開始処理を呼ぶ。
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
  // 移動: 速さは「1 秒あたりのマス数 × デルタタイム」
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
      if (
        bullet.isAlive &&
        enemy.isAlive &&
        bullet.x === enemy.x &&
        bullet.y <= enemy.y
      ) {
        bullet.isAlive = false;
        enemy.isAlive = false;
        game.score += 1;
        game.hitPositions.push(toWorld(enemy.x, enemy.y));
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
  game.hitPositions = [];
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

const hudElement = document.getElementById("hud");
const panelElement = document.getElementById("panel");

/**
 * 中央のパネルに文章を出す（空文字なら消す）。
 *
 * @param {string} title 見出し。
 * @param {string} text 本文。
 */
function drawPanel(title, text) {
  panelElement.innerHTML =
    title === "" ? "" : `<div><h1>${title}</h1>${text}</div>`;
}

/**
 * 敵・弾・自機のモデルを、データの位置に合わせて置く。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 * @param {number} time ループ開始からの秒数。
 */
function drawObjects(game, deltaTime, time) {
  // 自機: 目標の列へなめらかに寄せる
  const playerTarget = toWorld(game.playerX, PLAYER_ROW);
  playerModel.position.lerp(playerTarget, Math.min(1, deltaTime * 20));
  playerModel.position.y =
    game.gameState === GAME_STATE_GAME_OVER
      ? -0.3
      : Math.abs(Math.sin(time * 6)) * 0.08;
  playerModel.rotation.z = game.gameState === GAME_STATE_GAME_OVER ? 1.2 : 0;

  // 敵: 位置は小数の y をそのまま使い、なめらかに見せる
  const shownModels = new Set([playerModel]);
  for (const enemy of game.enemies) {
    if (!enemy.model) {
      enemy.model = createEnemyModel();
      scene.add(enemy.model);
    }
    enemy.model.position.copy(toWorld(enemy.x, enemy.y));
    enemy.model.position.y = Math.sin(time * 4 + enemy.x) * 0.1;
    shownModels.add(enemy.model);
  }
  // 弾
  for (const bullet of game.bullets) {
    if (!bullet.model) {
      bullet.model = createBulletModel();
      scene.add(bullet.model);
    }
    bullet.model.position.copy(toWorld(bullet.x, bullet.y));
    shownModels.add(bullet.model);
  }
  // データから消えた敵・弾のモデルを片付ける
  for (const child of [...scene.children]) {
    if (child.userData.isPiece && !shownModels.has(child)) {
      scene.remove(child);
    }
  }
  for (const model of shownModels) {
    model.userData.isPiece = model !== playerModel;
  }

  // 倒した場所に破片を出す
  for (const position of game.hitPositions) {
    spawnParticles(position);
  }
  for (const particle of particles) {
    particle.life -= deltaTime;
    particle.velocity.y -= 20 * deltaTime;
    particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
    particle.mesh.rotation.x += deltaTime * 8;
  }
  for (const particle of particles.filter((p) => p.life <= 0)) {
    scene.remove(particle.mesh);
  }
  particles.splice(0, particles.length, ...particles.filter((p) => p.life > 0));
}

/**
 * 今のゲームの状態の画面を作り、描き直す。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 * @param {number} time ループ開始からの秒数。
 */
function draw(game, deltaTime, time) {
  drawObjects(game, deltaTime, time);

  // 結果の画面では最後の盤面が見えるよう、パネルを上に寄せる
  const isResult =
    game.gameState === GAME_STATE_GAME_CLEAR ||
    game.gameState === GAME_STATE_GAME_OVER;
  // スマホではパネルが画面の幅いっぱいになり Back やスコアに重なるので、その下から始める
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const resultTop = isTouch
    ? hudElement.getBoundingClientRect().bottom + 16
    : 24;
  panelElement.style.alignItems = isResult ? "flex-start" : "center";
  panelElement.style.paddingTop = isResult ? `${resultTop}px` : "0";

  // 状態毎の文字
  if (game.gameState === GAME_STATE_TITLE) {
    hudElement.textContent = "";
    drawPanel(
      "ELEKI SHOOTING",
      "降りてくる敵 V を撃ち落とそう！\n" +
        `${GOAL_SCORE} 体倒せばクリア。敵に当たったらゲームオーバー。\n\n` +
        "a: 左 / d: 右 / Space: 弾を撃つ\n\n" +
        "Enter: スタート / q: 終了",
    );
  } else if (game.gameState === GAME_STATE_PLAYING) {
    hudElement.textContent = `SCORE: ${game.score}/${GOAL_SCORE}`;
    drawPanel("", "");
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    hudElement.textContent = `SCORE: ${game.score}/${GOAL_SCORE}`;
    drawPanel("GAME CLEAR!!", "r: タイトルへ / q: 終了");
  } else {
    hudElement.textContent = `SCORE: ${game.score}/${GOAL_SCORE}`;
    drawPanel("やられた…… GAME OVER", "r: タイトルへ / q: 終了");
  }

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------

/** 時計つきのゲームループで、入力 → 更新 → 描画 をくり返す。 */
function main() {
  // ゲーム全体のデータ
  const game = new Game();
  // 前の周の始まりの時刻（秒）
  let previousTime = performance.now() / 1000;
  const startTime = previousTime;

  /** 1 フレーム分の処理。ブラウザが画面を描くたびに呼ばれる。 */
  function loop() {
    // 時間計算: 前の周から何秒たったかを測る（タブ切り替えで大きくなりすぎないよう抑える）
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(0.1, currentTime - previousTime);
    previousTime = currentTime;

    // 入力 → 更新 → 描画
    const key = readKey();
    update(game, key, deltaTime);
    draw(game, deltaTime, currentTime - startTime);

    // 終了: ブラウザは閉じられないので、終了の表示を出してループを止める
    if (!game.isRunning) {
      hudElement.textContent = "";
      drawPanel("終了しました", "Back でメニューへ戻れます");
      return;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
