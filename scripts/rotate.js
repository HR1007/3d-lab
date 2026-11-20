/*
  拖曳旋轉 3D 物件。

  為什麼需要 JS：純 CSS 只做得到「固定角度」或「自動轉」，訪客沒辦法自己轉。
  能從任何角度看，才證明這是真的 3D，而不是一張畫成斜的圖——這是這個實驗頁要驗證的事。

  JS 只負責改兩個 CSS 變數（--rx、--ry），旋轉本身仍然是 CSS transform 算的。
  預設角度從被轉元素的 --tilt-x / --tilt-y 讀（每個物件在自己的 CSS 裡指到自己的 token），
  不在這裡另寫一份。

  標記：
    [data-rotate-root]    一組舞台＋讀數
    [data-rotate-stage]   接收拖曳與鍵盤的區域
    [data-rotate-target]  被轉的那個 preserve-3d 元素
    [data-readout-x/y]    顯示目前角度（對照 Figma 用）
*/

const DEG_PER_PX = 0.4; // 拖 100px 轉 40°
const KEY_STEP = 10; // 方向鍵一次 10°
const X_LIMIT = 85; // 上下最多轉到快垂直，再過去畫面會整個翻過來，很難轉回來

const clampX = (deg) => Math.max(-X_LIMIT, Math.min(X_LIMIT, deg));
// 顯示用：把 Y 收在 -180°～180°，跟 Figma 面板的寫法一致
const wrapY = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

for (const root of document.querySelectorAll('[data-rotate-root]')) {
  const stage = root.querySelector('[data-rotate-stage]');
  const target = root.querySelector('[data-rotate-target]');
  const outX = root.querySelector('[data-readout-x]');
  const outY = root.querySelector('[data-readout-y]');

  const tokens = getComputedStyle(target);
  const initial = {
    x: parseFloat(tokens.getPropertyValue('--tilt-x')) || 0,
    y: parseFloat(tokens.getPropertyValue('--tilt-y')) || 0,
  };

  let rx = initial.x;
  let ry = initial.y;
  let drag = null;

  const render = () => {
    target.style.setProperty('--rx', `${rx}deg`);
    target.style.setProperty('--ry', `${ry}deg`);
    if (outX) outX.textContent = `${Math.round(rx)}°`;
    if (outY) outY.textContent = `${Math.round(wrapY(ry))}°`;
  };

  // 鍵盤與重設用補間；拖曳時拿掉，否則畫面會落後手指
  const settle = (on) => target.classList.toggle('is-settling', on);

  const reset = () => {
    rx = initial.x;
    ry = initial.y;
    settle(true);
    render();
  };

  stage.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, rx, ry };
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
    settle(false);
  });

  stage.addEventListener('pointermove', (event) => {
    if (!drag) return;
    ry = drag.ry + (event.clientX - drag.x) * DEG_PER_PX;
    rx = clampX(drag.rx - (event.clientY - drag.y) * DEG_PER_PX);
    render();
  });

  const endDrag = () => {
    drag = null;
    stage.classList.remove('is-dragging');
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('dblclick', reset);

  stage.addEventListener('keydown', (event) => {
    const steps = {
      ArrowLeft: [0, -KEY_STEP],
      ArrowRight: [0, KEY_STEP],
      ArrowUp: [KEY_STEP, 0],
      ArrowDown: [-KEY_STEP, 0],
    };
    if (event.key === '0' || event.key === 'Home') {
      event.preventDefault();
      reset();
      return;
    }
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    rx = clampX(rx + step[0]);
    ry += step[1];
    settle(true);
    render();
  });

  render();
}
