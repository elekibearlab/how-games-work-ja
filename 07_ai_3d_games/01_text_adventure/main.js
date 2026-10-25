/**
 * ホーンテッド・テキストアドベンチャー 3D
 *
 * お化け屋敷から脱出する、選択肢で進むテキストアドベンチャー。
 * 06_cli_games/01_text_adventure と同じ仕様を、Three.js の Cube で組んだ屋敷で見せる。
 * 「ゲームの状態」と「場所の状態」を 2 つの変数で持ち、入力 → 更新 → 描画 をくり返す。
 */

import * as THREE from "three";

import { UPPER_FLOOR, buildMansion } from "./models.js";

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

// 選択肢のない場所で、次へ進むまで見せておく秒数。
const MOVE_WAIT_TIME = 2.0;
// 目の高さ。
const EYE_HEIGHT = 1.7;

// 場所ごとのカメラの位置と、見る先。
const CAMERA_VIEWS = {
  [LOCATION_HALL]: { position: [0, EYE_HEIGHT, 5], target: [0, 1.8, -6] },
  [LOCATION_ROOM]: {
    position: [-2.5, EYE_HEIGHT, -7.5],
    target: [-3, 1.4, -12],
  },
  [LOCATION_STAIRS]: { position: [3, 3.2, -1], target: [3, 5.2, -8] },
  [LOCATION_CORRIDOR]: {
    position: [3, UPPER_FLOOR + EYE_HEIGHT, -8],
    target: [3, UPPER_FLOOR + 1.5, -28],
  },
  [LOCATION_DOOR]: {
    position: [3, UPPER_FLOOR + EYE_HEIGHT, -16],
    target: [0, UPPER_FLOOR + 1.5, -16],
  },
  [LOCATION_EXIT]: {
    position: [3, UPPER_FLOOR + EYE_HEIGHT, -27],
    target: [3, UPPER_FLOOR + EYE_HEIGHT, -40],
  },
};

// ---------------------------------------------------------------------------
// 3D の準備
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050308);
scene.fog = new THREE.Fog(0x050308, 6, 26);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.05,
  100,
);
// カメラが今見ている先（補間して動かす）
const cameraTarget = new THREE.Vector3(...CAMERA_VIEWS[LOCATION_HALL].target);
camera.position.set(...CAMERA_VIEWS[LOCATION_HALL].position);

scene.add(new THREE.AmbientLight(0x8877aa, 0.35));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 屋敷（演出で動かす扉・おばけ・灯りは、部品として受け取る）
const {
  model: mansionModel,
  roomDoor,
  sideDoor,
  exitDoor,
  hallCandles,
  roomGhost,
  doorGhost,
  exitLight,
} = buildMansion();
scene.add(mansionModel);

// ---------------------------------------------------------------------------
// 入力
// ---------------------------------------------------------------------------

const logElement = document.getElementById("log");
const resultElement = document.getElementById("result");
const flashElement = document.getElementById("flash");

// 入力を待っているときに、届いたキーを渡す先
let resolveKey = null;
window.addEventListener("keydown", (event) => {
  if (resolveKey && (event.key.length === 1 || event.key === "Enter")) {
    resolveKey(event.key);
  }
});

/**
 * キーが 1 つ押されるまで待つ（画面の選択肢ボタンでも届く）。
 *
 * @returns {Promise<string>} 押されたキー。
 */
function waitKey() {
  return new Promise((resolve) => {
    resolveKey = (key) => {
      resolveKey = null;
      resolve(key);
    };
  });
}

/**
 * 指定した秒数だけ待つ。
 *
 * @param {number} seconds 待つ秒数。
 * @returns {Promise<void>} 待ち終わると解決する。
 */
function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * 選択肢のある場所なら、1 か 2 が入力されるまで待って番号を返す。
 *
 * 選択肢のない場所では、3D の移動を見せるため少し待ってから空文字を返す。
 *
 * @param {string} location 今いる場所。
 * @returns {Promise<string>} "1" または "2"。選択肢のない場所では空文字。
 */
