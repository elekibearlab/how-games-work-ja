/**
 * バーガー・タイピング 3D のモデル
 *
 * 皿・バンズ・具材を、Cube（BoxGeometry）を組み合わせて作る。
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
 * @returns {THREE.Mesh} 作った Cube。
 */
export function createBox(w, h, d, color, x, y, z) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * バンズのモデルを作る。
 *
 * @param {boolean} isTop 上のバンズなら true。
 * @returns {{model: THREE.Group, height: number}} モデルと厚み。
 */
export function createBunModel(isTop) {
  const model = new THREE.Group();
  const color = 0xd98a3a;
  if (isTop) {
    model.add(createBox(2.4, 0.35, 2.4, color, 0, 0.175, 0));
    model.add(createBox(2.0, 0.3, 2.0, color, 0, 0.5, 0));
    model.add(createBox(1.4, 0.2, 1.4, color, 0, 0.75, 0));
    // ゴマ
    const sesame = [
      [-0.6, 0.66, -0.3],
      [0.4, 0.66, 0.5],
      [0.1, 0.86, -0.2],
      [-0.3, 0.86, 0.35],
      [0.7, 0.66, -0.6],
    ];
    for (const [x, y, z] of sesame) {
      model.add(createBox(0.12, 0.06, 0.2, 0xfff6dc, x, y, z));
    }
    return { model, height: 0.85 };
  }
  model.add(createBox(2.4, 0.4, 2.4, color, 0, 0.2, 0));
  return { model, height: 0.4 };
}

/**
 * 具材のモデルを作る。
 *
 * @param {string} name 具材の名前。
 * @returns {{model: THREE.Group, height: number}} モデルと厚み。
 */
export function createIngredientModel(name) {
  const model = new THREE.Group();
  if (name === "cheese") {
    const slice = createBox(2.6, 0.12, 2.6, 0xffcc1a, 0, 0.06, 0);
    slice.rotation.y = Math.PI / 4;
    model.add(slice);
    return { model, height: 0.12 };
  }
  if (name === "bacon") {
    model.add(createBox(2.7, 0.1, 0.6, 0xa8442a, 0, 0.05, -0.45));
    model.add(createBox(2.7, 0.1, 0.6, 0xa8442a, 0.1, 0.12, 0.45));
    model.add(createBox(2.6, 0.11, 0.15, 0xf2c9b0, 0, 0.06, -0.45));
    model.add(createBox(2.6, 0.11, 0.15, 0xf2c9b0, 0.1, 0.13, 0.45));
    return { model, height: 0.18 };
  }
  if (name === "lettuce") {
    model.add(createBox(2.8, 0.12, 2.8, 0x5fbf3a, 0, 0.06, 0));
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const leaf = createBox(
        0.7,
        0.1,
        0.4,
        0x7ad94f,
        Math.cos(angle) * 1.45,
        0.08,
        Math.sin(angle) * 1.45,
      );
      leaf.rotation.y = -angle;
      leaf.rotation.z = 0.2;
      model.add(leaf);
    }
    return { model, height: 0.15 };
  }
  if (name === "tomato") {
    model.add(createBox(2.1, 0.22, 2.1, 0xe8322a, 0, 0.11, 0));
    model.add(createBox(1.2, 0.23, 1.2, 0xff7a5c, 0, 0.11, 0));
    return { model, height: 0.22 };
  }
  if (name === "onion") {
    model.add(createBox(2.2, 0.1, 2.2, 0xf3e6f7, 0, 0.05, 0));
    model.add(createBox(1.6, 0.11, 1.6, 0xd9b8e6, 0, 0.05, 0));
    model.add(createBox(1.1, 0.12, 1.1, 0xf3e6f7, 0, 0.05, 0));
    return { model, height: 0.12 };
  }
  // pickle
  const pickles = [
    [-0.6, -0.5],
    [0.6, -0.4],
    [0, 0.5],
    [-0.5, 0.6],
    [0.7, 0.6],
  ];
  for (const [x, z] of pickles) {
    model.add(createBox(0.6, 0.1, 0.6, 0x4f8a2a, x, 0.05, z));
    model.add(createBox(0.4, 0.11, 0.4, 0x9cc96b, x, 0.05, z));
  }
  return { model, height: 0.12 };
}

/**
 * 皿のモデルを作る。
 *
 * @returns {THREE.Group} 皿のモデル。
 */
export function createPlateModel() {
  const model = new THREE.Group();
  model.add(createBox(4.2, 0.15, 4.2, 0xffffff, 0, -0.075, 0));
  model.add(createBox(3.6, 0.16, 3.6, 0xe8eef5, 0, -0.07, 0));
  return model;
}
