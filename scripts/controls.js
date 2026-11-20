/*
  展示頁的狀態切換按鈕。

  一組按鈕對應目標元素上的一個 data 屬性：
    <div data-control="expression" data-control-target="#hh">
      <button data-value="happy">開心</button> …
    </div>
  按下去就把 #hh 的 data-expression 設成 "happy"，外觀全部交給 CSS 處理。
  data-control-target 可以對到好幾個元素（例如三位顧客一起換表情），每一個都會改到。
  遊戲那一頁會由遊戲邏輯直接改同樣的屬性，所以這裡測到的就是遊戲會用到的狀態。
*/

for (const group of document.querySelectorAll('[data-control]')) {
  const targets = [...document.querySelectorAll(group.dataset.controlTarget)];
  const attr = group.dataset.control;
  const buttons = [...group.querySelectorAll('button[data-value]')];
  if (!targets.length) continue;

  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const target of targets) target.dataset[attr] = button.dataset.value;
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
    });
  }
}
