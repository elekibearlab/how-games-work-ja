/**
 * ホーンテッド・テキストアドベンチャー 3D のモデル
 *
 * 屋敷（エントランス・古い部屋・2 階の廊下・出口）とおばけを、Cube（BoxGeometry）を組み合わせて作る。
 * ゲームの処理は持たず、見た目のモデルを作って返すだけにしている。
 */

import * as THREE from "three";

// 2 階の床の高さ。
export const UPPER_FLOOR = 4.0;

/**
 * Cube を 1 つ作って parent に足す。位置は「最小の角」と「最大の角」で指定する。
 *
 * @param {THREE.Object3D} parent 足す先。
 * @param {number[]} min 最小の角 [x, y, z]。
 * @param {number[]} max 最大の角 [x, y, z]。
 * @param {number} color 色。
 * @param {number} emissive 自分で光る色（光らないなら 0）。
 * @returns {THREE.Mesh} 作った Cube。
 */
function addBlock(parent, min, max, color, emissive = 0x000000) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive,
    roughness: 0.9,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  );
  parent.add(mesh);
  return mesh;
}

/**
 * Cube を 1 つ作る。位置は中心で指定する。
 *
 * @param {number} w 幅。
 * @param {number} h 高さ。
 * @param {number} d 奥行き。
 * @param {number} color 色。
 * @param {number} x 位置 x。
 * @param {number} y 位置 y。
 * @param {number} z 位置 z。
 * @param {number} emissive 自分で光る色（光らないなら 0）。
 * @returns {THREE.Mesh} 作った Cube。
 */
export function createBox(w, h, d, color, x, y, z, emissive = 0x000000) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive,
    roughness: 0.8,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * 燭台（ろうそくと灯り）を parent に置く。
 *
 * @param {THREE.Object3D} parent 置く先。
 * @param {number} x 位置 x。
 * @param {number} y 位置 y。
 * @param {number} z 位置 z。
 * @returns {THREE.PointLight} ろうそくの灯り。
 */
function addCandle(parent, x, y, z) {
  parent.add(createBox(0.3, 0.1, 0.3, 0x8a6a2a, x, y, z));
  parent.add(createBox(0.1, 0.3, 0.1, 0xf2ead8, x, y + 0.2, z));
  parent.add(createBox(0.06, 0.1, 0.06, 0xffb347, x, y + 0.4, z, 0xff8800));
  const light = new THREE.PointLight(0xff9a3c, 6, 9, 1.5);
  light.position.set(x, y + 0.6, z);
  parent.add(light);
  return light;
}

/**
 * 扉（ちょうつがいで回る板）を作って parent に足す。
 *
 * @param {THREE.Object3D} parent 足す先。
 * @param {number} x ちょうつがいの位置 x。
 * @param {number} y 床の高さ。
 * @param {number} z ちょうつがいの位置 z。
 * @param {number} width 扉の幅。
 * @param {"x"|"z"} direction 扉の板が伸びる向き。
 * @returns {THREE.Group} 回すための親（rotation.y で開く）。
 */
function addDoor(parent, x, y, z, width, direction) {
  const hinge = new THREE.Group();
  hinge.position.set(x, y, z);
  const isX = direction === "x";
  const panel = isX
    ? createBox(width, 2.8, 0.12, 0x4a2b17, width / 2, 1.4, 0)
    : createBox(0.12, 2.8, width, 0x4a2b17, 0, 1.4, -width / 2);
  hinge.add(panel);
  // 取っ手
  const knob = isX
    ? createBox(0.12, 0.12, 0.2, 0xd4af37, width - 0.25, 1.3, 0)
    : createBox(0.2, 0.12, 0.12, 0xd4af37, 0, 1.3, -width + 0.25);
  hinge.add(knob);
  parent.add(hinge);
  return hinge;
}

/**
 * おばけのモデルを作る。
 *
 * @returns {THREE.Group} おばけのモデル。
 */
export function createGhostModel() {
  const model = new THREE.Group();
  const white = 0xf4f0ff;
  const glow = 0x332a55;
  model.add(createBox(0.9, 0.8, 0.8, white, 0, 0.4, 0, glow));
  model.add(createBox(1.1, 0.7, 0.9, white, 0, -0.3, 0, glow));
  // すその ぎざぎざ
  for (let i = 0; i < 4; i++) {
    model.add(
      createBox(
        0.22,
        0.3,
        0.9,
        white,
        -0.4 + i * 0.27,
        -0.75 - (i % 2) * 0.1,
        0,
        glow,
      ),
    );
  }
  // 手
  model.add(createBox(0.4, 0.18, 0.18, white, -0.7, 0, 0.2, glow));
  model.add(createBox(0.4, 0.18, 0.18, white, 0.7, 0, 0.2, glow));
  // 目と口
  model.add(createBox(0.16, 0.24, 0.05, 0x000000, -0.2, 0.5, 0.42));
  model.add(createBox(0.16, 0.24, 0.05, 0x000000, 0.2, 0.5, 0.42));
  model.add(createBox(0.3, 0.14, 0.05, 0x330011, 0, 0.2, 0.42));
  return model;
}

