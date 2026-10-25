/**
 * スマホなど、キーボードの無い端末で遊ぶための画面のボタン。
 *
 * ゲーム（main.js）は window の keydown だけを読んでいるので、
 * ボタンからも同じ keydown を送れば、ゲームの中身を変えずにタッチで遊べる。
 * タッチで操作する端末でだけ出し、PC では何も足さない。
 */

/**
 * キーが押されたことにして、ゲームに keydown を送る。
 *
 * @param {string} key 送るキー（"Enter"・" "・"a" など）。
 */
function sendKey(key) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

/**
 * 文字を打つための入力欄を作る。タップするとスマホのキーボードが出る。
 * スマホのキーボードは keydown で文字を教えてくれないことがあるので、入力欄に入った文字を送る。
 *
 * @returns {HTMLInputElement} 入力欄。
 */
function createTypingInput() {
  const input = document.createElement("input");
  input.placeholder = "タップして入力";
  input.autocomplete = "off";
  input.setAttribute("autocapitalize", "none");

  input.addEventListener("input", () => {
    for (const character of input.value) {
      sendKey(character);
    }
    input.value = "";
  });
  input.addEventListener("keydown", (event) => {
    // 本物の keydown がゲームにも届くと、上で送る分と二重になるので止める
    event.stopPropagation();
    if (event.key === "Enter") {
      sendKey("Enter");
    }
  });
  input.addEventListener("blur", () => {
    // iPhone ではキーボードを出すとページが上にずれ、閉じたあともずれたまま残るので元に戻す
    window.scrollTo(0, 0);
  });
  return input;
}

/**
 * 画面の下にボタンを並べる。タッチで操作する端末でなければ何もしない。
 *
 * @param {{ label: string, key: string }[]} buttons ボタンの文字と、押したときに送るキー。
 * @param {boolean} hasTypingInput 文字を打つ入力欄も出すか。
 */
export function setupTouchControls(buttons, hasTypingInput = false) {
  if (!window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  const bar = document.createElement("div");
  bar.id = "touch-controls";
  if (hasTypingInput) {
    bar.appendChild(createTypingInput());
  }
  for (const { label, key } of buttons) {
    const button = document.createElement("button");
    button.textContent = label;
    // 指が触れた時点で送る（click を待つと、続けて押したときに取りこぼす）
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      sendKey(key);
    });
    bar.appendChild(button);
  }
  document.body.appendChild(bar);
}
