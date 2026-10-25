/**
 * エレキシューティング 3D のモデル
 *
 * 盤面・自機・敵・弾・破片を、Cube（BoxGeometry）を組み合わせて作る。
 * ゲームの処理は持たず、見た目のモデルを作って返すだけにしている。
 */

import * as THREE from "three";

/**
 * Cube を 1 つ作る。
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
  const material = new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * 盤面（マス目の床）を作る。まん中が原点になるように並べる。
 *
 * @param {number} width 横のマス数。
 * @param {number} height 縦のマス数。
 * @param {number} laneRow 色を変えて目印にする行（自機がいる行）。
 * @param {number} cellSize 1 マスの大きさ。
 * @returns {THREE.Group} 盤面のモデル。
 */
export function createBoard(width, height, laneRow, cellSize) {
  const board = new THREE.Group();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = (x + y) % 2 === 0 ? 0x1c2140 : 0x232850;
      const tileX = (x - (width - 1) / 2) * cellSize;
      const tileZ = (y - (height - 1) / 2) * cellSize;
      board.add(createBox(cellSize * 0.96, 0.1, cellSize * 0.96, color, tileX, -0.55, tileZ));
    }
  }
  // 自機の行だけ少し色を変えて目印にする
  const laneZ = (laneRow - (height - 1) / 2) * cellSize;
  board.add(createBox(width * cellSize, 0.02, cellSize * 0.96, 0x2e7dff, 0, -0.49, laneZ, 0x0a2a60));
  return board;
}

/**
 * 自機（クマ型ロボ）のモデルを作る。
 *
 * @returns {THREE.Group} 自機のモデル。
 */
export function createPlayerModel() {
  const model = new THREE.Group();
  const bodyColor = 0xffc23d;
  model.add(createBox(0.7, 0.5, 0.5, bodyColor, 0, -0.2, 0));
  model.add(createBox(0.6, 0.45, 0.45, bodyColor, 0, 0.3, 0));
  model.add(createBox(0.18, 0.18, 0.12, bodyColor, -0.24, 0.6, 0));
  model.add(createBox(0.18, 0.18, 0.12, bodyColor, 0.24, 0.6, 0));
  model.add(createBox(0.1, 0.1, 0.05, 0x1a1a1a, -0.13, 0.36, -0.23));
  model.add(createBox(0.1, 0.1, 0.05, 0x1a1a1a, 0.13, 0.36, -0.23));
  model.add(createBox(0.22, 0.12, 0.05, 0xfff1c7, 0, 0.22, -0.23));
  // 背中の雷マーク
  model.add(createBox(0.12, 0.3, 0.05, 0xfff35a, 0, -0.18, 0.27, 0x806000));
  return model;
}

/**
 * 敵（V 字の機体）のモデルを作る。
 *
 * @returns {THREE.Group} 敵のモデル。
 */
export function createEnemyModel() {
  const model = new THREE.Group();
  const color = 0xa24dff;
  const left = createBox(0.2, 0.25, 0.8, color, -0.22, 0, 0);
  left.rotation.y = -0.45;
  const right = createBox(0.2, 0.25, 0.8, color, 0.22, 0, 0);
  right.rotation.y = 0.45;
  model.add(left, right);
  model.add(createBox(0.3, 0.3, 0.3, 0x5d1fa8, 0, 0, 0.3));
  model.add(createBox(0.12, 0.12, 0.05, 0xff3366, 0, 0.05, 0.47, 0x991133));
  return model;
}

/**
 * 弾（稲妻）のモデルを作る。
 *
 * @returns {THREE.Group} 弾のモデル。
 */
export function createBulletModel() {
  const model = new THREE.Group();
  const color = 0xfff35a;
  const glow = 0xffd000;
  const parts = [
    [0.06, -0.2, 0.5],
    [-0.06, 0.0, -0.5],
    [0.06, 0.2, 0.5],
  ];
  for (const [x, z, rotation] of parts) {
    const part = createBox(0.1, 0.1, 0.26, color, x, 0, z, glow);
    part.rotation.y = rotation;
    model.add(part);
  }
  return model;
}

/**
 * 敵を倒したときに飛び散る、小さな破片を 1 つ作る。
 *
 * @param {boolean} isSpark 雷色の光る破片なら true、敵の色の破片なら false。
 * @returns {THREE.Mesh} 破片のモデル。
 */
export function createDebrisModel(isSpark) {
  if (isSpark) {
    return createBox(0.15, 0.15, 0.15, 0xfff35a, 0, 0, 0, 0x806000);
  }
  return createBox(0.15, 0.15, 0.15, 0xa24dff, 0, 0, 0);
}
