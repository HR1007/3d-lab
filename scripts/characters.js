/*
  角色的圖層產生器。

  為什麼用 JS 產生：小栗（之後還有三位顧客）會出現在好幾頁——角色展示頁、烘焙店、遊戲。
  每一頁只要放一個空殼 <div class="hedgehog" data-character="hedgehog">，這支就會把
  6 層 SVG 填進去；改造型只要改這裡一處，不用到每一頁複製貼上同一大段 SVG。

  顏色全部是 CSS 變數（styles/tokens.css 的 --hh-*），這裡只有形狀。
  座標是 Figma「Hedgehog Baker」的 200 × 260 畫板，跟 Figma 裡的向量一模一樣。

  要在 characters.js 之前執行完的東西：沒有。rotate.js 要排在這支後面（兩支都 defer，照順序執行）。
*/

(function () {
  // 背刺：一圈尖刺，外圈深色、內圈淺色錯開半根，跟 Figma 的算法相同
  function spikes(cx, cy, outer, inner, count, squashY, phase) {
    const point = (radius, angle) =>
      `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * squashY * Math.sin(angle)).toFixed(1)}`;
    let d = '';
    for (let i = 0; i < count; i++) {
      const a0 = ((i + phase) / count) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + phase + 0.5) / count) * 2 * Math.PI - Math.PI / 2;
      const a2 = ((i + phase + 1) / count) * 2 * Math.PI - Math.PI / 2;
      d += (i === 0 ? `M${point(inner, a0)} ` : '') + `L${point(outer, a1)} L${point(inner, a2)} `;
    }
    return d + 'Z';
  }

  const fill = (token) => `style="fill: var(${token})"`;
  const line = (token, width) =>
    `style="fill: none; stroke: var(${token}); stroke-width: ${width}; stroke-linecap: round; stroke-linejoin: round"`;

  const layer = (name, depth, body) =>
    `<svg class="hh-layer hh-layer--${name}" style="--depth: ${depth}" viewBox="0 0 200 260" aria-hidden="true" focusable="false">${body}</svg>`;

  const HEDGEHOG_LAYERS = [
    layer(
      'spines',
      -30,
      `<path d="${spikes(100, 118, 92, 74, 22, 1.1, 0)}" style="fill: var(--hh-spine-dark); stroke: var(--hh-spine-dark); stroke-width: 6; stroke-linejoin: round" />` +
        `<path d="${spikes(100, 120, 84, 70, 22, 1.1, 0.5)}" style="fill: var(--hh-spine); stroke: var(--hh-spine); stroke-width: 6; stroke-linejoin: round" />`
    ),
    layer(
      'body',
      -14,
      `<g class="hh-foot hh-foot--l"><ellipse cx="78" cy="242" rx="17" ry="10" ${fill('--hh-foot')} /></g>` +
        `<g class="hh-foot hh-foot--r"><ellipse cx="122" cy="242" rx="17" ry="10" ${fill('--hh-foot')} /></g>` +
        `<ellipse cx="100" cy="198" rx="54" ry="46" ${fill('--hh-body')} />` +
        `<ellipse cx="100" cy="206" rx="38" ry="34" ${fill('--hh-belly')} />`
    ),
    layer(
      'head',
      0,
      `<circle cx="50" cy="60" r="15" ${fill('--hh-ear')} /><circle cx="50" cy="60" r="8" ${fill('--hh-ear-inner')} />` +
        `<circle cx="150" cy="60" r="15" ${fill('--hh-ear')} /><circle cx="150" cy="60" r="8" ${fill('--hh-ear-inner')} />` +
        `<ellipse cx="100" cy="104" rx="64" ry="56" ${fill('--hh-face')} />` +
        `<ellipse cx="100" cy="128" rx="30" ry="18" ${fill('--hh-snout')} />`
    ),
    layer(
      'hat',
      4,
      `<circle cx="76" cy="34" r="17" ${fill('--hh-hat')} /><circle cx="124" cy="34" r="17" ${fill('--hh-hat')} />` +
        `<circle cx="100" cy="24" r="21" ${fill('--hh-hat')} />` +
        `<rect x="68" y="38" width="64" height="18" rx="5" ${fill('--hh-hat')} />` +
        `<path d="M84 41 V53 M100 41 V53 M116 41 V53" ${line('--hh-hat-line', 2)} />`
    ),
    layer(
      'face',
      6,
      // 三種表情共用的腮紅與鼻子
      `<ellipse cx="60" cy="124" rx="11" ry="6.5" ${fill('--hh-blush')} /><ellipse cx="140" cy="124" rx="11" ry="6.5" ${fill('--hh-blush')} />` +
        `<ellipse cx="100" cy="120" rx="7.5" ry="5.5" ${fill('--hh-nose')} />` +
        `<ellipse cx="98" cy="118.5" rx="2.2" ry="1.4" style="fill: var(--hh-eye-shine); fill-opacity: 0.7" />` +
        // 平常：Figma 原版的豆豆眼與 w 嘴
        `<g data-face="normal">` +
        `<ellipse cx="76" cy="104" rx="6.5" ry="8" ${fill('--hh-eye')} /><circle cx="78.5" cy="100.5" r="2.4" ${fill('--hh-eye-shine')} />` +
        `<ellipse cx="124" cy="104" rx="6.5" ry="8" ${fill('--hh-eye')} /><circle cx="126.5" cy="100.5" r="2.4" ${fill('--hh-eye-shine')} />` +
        `<path d="M92 129 Q96 134 100 129 Q104 134 108 129" ${line('--hh-nose', 2.2)} />` +
        `</g>` +
        // 開心：瞇成彎彎的眼睛、張嘴笑
        `<g data-face="happy">` +
        `<path d="M68 107 Q76 96 84 107" ${line('--hh-eye', 3.2)} /><path d="M116 107 Q124 96 132 107" ${line('--hh-eye', 3.2)} />` +
        `<path d="M91 127 Q100 140 109 127 Z" ${fill('--hh-nose')} />` +
        `<ellipse cx="100" cy="133.5" rx="4" ry="2.2" ${fill('--hh-tongue')} />` +
        `</g>` +
        // 慌張：八字眉、小眼睛、波浪嘴、一滴汗
        `<g data-face="flustered">` +
        `<path d="M66 95 L84 89" ${line('--hh-eye', 2.5)} /><path d="M134 95 L116 89" ${line('--hh-eye', 2.5)} />` +
        `<ellipse cx="76" cy="106" rx="4.5" ry="6" ${fill('--hh-eye')} /><ellipse cx="124" cy="106" rx="4.5" ry="6" ${fill('--hh-eye')} />` +
        `<path d="M89 131 Q93 127 97 131 Q101 135 105 131 Q109 127 111 131" ${line('--hh-nose', 2.2)} />` +
        `<path d="M152 62 C146 72 146 78 152 80 C158 78 158 72 152 62 Z" ${fill('--hh-sweat')} />` +
        `</g>`
    ),
    layer(
      'arms',
      18,
      // 圍裙（兩種拿法共用）
      `<path d="M70 162 H130 V214 Q130 238 100 238 Q70 238 70 214 Z" ${fill('--hh-apron')} />` +
        `<rect x="88" y="196" width="24" height="18" rx="4" ${fill('--hh-pocket')} />` +
        `<path d="M70 162 L60 150 M130 162 L140 150" ${line('--hh-apron', 5)} />` +
        // 法棍（Figma 原版）
        `<g data-carry-item="baguette">` +
        `<g transform="rotate(-24 104 196)"><rect x="46" y="186" width="116" height="22" rx="11" ${fill('--hh-baguette')} />` +
        `<path d="M70 190 L78 203 M92 190 L100 203 M114 190 L122 203 M136 190 L144 203" ${line('--hh-baguette-score', 3)} /></g>` +
        `<ellipse cx="62" cy="214" rx="13" ry="12" ${fill('--hh-body')} /><ellipse cx="146" cy="178" rx="13" ry="12" ${fill('--hh-body')} />` +
        `</g>` +
        // 籃子（遊戲用）。[data-basket-items] 是之後放商品的位置，夾在提把和籃身之間
        `<g data-carry-item="basket">` +
        `<path d="M72 194 Q100 148 128 194" ${line('--hh-basket-dark', 5)} />` +
        `<g data-basket-items></g>` +
        `<path d="M60 192 H140 L132 236 Q131 240 127 240 H73 Q69 240 68 236 Z" ${fill('--hh-basket')} />` +
        `<path d="M64 206 H136 M66 220 H134" ${line('--hh-basket-dark', 2)} />` +
        `<path d="M58 191 H142" ${line('--hh-basket-dark', 6)} />` +
        `<ellipse cx="72" cy="194" rx="12" ry="11" ${fill('--hh-body')} /><ellipse cx="128" cy="194" rx="12" ry="11" ${fill('--hh-body')} />` +
        `</g>`
    ),
  ].join('');

  for (const el of document.querySelectorAll('[data-character="hedgehog"]')) {
    el.insertAdjacentHTML(
      'beforeend',
      `<div class="hedgehog__shadow"></div><div class="hedgehog__rig">${HEDGEHOG_LAYERS}</div>`
    );
  }
})();
