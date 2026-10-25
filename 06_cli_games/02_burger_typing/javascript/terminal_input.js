/**
 * Enter を待たずにキーを読むための補助
 *
 * Node.js では、押されたキーは「キーが届いたら呼ばれる関数」に届く。
 * 届いたキーをいったん順番にためておき、ゲームは毎フレーム readKey() で 1 つずつ取り出す。
 * ためたキーがなければ、空文字を返して先へ進む。
 *
 * 使い方:
 *   import { readKey } from "./terminal_input.js";
 *
 *   const key = readKey(); // 毎フレーム呼ぶ
 *
 * 端末の準備は import したときに行い、元に戻すのはプログラムの終了時に自動で行う。
 */

// ---------------------------------------------------------------------------
// 端末の準備
// ---------------------------------------------------------------------------

// 押されたけれど、まだ readKey() で取り出していないキー
const pressedKeys = [];

// Enter を待たずに 1 文字ずつ届くよう端末の設定を変え、終了時に元へ戻す
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.on("exit", () => process.stdin.setRawMode(false));

// キーが届いたら、1 文字ずつに分けてためておく
process.stdin.on("data", (text) => {
  for (const key of text) {
    // Ctrl+C: この読み方では文字として届くので、自分で終了する
    if (key === "\x03") {
      console.log("\n終了しました。");
      process.exit();
    }
    pressedKeys.push(key);
  }
});

// ---------------------------------------------------------------------------
// 入力
// ---------------------------------------------------------------------------

/**
 * 押されたキーを返す。押されていなければ待たずに空文字を返す。
 *
 * @returns {string} 押されたキーの文字。Enter は "enter"。押されていなければ空文字。
 */
export function readKey() {
  // ためたキーがなければ空文字
  if (pressedKeys.length === 0) {
    return "";
  }
  const key = pressedKeys.shift();

  // Enter は OS によって "\r" と "\n" のどちらかで届くので、名前をそろえる
  if (key === "\r" || key === "\n") {
    return "enter";
  }
  return key;
}