async function readInput(location) {
  if (location !== LOCATION_HALL && location !== LOCATION_CORRIDOR) {
    await sleep(MOVE_WAIT_TIME);
    return "";
  }
  while (true) {
    const choice = (await waitKey()).trim();
    if (choice === "1" || choice === "2") {
      return choice;
    }
    writeLog("1 か 2 を入力してね。", "warn");
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
// 描画（文章）
// ---------------------------------------------------------------------------

/**
 * ログ欄に文章を 1 行足す。
 *
 * @param {string} text 足す文章（空文字なら空行）。
 * @param {string} className 見た目を変えるときのクラス名。
 */
function writeLog(text, className = "") {
  const line = document.createElement("div");
  line.textContent = text === "" ? " " : text;
  line.className = className;
  logElement.appendChild(line);
  logElement.scrollTop = logElement.scrollHeight;
}

/**
 * ログ欄に、クリックでも選べる選択肢のボタンを出す。
 *
 * @param {string[]} labels 1 番と 2 番の文言。
 */
function writeChoices(labels) {
  const box = document.createElement("div");
  box.id = "choices";
  labels.forEach((label, i) => {
    const button = document.createElement("button");
    button.textContent = `${i + 1}. ${label}`;
    button.addEventListener("click", () => {
      if (resolveKey) {
        resolveKey(String(i + 1));
      }
    });
    box.appendChild(button);
  });
  logElement.appendChild(box);
  logElement.scrollTop = logElement.scrollHeight;
}

/** 前に出した選択肢のボタンを消す（文章だけ残す）。 */
function removeChoices() {
  document.getElementById("choices")?.remove();
}

/** タイトルとあらすじを表示する。 */
function drawStory() {
  writeLog("=== ホーンテッド・テキストアドベンチャー ===", "story-title");
  writeLog("");
  writeLog("肝だめしで、町はずれの古い屋敷にやってきた。");
  writeLog("中に入ったとたん、うしろの扉がバタンと閉まった。もう開かない……。");
  writeLog("屋敷のどこかにある出口を探して、脱出しよう！");
}

/** HALL（エントランス）の文章と選択肢を表示する。 */
function drawHall() {
  writeLog("");
  writeLog("目の前に「古い部屋」と「階段」がある。");
  writeChoices(["部屋に入る", "階段を上る"]);
}

/** ROOM（古い部屋）の文章を表示する。 */
function drawRoom() {
  writeLog("");
  writeLog("部屋の奥から声がする。「こっちへおいで……」");
  writeLog("近づいた、その瞬間――うわぁぁぁぁ！！");
}

/** STAIRS（階段）の文章を表示する。 */
function drawStairs() {
  writeLog("");
  writeLog("階段を上ると、長い廊下に出た。");
  writeLog("奥へ進んでいく。");
}

/** CORRIDOR（廊下）の文章と選択肢を表示する。 */
function drawCorridor() {
  writeLog("");
  writeLog("奥に出口が見える。でも、横の扉から物音がする。");
  writeChoices(["横の扉を開ける", "出口へ走る"]);
}

/** 横の扉を開けたときの文章を表示する。 */
function drawDoor() {
  writeLog("");
  writeLog("ギィィ……「みーつけた」");
  writeLog("うわぁぁぁぁ！！");
}

/** 出口へ走ったときの文章を表示する。 */
function drawExit() {
  writeLog("");
  writeLog("出口へ走る！扉を開けると外の光が見えた。");
}

/** ゲームオーバーの表示をする。 */
function drawGameOver() {
  writeLog("");
  writeLog(
    "GAME OVER（Back でメニューへ。再読み込みでもう一度遊べます）",
    "warn",
  );
  resultElement.textContent = "GAME OVER";
  resultElement.style.color = "#ff3b3b";
  resultElement.style.textShadow = "0 0 24px #900";
}

/** ゲームクリアの表示をする。 */
function drawGameClear() {
  writeLog("");
  writeLog(
    "GAME CLEAR!（Back でメニューへ。再読み込みでもう一度遊べます）",
    "story-title",
  );
  resultElement.textContent = "GAME CLEAR!";
  resultElement.style.color = "#c9a3ff";
  resultElement.style.textShadow = "0 0 24px #fff";
}

// ---------------------------------------------------------------------------
// 描画（3D の演出）
// ---------------------------------------------------------------------------

// 今カメラが向かっている場所
let viewLocation = LOCATION_HALL;
// 今の場所に着いてからの秒数（演出のタイミングに使う）
let viewTime = 0;

/**
 * 3D のカメラを、場所に合わせて動かし始める。
 *
 * @param {string} location 今いる場所。
 */
function drawScene(location) {
  viewLocation = location;
  viewTime = 0;
}

/**
 * 毎フレーム、カメラと演出を動かして 3D を描く。
 *
 * @param {number} deltaTime 前のフレームから何秒たったか。
 * @param {number} time 開始からの秒数。
 */
function renderFrame(deltaTime, time) {
  viewTime += deltaTime;
  const view = CAMERA_VIEWS[viewLocation];

  // カメラ: 場所ごとの位置へ、なめらかに寄せる
  const follow = Math.min(1, deltaTime * 1.6);
  camera.position.lerp(new THREE.Vector3(...view.position), follow);
  cameraTarget.lerp(new THREE.Vector3(...view.target), follow);
  camera.lookAt(cameraTarget);

  // 灯りのゆらぎ
  hallCandles.forEach((light, i) => {
    light.intensity =
      5 + Math.sin(time * 9 + i * 2) * 0.8 + Math.random() * 0.5;
  });

  // おばけ: ふわふわ浮く
  roomGhost.position.y = 1.4 + Math.sin(time * 2) * 0.12;
  doorGhost.position.y = UPPER_FLOOR + 1.4 + Math.sin(time * 2 + 1) * 0.12;

  // 古い部屋: 扉が開き、近づいたところでおばけが飛び出す
  if (viewLocation === LOCATION_ROOM) {
    roomDoor.rotation.y = Math.max(-1.8, roomDoor.rotation.y - deltaTime * 3);
    if (viewTime > 2.2) {
      roomGhost.position.lerp(
        new THREE.Vector3(-2.5, EYE_HEIGHT - 0.1, -9.8),
        Math.min(1, deltaTime * 6),
      );
      roomGhost.scale.setScalar(Math.min(1.3, roomGhost.scale.x + deltaTime));
      flashElement.style.background = "#ff0000";
      flashElement.style.opacity = String(
        Math.max(0, 0.5 - (viewTime - 2.2) * 0.4),
      );
    }
  }

  // 横の扉: 着いたら扉が開き、おばけが出てくる
  if (viewLocation === LOCATION_DOOR && viewTime > 1.0) {
    sideDoor.rotation.y = Math.min(1.6, sideDoor.rotation.y + deltaTime * 1.5);
    if (viewTime > 2.0) {
      doorGhost.position.x = Math.min(
        1.3,
        doorGhost.position.x + deltaTime * 2,
      );
      doorGhost.scale.setScalar(
        Math.min(1.2, doorGhost.scale.x + deltaTime * 0.3),
      );
      flashElement.style.background = "#ff0000";
      flashElement.style.opacity = String(
        Math.max(0, 0.5 - (viewTime - 2.0) * 0.4),
      );
    }
  }

  // 出口: 扉が開き、外の光で白くなる
  if (viewLocation === LOCATION_EXIT) {
    exitDoor.rotation.y = Math.min(1.8, exitDoor.rotation.y + deltaTime * 2);
    exitLight.intensity = 4 + viewTime * 6;
    flashElement.style.background = "#fffbe8";
    flashElement.style.opacity = String(
      Math.min(0.75, Math.max(0, (viewTime - 1.5) * 0.4)),
    );
  }

  renderer.render(scene, camera);
}

/**
 * 今いる場所の文章を表示する。ゲームが終わっていれば結果も表示する。
 *
 * @param {string} location 今いる場所。
 * @param {string} gameState 今のゲームの状態。
 */
function draw(location, gameState) {
  removeChoices();
  drawScene(location);

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

/** 3D は入力を待っているあいだも動かしたいので、ゲームループとは別に毎フレーム描く。 */
function startRenderLoop() {
  let previousTime = performance.now() / 1000;
  const startTime = previousTime;
  function loop() {
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(0.1, currentTime - previousTime);
    previousTime = currentTime;
    renderFrame(deltaTime, currentTime - startTime);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/** ゲームの状態がプレイ中のあいだ、入力 → 更新 → 描画 をくり返す。 */
async function main() {
  // ゲームの状態（GAME_STATE_XXX のどれか）
  let gameState = GAME_STATE_PLAYING;
  // 場所の状態（LOCATION_XXX のどれか）
  let location = LOCATION_HALL;

  startRenderLoop();

  // ゲーム開始時の表示
  drawStory();
  draw(location, gameState);
  // 文章が長くてログ欄からあふれるので、始めはタイトルから読めるようにいちばん上を見せる
  logElement.scrollTop = 0;

  // ゲームループ
  while (gameState === GAME_STATE_PLAYING) {
    // 入力: 入力を見る
    const choice = await readInput(location);
    // 更新: 状態を更新する
    [location, gameState] = update(location, choice);
    // 表示: 結果を表示する
    draw(location, gameState);
  }
}

main();
