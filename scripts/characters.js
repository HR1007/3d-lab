/*
  角色的圖層產生器。

  為什麼用 JS 產生：小栗和三位顧客（兔子、小熊、狐狸）會出現在好幾頁——角色展示頁、烘焙店、遊戲。
  每一頁只要放一個空殼 <div class="character" data-character="rabbit">，這支就會把
  6 層 SVG 填進去；改造型只要改這裡一處，不用到每一頁複製貼上同一大段 SVG。

  顏色全部是 CSS 變數（styles/tokens.css 的 --hh-*、--rabbit-*、--bear-*、--fox-*、--ch-*），這裡只有形狀。
  座標是 Figma「Hedgehog Baker」的 200 × 260 畫板；小栗跟 Figma 裡的向量一模一樣。
  三位顧客比小栗更圓潤：頭比較大、身體矮胖，尖角都修成圓弧。

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
    `<svg class="character__layer character__layer--${name}" style="--depth: ${depth}" viewBox="0 0 200 260" aria-hidden="true" focusable="false">${body}</svg>`;

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
      `<g class="ch-foot ch-foot--l"><ellipse cx="78" cy="242" rx="17" ry="10" ${fill('--hh-foot')} /></g>` +
        `<g class="ch-foot ch-foot--r"><ellipse cx="122" cy="242" rx="17" ry="10" ${fill('--hh-foot')} /></g>` +
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

  // ================= 顧客 =================
  /*
    三位顧客跟小栗用同一個 200 × 260 的畫板、同樣的 6 層與 Depth，腳也在同一個位置，
    所以走路、影子、表情切換全部共用 styles/characters.css。
    剪影要一眼分得出來：兔子是長耳朵，小熊是圓耳朵和寬身體，狐狸是尖耳朵和側面露出的大尾巴。
  */

  const feet = (token) =>
    `<g class="ch-foot ch-foot--l"><ellipse cx="78" cy="242" rx="17" ry="10" ${fill(token)} /></g>` +
    `<g class="ch-foot ch-foot--r"><ellipse cx="122" cy="242" rx="17" ry="10" ${fill(token)} /></g>`;

  // 三種表情。y 是眼睛的高度，mouth 是嘴巴的高度，nose 是各自的鼻子（腮紅與鼻子三種表情共用）
  const customerFace = ({ y, mouth, nose }) =>
    `<ellipse cx="62" cy="${y + 18}" rx="11" ry="6.5" ${fill('--ch-blush')} /><ellipse cx="138" cy="${y + 18}" rx="11" ry="6.5" ${fill('--ch-blush')} />` +
    nose +
    // 平常：豆豆眼、小小的微笑
    `<g data-face="normal">` +
    `<ellipse cx="78" cy="${y}" rx="7" ry="8" ${fill('--ch-eye')} /><circle cx="80.6" cy="${y - 3.4}" r="2.5" ${fill('--ch-eye-shine')} />` +
    `<ellipse cx="122" cy="${y}" rx="7" ry="8" ${fill('--ch-eye')} /><circle cx="124.6" cy="${y - 3.4}" r="2.5" ${fill('--ch-eye-shine')} />` +
    `<path d="M93 ${mouth} Q100 ${mouth + 6} 107 ${mouth}" ${line('--ch-ink', 2.2)} />` +
    `</g>` +
    // 開心：瞇成彎彎的眼睛、張嘴笑（拿到對的商品時）
    `<g data-face="happy">` +
    `<path d="M70 ${y + 3} Q78 ${y - 8} 86 ${y + 3}" ${line('--ch-eye', 3.2)} /><path d="M114 ${y + 3} Q122 ${y - 8} 130 ${y + 3}" ${line('--ch-eye', 3.2)} />` +
    `<path d="M92 ${mouth - 2} Q100 ${mouth + 11} 108 ${mouth - 2} Z" ${fill('--ch-ink')} />` +
    `<ellipse cx="100" cy="${mouth + 4.5}" rx="3.6" ry="2" ${fill('--ch-tongue')} />` +
    `</g>` +
    // 著急：八字眉、小眼睛、波浪嘴、一滴汗（等太久時）
    `<g data-face="flustered">` +
    `<path d="M68 ${y - 10} L86 ${y - 16}" ${line('--ch-eye', 2.5)} /><path d="M132 ${y - 10} L114 ${y - 16}" ${line('--ch-eye', 2.5)} />` +
    `<ellipse cx="78" cy="${y + 2}" rx="4.5" ry="6" ${fill('--ch-eye')} /><ellipse cx="122" cy="${y + 2}" rx="4.5" ry="6" ${fill('--ch-eye')} />` +
    `<path d="M90 ${mouth + 2} Q94 ${mouth - 2} 98 ${mouth + 2} Q102 ${mouth + 6} 106 ${mouth + 2} Q109 ${mouth - 1} 111 ${mouth + 2}" ${line('--ch-ink', 2.2)} />` +
    `<path d="M154 ${y - 44} C148 ${y - 34} 148 ${y - 28} 154 ${y - 26} C160 ${y - 28} 160 ${y - 34} 154 ${y - 44} Z" ${fill('--ch-sweat')} />` +
    `</g>`;

  // 手：空手時兩隻手垂在身體兩側；結帳後提著印有店標的紙袋
  const customerArms = (paw) =>
    `<g data-carry-item="none">` +
    `<circle cx="56" cy="206" r="13" ${fill(paw)} /><circle cx="144" cy="206" r="13" ${fill(paw)} />` +
    `</g>` +
    `<g data-carry-item="bag">` +
    `<path d="M86 196 Q86 178 100 178 Q114 178 114 196" ${line('--bag-kraft-dark', 3)} />` +
    `<path d="M77 194 H123 Q129 194 129 200 L132 236 Q133 245 124 245 H76 Q67 245 68 236 L71 200 Q71 194 77 194 Z" ${fill('--bag-kraft')} />` +
    `<path d="M77 194 H123 Q129 194 129 200 V202 H71 V200 Q71 194 77 194 Z" ${fill('--bag-kraft-dark')} />` +
    `<circle cx="100" cy="222" r="10" ${fill('--bag-logo')} />` +
    `<g ${fill('--bag-kraft')}><circle cx="96.5" cy="219" r="1.6" /><circle cx="103.5" cy="220.5" r="1.6" /><circle cx="99" cy="226" r="1.6" /></g>` +
    `<ellipse cx="86" cy="190" rx="11" ry="10" ${fill(paw)} /><ellipse cx="114" cy="190" rx="11" ry="10" ${fill(paw)} />` +
    `</g>`;

  // ---------- 兔子 ----------
  const RABBIT_LAYERS = [
    layer(
      'back',
      -30,
      // 長耳朵從頭後面豎起來，稍微往外張；尾巴是背後的一團棉花球，轉到側面才看得到
      `<g transform="rotate(-12 76 76)"><ellipse cx="76" cy="44" rx="19" ry="42" ${fill('--rabbit-fur')} /><ellipse cx="76" cy="46" rx="10" ry="30" ${fill('--rabbit-ear-inner')} /></g>` +
        `<g transform="rotate(12 124 76)"><ellipse cx="124" cy="44" rx="19" ry="42" ${fill('--rabbit-fur')} /><ellipse cx="124" cy="46" rx="10" ry="30" ${fill('--rabbit-ear-inner')} /></g>` +
        `<circle cx="100" cy="218" r="19" ${fill('--rabbit-muzzle')} />`
    ),
    layer(
      'body',
      -14,
      feet('--rabbit-fur-shade') +
        `<ellipse cx="100" cy="206" rx="56" ry="40" ${fill('--rabbit-cardigan')} />` +
        // 開襟衫的領口：圓弧的 U 字，不是尖的 V
        `<path d="M84 166 Q100 214 116 166 Z" ${fill('--rabbit-muzzle')} />` +
        `<path d="M100 192 V244" ${line('--rabbit-cardigan-dark', 2)} />` +
        `<circle cx="100" cy="212" r="3.6" ${fill('--rabbit-button')} /><circle cx="100" cy="228" r="3.6" ${fill('--rabbit-button')} />`
    ),
    layer(
      'head',
      0,
      `<ellipse cx="100" cy="112" rx="64" ry="58" ${fill('--rabbit-fur')} />` +
        `<ellipse cx="100" cy="136" rx="27" ry="17" ${fill('--rabbit-muzzle')} />`
    ),
    layer(
      'hat',
      4,
      // 左耳根的蝴蝶結：兩片圓圓的蝴蝶翅膀
      `<path d="M68 64 C60 50 46 52 46 63 C46 74 60 78 68 64 Z" ${fill('--rabbit-ribbon')} />` +
        `<path d="M68 64 C76 50 90 52 90 63 C90 74 76 78 68 64 Z" ${fill('--rabbit-ribbon')} />` +
        `<circle cx="68" cy="64" r="6" ${fill('--rabbit-ribbon-dark')} />`
    ),
    layer(
      'face',
      6,
      customerFace({
        y: 110,
        mouth: 136,
        nose: `<path d="M95 125 Q100 121 105 125 Q100 131 95 125 Z" ${fill('--rabbit-nose')} />`,
      })
    ),
    layer('arms', 18, customerArms('--rabbit-fur-shade')),
  ].join('');

  // ---------- 小熊 ----------
  const BEAR_LAYERS = [
    layer('back', -30, `<circle cx="100" cy="220" r="14" ${fill('--bear-fur-dark')} />`),
    layer(
      'body',
      -14,
      feet('--bear-fur-dark') +
        `<ellipse cx="100" cy="206" rx="60" ry="42" ${fill('--bear-fur')} />` +
        // 吊帶褲：下半身（上緣微微彎）＋胸前圓角的口袋片＋兩條彎彎的肩帶
        `<path d="M42 210 Q100 218 158 210 Q156 246 100 248 Q44 246 42 210 Z" ${fill('--bear-overalls')} />` +
        `<rect x="76" y="178" width="48" height="36" rx="12" ${fill('--bear-overalls')} />` +
        `<rect x="89" y="188" width="22" height="13" rx="6" ${fill('--bear-overalls-dark')} />` +
        `<path d="M82 182 Q76 170 70 164 M118 182 Q124 170 130 164" ${line('--bear-overalls', 6)} />` +
        `<circle cx="83" cy="183" r="3.8" ${fill('--bear-button')} /><circle cx="117" cy="183" r="3.8" ${fill('--bear-button')} />`
    ),
    layer(
      'head',
      0,
      `<circle cx="48" cy="66" r="21" ${fill('--bear-fur')} /><circle cx="48" cy="66" r="11" ${fill('--bear-ear-inner')} />` +
        `<circle cx="152" cy="66" r="21" ${fill('--bear-fur')} /><circle cx="152" cy="66" r="11" ${fill('--bear-ear-inner')} />` +
        `<ellipse cx="100" cy="112" rx="66" ry="58" ${fill('--bear-fur')} />` +
        `<ellipse cx="100" cy="136" rx="29" ry="20" ${fill('--bear-muzzle')} />`
    ),
    // 脖子上的紅色領巾：圓弧的三角巾，尖端修圓
    layer(
      'hat',
      4,
      `<path d="M64 160 Q100 174 136 160 Q130 174 114 184 Q100 192 86 184 Q70 174 64 160 Z" ${fill('--bear-scarf')} />`
    ),
    layer(
      'face',
      6,
      customerFace({
        y: 108,
        mouth: 138,
        nose:
          `<ellipse cx="100" cy="127" rx="9" ry="6.5" ${fill('--ch-ink')} />` +
          `<ellipse cx="97.5" cy="125.5" rx="2.4" ry="1.4" style="fill: var(--ch-eye-shine); fill-opacity: 0.7" />`,
      })
    ),
    layer('arms', 18, customerArms('--bear-fur-dark')),
  ].join('');

  // ---------- 狐狸 ----------
  // 狐狸的左耳：外層橘色、內層淺色、耳尖深色，耳尖畫成圓弧。右耳是它左右翻過來
  const FOX_EAR =
    `<path d="M44 94 C38 66 42 42 52 32 C58 26 66 28 74 36 C84 46 94 56 100 68 Z" ${fill('--fox-fur')} />` +
    `<path d="M58 82 C55 66 57 52 62 48 C66 45 71 48 77 55 C82 60 86 64 88 68 Z" ${fill('--fox-ear-inner')} />` +
    `<path d="M52 32 C58 26 66 28 74 36 C68 42 60 46 50 49 C49 42 49 37 52 32 Z" ${fill('--fox-dark')} />`;

  const FOX_LAYERS = [
    layer(
      'back',
      -30,
      // 蓬鬆的大尾巴往右上翹，從正面也看得到一截；尾巴尖是白的
      `<g transform="rotate(40 160 192)"><ellipse cx="160" cy="192" rx="27" ry="48" ${fill('--fox-fur')} /><ellipse cx="160" cy="158" rx="17" ry="16" ${fill('--fox-white')} /></g>`
    ),
    layer(
      'body',
      -14,
      feet('--fox-dark') +
        `<ellipse cx="100" cy="206" rx="56" ry="40" ${fill('--fox-fur')} />` +
        `<ellipse cx="100" cy="212" rx="33" ry="29" ${fill('--fox-white')} />`
    ),
    layer(
      'head',
      0,
      // 兩隻耳朵（右耳是左耳翻過來）
      `<g>${FOX_EAR}</g><g transform="translate(200 0) scale(-1 1)">${FOX_EAR}</g>` +
        `<ellipse cx="100" cy="112" rx="66" ry="56" ${fill('--fox-fur')} />` +
        // 下半張臉是白的，兩頰往外鼓成圓弧
        `<path d="M42 114 Q32 122 40 138 Q58 166 100 168 Q142 166 160 138 Q168 122 158 114 Q130 138 100 130 Q70 138 42 114 Z" ${fill('--fox-white')} />`
    ),
    // 脖子上的青綠色圍巾，兩端圓圓的，垂下來一截
    layer(
      'hat',
      4,
      `<path d="M60 158 Q100 174 140 158 Q145 166 137 173 Q100 190 63 173 Q55 166 60 158 Z" ${fill('--fox-scarf')} />` +
        `<path d="M113 174 Q130 182 129 198 Q121 206 112 199 Q109 186 113 174 Z" ${fill('--fox-scarf-dark')} />`
    ),
    layer(
      'face',
      6,
      customerFace({ y: 108, mouth: 138, nose: `<ellipse cx="100" cy="127" rx="7.5" ry="5.5" ${fill('--ch-ink')} />` })
    ),
    layer('arms', 18, customerArms('--fox-dark')),
  ].join('');

  const CHARACTERS = { hedgehog: HEDGEHOG_LAYERS, rabbit: RABBIT_LAYERS, bear: BEAR_LAYERS, fox: FOX_LAYERS };

  // 把角色的影子與 6 層長進一個空殼。遊戲頁中途才進場的顧客也用這個
  function mount(el) {
    const layers = CHARACTERS[el.dataset.character];
    if (!layers || el.querySelector('.character__rig')) return;
    el.insertAdjacentHTML('beforeend', `<div class="character__shadow"></div><div class="character__rig">${layers}</div>`);
  }

  const Lab = (window.Lab = window.Lab || {});
  Lab.characters = {
    mount,
    // 訂單卡、泡泡的說明文字用的稱呼
    names: { hedgehog: '小栗', rabbit: '兔子', bear: '小熊', fox: '狐狸' },
  };

  for (const el of document.querySelectorAll('[data-character]')) mount(el);
})();
