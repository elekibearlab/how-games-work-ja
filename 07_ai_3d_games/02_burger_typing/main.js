/**
 * バーガー・タイピング 3D
 *
 * ランダムな順に出るハンバーガーの具材を、制限時間内に全部打ってバーガーを完成させる。
 * 06_cli_games/02_burger_typing と同じ仕様を、Three.js の Cube で組んだモデルで描く。
 */

import * as THREE from "three";

import {
  createBunModel,
  createIngredientModel,
  createPlateModel,
} from "./models.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

// 制限時間（秒）。スマホは画面のキーボードで打ちにくいので長くする
const TIME_LIMIT = window.matchMedia("(pointer: coarse)").matches ? 30.0 : 15.0;
// 出題する具材。
const INGREDIENTS = ["cheese", "bacon", "lettuce", "tomato", "onion", "pickle"];
// 具材が落ちてくる高さ。
const DROP_HEIGHT = 6.0;

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
// 入力
// ---------------------------------------------------------------------------

// 届いたキーをためておく列（terminal_input.js と同じ形）
const keyQueue = [];
window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    keyQueue.push("enter");
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
scene.background = new THREE.Color(0xffe9c7);

// カメラの縦の画角（度）
const CAMERA_FOV = 45;
const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
sunLight.position.set(4, 10, 6);
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

// 皿
scene.add(createPlateModel());

// 下のバンズ（ずっと置いておく）
const bottomBun = createBunModel(false);
scene.add(bottomBun.model);

// 積んだ具材・上のバンズ（描画だけで使う）
const stack = [];
// 横で回る見本の具材
let sampleModel = null;
let sampleName = "";

/**
 * 積んだ具材と上のバンズを、すべて片付ける。
 */
function clearStack() {
  for (const piece of stack) {
    scene.remove(piece.model);
  }
  stack.length = 0;
}

/**
 * 具材を 1 つ、上から落として積む。
 *
 * @param {{model: THREE.Group, height: number}} piece 積む具材。
 */
function dropPiece(piece) {
  const top =
    stack.length === 0
      ? bottomBun.height
      : stack[stack.length - 1].baseY + stack[stack.length - 1].height;
  piece.baseY = top;
  piece.model.position.y = top + DROP_HEIGHT;
  piece.model.rotation.y = (Math.random() - 0.5) * 0.5;
  piece.fallSpeed = 0;
  scene.add(piece.model);
  stack.push(piece);
}

// ---------------------------------------------------------------------------
// 状態の切り替え
// ---------------------------------------------------------------------------

/**
 * 配列の並びを、乱数でばらばらに混ぜる（Python の random.shuffle と同じ）。
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
const wordElement = document.getElementById("word");
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
 * 積んだ具材の数を、打ち終えたお題の数に合わせる（データは変えず、見た目だけ追いつかせる）。
 *
 * @param {Game} game 表示するゲームのデータ。
 */
function syncStack(game) {
  // 何を積むべきか: タイトルでは何も、プレイ中は打ち終えた具材、クリアなら上のバンズまで
  let wanted = [];
  if (game.gameState === GAME_STATE_PLAYING) {
    wanted = game.words.slice(0, game.wordIndex);
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    wanted = [...game.words, "top_bun"];
  } else if (game.gameState === GAME_STATE_GAME_OVER) {
    wanted = stack.map((piece) => piece.name);
  }

  // 中身が食い違ったら作り直す（新しいゲームが始まったとき）
  const isSamePrefix = stack.every((piece, i) => piece.name === wanted[i]);
  if (!isSamePrefix) {
    clearStack();
  }
  while (stack.length < wanted.length) {
    const name = wanted[stack.length];
    const piece =
      name === "top_bun" ? createBunModel(true) : createIngredientModel(name);
    piece.name = name;
    dropPiece(piece);
  }
}

/**
 * 3D のモデルを動かす。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 * @param {number} time ループ開始からの秒数。
 */