/**
 * 屋敷をまるごと組み立てる。
 *
 * 演出で動かす扉・おばけ・灯りは、あとから触れるように一緒に返す。
 *
 * @returns {{
 *   model: THREE.Group,
 *   roomDoor: THREE.Group,
 *   sideDoor: THREE.Group,
 *   exitDoor: THREE.Group,
 *   hallCandles: THREE.PointLight[],
 *   roomGhost: THREE.Group,
 *   doorGhost: THREE.Group,
 *   exitLight: THREE.PointLight,
 * }} 屋敷のモデルと、動かす部品。
 */
export function buildMansion() {
  const mansion = new THREE.Group();

  // --- エントランス（x: -6〜6, z: -6〜6, 天井 8） ---
  const wallColor = 0x2b1f3a;
  const floorColor = 0x3a2416;
  addBlock(mansion, [-6, -0.2, -6], [6, 0, 6], floorColor);
  addBlock(mansion, [-6, 8, -6], [6, 8.2, 6], 0x1a1224);
  addBlock(mansion, [-6.2, 0, -6], [-6, 8, 6], wallColor);
  addBlock(mansion, [6, 0, -6], [6.2, 8, 6], wallColor);
  addBlock(mansion, [-6, 0, 6], [6, 8, 6.2], wallColor);
  // 奥の壁: 古い部屋の扉（x: -3.5〜-1.5）と、2 階の廊下の入口（x: 1.5〜4.5, y: 4〜7）をあける
  addBlock(mansion, [-6, 0, -6.2], [-3.5, 8, -6], wallColor);
  addBlock(mansion, [-3.5, 3, -6.2], [-1.5, 8, -6], wallColor);
  addBlock(mansion, [-1.5, 0, -6.2], [1.5, 8, -6], wallColor);
  addBlock(mansion, [1.5, 7, -6.2], [4.5, 8, -6], wallColor);
  addBlock(mansion, [4.5, 0, -6.2], [6, 8, -6], wallColor);
  addBlock(mansion, [1.5, 0, -6.2], [4.5, UPPER_FLOOR, -6], wallColor);
  // じゅうたん
  addBlock(mansion, [-1.2, 0, -5], [1.2, 0.02, 5], 0x6b1424);
  // 階段（x: 1.5〜4.5 を 8 段で 2 階へ）
  const STEP_COUNT = 8;
  for (let i = 0; i < STEP_COUNT; i++) {
    const top = ((i + 1) * UPPER_FLOOR) / STEP_COUNT;
    addBlock(
      mansion,
      [1.5, 0, 2 - (i + 1)],
      [4.5, top, 2 - i],
      i % 2 === 0 ? 0x5a3a22 : 0x4e321d,
    );
  }
  addBlock(
    mansion,
    [1.5, UPPER_FLOOR - 0.2, -6],
    [4.5, UPPER_FLOOR, -6],
    0x4e321d,
  );
  // 手すり
  addBlock(mansion, [1.3, 0, 1.8], [1.5, 1.2, 2], 0x2a1a0e);
  for (let i = 0; i < STEP_COUNT; i++) {
    const top = ((i + 1) * UPPER_FLOOR) / STEP_COUNT;
    addBlock(mansion, [1.4, top, 1.5 - i], [1.5, top + 0.9, 1.6 - i], 0x2a1a0e);
  }
  // 古い部屋の扉
  const roomDoor = addDoor(mansion, -3.5, 0, -6.1, 2, "x");
  // 額縁と燭台
  addBlock(mansion, [-1.2, 3.2, -5.95], [1.2, 5, -5.85], 0x8a6a2a);
  addBlock(mansion, [-1, 3.4, -5.88], [1, 4.8, -5.8], 0x1d2f2a);
  const hallCandles = [
    addCandle(mansion, -5, 1.2, -4),
    addCandle(mansion, -0.5, 1.2, 4.5),
    addCandle(mansion, 5, 1.2, 3),
  ];
  addBlock(mansion, [-5.4, 0, -4.4], [-4.6, 1.2, -3.6], 0x3d2a1a);
  addBlock(mansion, [-0.9, 0, 4.1], [-0.1, 1.2, 4.9], 0x3d2a1a);
  addBlock(mansion, [4.6, 0, 2.6], [5.4, 1.2, 3.4], 0x3d2a1a);

  // --- 古い部屋（x: -6〜0, z: -14〜-6, 天井 3.2） ---
  const roomWall = 0x3a1a1f;
  addBlock(mansion, [-6, -0.2, -14], [0, 0, -6], 0x2a1a12);
  addBlock(mansion, [-6, 3.2, -14], [0, 3.4, -6], 0x1a0e10);
  addBlock(mansion, [-6.2, 0, -14], [-6, 3.2, -6], roomWall);
  addBlock(mansion, [0, 0, -14], [0.2, 3.2, -6], roomWall);
  addBlock(mansion, [-6, 0, -14.2], [0, 3.2, -14], roomWall);
  // ぼろぼろの家具
  addBlock(mansion, [-5.6, 0, -13.6], [-4.2, 1.8, -13], 0x3b2615);
  addBlock(mansion, [-1.4, 0, -10], [-0.4, 0.8, -8.5], 0x3b2615);
  addCandle(mansion, -0.9, 0.8, -9.2);
  const roomGhost = createGhostModel();
  roomGhost.position.set(-3, 1.4, -12.5);
  mansion.add(roomGhost);

  // --- 2 階の廊下（x: 1.5〜4.5, z: -28〜-6, 天井 7） ---
  const corridorWall = 0x24203a;
  addBlock(
    mansion,
    [1.5, UPPER_FLOOR - 0.2, -28],
    [4.5, UPPER_FLOOR, -6],
    0x3a2416,
  );
  addBlock(
    mansion,
    [1.5, UPPER_FLOOR, -28],
    [4.5, UPPER_FLOOR + 0.02, -6],
    0x4a1630,
  );
  addBlock(mansion, [1.5, 7, -28], [4.5, 7.2, -6], 0x14101e);
  addBlock(mansion, [4.5, UPPER_FLOOR, -28], [4.7, 7, -6], corridorWall);
  // 左の壁: 横の扉（z: -17〜-15）をあける
  addBlock(mansion, [1.3, UPPER_FLOOR, -15], [1.5, 7, -6], corridorWall);
  addBlock(mansion, [1.3, UPPER_FLOOR + 3, -17], [1.5, 7, -15], corridorWall);
  addBlock(mansion, [1.3, UPPER_FLOOR, -28], [1.5, 7, -17], corridorWall);
  const sideDoor = addDoor(mansion, 1.4, UPPER_FLOOR, -15, 2, "z");
  // 横の扉の向こうの小部屋
  addBlock(
    mansion,
    [-1.5, UPPER_FLOOR - 0.2, -18],
    [1.3, UPPER_FLOOR, -14],
    0x2a1a12,
  );
  addBlock(mansion, [-1.7, UPPER_FLOOR, -18], [-1.5, 7, -14], roomWall);
  addBlock(mansion, [-1.5, UPPER_FLOOR, -18.2], [1.3, 7, -18], roomWall);
  addBlock(mansion, [-1.5, UPPER_FLOOR, -14], [1.3, 7, -13.8], roomWall);
  const doorGhost = createGhostModel();
  doorGhost.position.set(-0.5, UPPER_FLOOR + 1.4, -16);
  doorGhost.rotation.y = Math.PI / 2;
  mansion.add(doorGhost);
  // 廊下の灯り
  addCandle(mansion, 4.2, UPPER_FLOOR + 1.2, -10);
  addCandle(mansion, 4.2, UPPER_FLOOR + 1.2, -20);
  for (const z of [-10, -20]) {
    addBlock(
      mansion,
      [4.0, UPPER_FLOOR, z - 0.3],
      [4.5, UPPER_FLOOR + 1.2, z + 0.3],
      0x3d2a1a,
    );
  }
  // 奥の出口: 壁に扉の穴をあけ、外の光を置く
  addBlock(mansion, [1.5, UPPER_FLOOR, -28.2], [2.2, 7, -28], corridorWall);
  addBlock(mansion, [3.8, UPPER_FLOOR, -28.2], [4.5, 7, -28], corridorWall);
  addBlock(
    mansion,
    [2.2, UPPER_FLOOR + 2.8, -28.2],
    [3.8, 7, -28],
    corridorWall,
  );
  const exitDoor = addDoor(mansion, 2.2, UPPER_FLOOR, -28.1, 1.6, "x");
  const exitGlow = addBlock(
    mansion,
    [-4, UPPER_FLOOR - 4, -40],
    [10, UPPER_FLOOR + 8, -39.8],
    0xffffff,
    0xfff3c4,
  );
  exitGlow.material.fog = false;
  const exitLight = new THREE.PointLight(0xfff0c0, 4, 14, 1.2);
  exitLight.position.set(3, UPPER_FLOOR + 1.5, -29);
  mansion.add(exitLight);

  return {
    model: mansion,
    roomDoor,
    sideDoor,
    exitDoor,
    hallCandles,
    roomGhost,
    doorGhost,
    exitLight,
  };
}
