/*
  遊戲頁的字母商品：26 個字母就是店裡的餅乾和麵包。
    a–m  立在兩座展示櫃頂上的大餅乾（前面那座 a–g、後面那座 h–m），糖霜寫著字母
    n–z  麵包架上面三層的麵包（每層 5 個，從裡面往門口排），麵包上用糖霜寫字母
  都照字母順序排：站在走道上看，展示櫃由左到右是 a→m，麵包架由左到右、由上到下是 n→z。

  為什麼用 JS：位置要從展示櫃、麵包架的擺法算出來（跟 scripts/shop.js 同一套座標），
  麵包也是 shop.js 長出來的，要在遊戲頁才加上字母、放大、變成可以點的商品。
  點商品之後的事（小栗去拿、補上字母）在 scripts/play.js。

  提供：Lab.letters.find(letter) → { el, area: 'cookie' | 'bread', x, z }
  載入順序：shop.js（店）→ storefront.js → characters.js → 這支 → game.js → play.js
*/

(function () {
  const Lab = window.Lab;
  const shop = document.querySelector('[data-game] .shop');
  if (!shop) return;
  const { vars } = Lab.shop;

  const items = new Map();

  // ---------- a–m：展示櫃頂上的字母餅乾 ----------

  // 展示櫃轉 Y 90° 靠在左牆，櫃頂在 y 320、深度從 x 10 到 170；餅乾立在櫃頂靠前的地方，正面朝走道
  const CASES = [
    { z: -390, letters: 'abcdefg' },
    { z: -900, letters: 'hijklm' },
  ];
  const COOKIE = { size: 66, gap: 68, x: 120, roof: 320 };

  // 一片立著的糖霜餅乾：餅乾本體、烤色的邊、糖霜字母（字母本身用 HTML 字，跟店裡其他招牌同一套字體）
  const cookieLetter = (letter) =>
    `<svg viewBox="0 0 66 66" aria-hidden="true" focusable="false">` +
    `<circle cx="33" cy="33" r="31" style="fill: var(--letter-cookie-edge)" />` +
    `<circle cx="33" cy="32" r="27" style="fill: var(--letter-cookie)" />` +
    `<g style="fill: var(--letter-cookie-dot)"><circle cx="16" cy="22" r="2" /><circle cx="50" cy="20" r="2" /><circle cx="48" cy="46" r="2" /><circle cx="18" cy="45" r="2" /></g>` +
    `</svg><span class="letter-item__text">${letter}</span>`;

  let cookies = '';
  for (const { z, letters } of CASES) {
    [...letters].forEach((letter, i) => {
      // 站在走道上看左牆，畫面左邊是門口（z 大）、右邊是店裡面（z 小），所以字母往 z 小的方向排
      const cz = z + ((letters.length - 1) / 2 - i) * COOKIE.gap;
      const cy = COOKIE.roof - COOKIE.size / 2;
      cookies +=
        `<button type="button" class="shop__part letter-item letter-item--cookie" data-letter="${letter}" ` +
        `aria-label="字母 ${letter} 的餅乾" style="${vars({
          l: COOKIE.x - COOKIE.size / 2,
          t: cy - COOKIE.size / 2,
          w: COOKIE.size,
          h: COOKIE.size,
          tz: cz,
          ay: 90,
        })}">${cookieLetter(letter)}</button>`;
      items.set(letter, { area: 'cookie', x: COOKIE.x, z: cz });
    });
  }

  // 字母餅乾自己一層，疊在店裡的擺設上面（櫃頂上面沒有東西會擋住它們）
  const fixtures = shop.querySelector('.shop__room--fixtures');
  fixtures.insertAdjacentHTML('afterend', `<div class="shop__room shop__room--letters">${cookies}</div>`);
  for (const el of shop.querySelectorAll('.letter-item--cookie')) items.get(el.dataset.letter).el = el;

  // ---------- n–z：麵包架上面三層的麵包 ----------

  // 層架上的麵包已經由 shop.js 擺好；照「由上到下、由裡到外」排序，前 13 個依序寫上 n–z
  const BREAD_SCALE = 1.35; // 放大一點，字母才看得清楚、手指也好點 [需確認]
  const breads = [...fixtures.querySelectorAll('.shop__bread[data-product]')]
    .map((el) => ({ el, t: parseFloat(el.style.getPropertyValue('--t')), h: parseFloat(el.style.getPropertyValue('--h')), z: parseFloat(el.style.getPropertyValue('--tz')) }))
    .sort((a, b) => a.t + a.h - (b.t + b.h) || a.z - b.z);

  [...'nopqrstuvwxyz'].forEach((letter, i) => {
    const { el, z } = breads[i];
    const l = parseFloat(el.style.getPropertyValue('--l'));
    const t = parseFloat(el.style.getPropertyValue('--t'));
    const w = parseFloat(el.style.getPropertyValue('--w'));
    const h = parseFloat(el.style.getPropertyValue('--h'));
    // 以底部中心放大：麵包照樣站在層板上
    el.style.setProperty('--l', l - (w * (BREAD_SCALE - 1)) / 2);
    el.style.setProperty('--t', t - h * (BREAD_SCALE - 1));
    el.style.setProperty('--w', w * BREAD_SCALE);
    el.style.setProperty('--h', h * BREAD_SCALE);
    // 烘焙店頁的麵包斜斜朝向門口（轉 Y −60°）；遊戲頁轉成正對走道，靠門口那幾個的字母才不會被擠扁
    el.style.setProperty('--ay', -90);
    el.classList.add('letter-item', 'letter-item--bread');
    el.dataset.letter = letter;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `字母 ${letter} 的麵包`);
    el.insertAdjacentHTML('beforeend', `<span class="letter-item__text">${letter}</span>`);
    items.set(letter, { el, area: 'bread', x: 1170, z });
  });

  Lab.letters = {
    find: (letter) => items.get(letter),
    all: () => [...items.entries()],
  };
})();