function drawModels(game, deltaTime, time) {
  syncStack(game);

  // 落下: 自分の置き場所まで落ちたら止まる
  for (const piece of stack) {
    piece.fallSpeed += 30 * deltaTime;
    piece.model.position.y = Math.max(
      piece.baseY,
      piece.model.position.y - piece.fallSpeed * deltaTime,
    );
  }

  // ゲームオーバー: 積んだ具材が崩れて傾く
  if (game.gameState === GAME_STATE_GAME_OVER) {
    stack.forEach((piece, i) => {
      piece.model.rotation.z = Math.min(
        0.5,
        piece.model.rotation.z + deltaTime * (0.2 + i * 0.15),
      );
      piece.model.position.x = Math.min(
        i * 0.6,
        piece.model.position.x + deltaTime * (i + 1),
      );
    });
  } else {
    for (const piece of stack) {
      piece.model.rotation.z = 0;
      piece.model.position.x = 0;
    }
  }

  // 見本: 今のお題の具材を、横でくるくる回して見せる
  const name =
    game.gameState === GAME_STATE_PLAYING ? game.words[game.wordIndex] : "";
  if (name !== sampleName) {
    if (sampleModel) {
      scene.remove(sampleModel);
      sampleModel = null;
    }
    if (name !== "") {
      sampleModel = createIngredientModel(name).model;
      sampleModel.scale.setScalar(0.6);
      scene.add(sampleModel);
    }
    sampleName = name;
  }
  if (sampleModel) {
    sampleModel.position.set(3.4, 2.2 + Math.sin(time * 3) * 0.15, 0);
    sampleModel.rotation.set(0.5, time * 1.5, 0);
  }

  // カメラ: クリアしたらバーガーのまわりを回る
  if (game.gameState === GAME_STATE_GAME_CLEAR) {
    const angle = time * 0.6;
    camera.position.set(Math.sin(angle) * 8, 4.5, Math.cos(angle) * 8);
  } else {
    camera.position.set(0, 4.5, 8.5);
  }
  camera.lookAt(game.gameState === GAME_STATE_GAME_CLEAR ? 0 : 1, 1.4, 0);
}

/**
 * 今のゲームの状態の画面を作り、描き直す。
 *
 * @param {Game} game 表示するゲームのデータ。
 * @param {number} deltaTime 前のフレームから何秒たったか。
 * @param {number} time ループ開始からの秒数。
 */
function draw(game, deltaTime, time) {
  drawModels(game, deltaTime, time);

  // 結果の画面ではバーガーが見えるよう、パネルを上に寄せる
  const isResult =
    game.gameState === GAME_STATE_GAME_CLEAR ||
    game.gameState === GAME_STATE_GAME_OVER;
  // スマホではパネルが画面の幅いっぱいになり Back や残り時間に重なるので、その下から始める
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const resultTop = isTouch
    ? hudElement.getBoundingClientRect().bottom + 16
    : 24;
  panelElement.style.alignItems = isResult ? "flex-start" : "center";
  panelElement.style.paddingTop = isResult ? `${resultTop}px` : "0";

  // 状態毎の文字
  if (game.gameState === GAME_STATE_TITLE) {
    hudElement.textContent = "";
    wordElement.innerHTML = "";
    drawPanel(
      "BURGER TYPING",
      "ランダムな順に出る具材を、全部打ってバーガーを完成させよう！\n" +
        `制限時間は ${TIME_LIMIT.toFixed(1)} 秒。\n\n` +
        "Enter: スタート / q: 終了",
    );
  } else if (game.gameState === GAME_STATE_PLAYING) {
    const word = game.words[game.wordIndex];
    hudElement.innerText = `残り時間: ${game.timeLeft.toFixed(1)} 秒\n具材: ${game.wordIndex + 1}/${game.words.length}`;
    wordElement.innerHTML = `<span class="typed">${game.typedText}</span><span class="rest">${word.slice(game.typedText.length)}</span>`;
    drawPanel("", "");
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    hudElement.textContent = "";
    wordElement.innerHTML = "";
    drawPanel(
      "バーガー完成！ GAME CLEAR!",
      `${game.words.join(" / ")}\n` +
        `タイム: ${(TIME_LIMIT - game.timeLeft).toFixed(1)} 秒\n\n` +
        "r: タイトルへ / q: 終了",
    );
  } else {
    hudElement.textContent = "";
    wordElement.innerHTML = "";
    drawPanel("時間切れ…… GAME OVER", "r: タイトルへ / q: 終了");
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
      wordElement.innerHTML = "";
      drawPanel("終了しました", "Back でメニューへ戻れます");
      return;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
