/*
  道具的產生器：餅乾、展示櫃。

  為什麼用 JS 產生：同一座展示櫃（24 個位置、42 片餅乾）會出現在展示櫃頁、烘焙店、遊戲三頁，
  烘焙店裡還要擺兩座。寫死在 HTML 就得複製好幾大段，改一片餅乾要改好幾處。
  這支把「Figma 的 component」集中在一處：
    - 餅乾每種只畫一次，做成 SVG <symbol>，頁面裡全部用 <use> 引用（＝ component 與 instance）
    - 展示櫃的平面與餅乾擺放表
  頁面上放 <div class="case" data-prop="display-case"></div>，這支就會把櫃子填進去；
  其他產生器（例如烘焙店）可以直接呼叫 window.Lab.props.displayCase() 拿到同一份 HTML。

  顏色全部是 CSS 變數（styles/tokens.css 的 --cookie-*），這裡只有形狀與擺放位置。
  座標是 Figma 的單位：餅乾是 54 × 54 的畫板，展示櫃是 480 × 380。
*/

(function () {
  const Lab = (window.Lab = window.Lab || {});

  const fill = (token) => `style="fill: var(${token})"`;

  // 不規則的圓：r(θ) 決定每個角度的半徑，取 64 個點連起來。中心在 54 × 54 畫板的正中間
  function outline(radius) {
    const points = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * 2 * Math.PI;
      const r = radius(a);
      points.push(`${(27 + r * Math.cos(a)).toFixed(1)} ${(27 + r * Math.sin(a)).toFixed(1)}`);
    }
    return `M${points.join(' L')} Z`;
  }

  // 巧克力豆餅乾的邊緣有點凹凸；果醬夾心是 12 瓣的花邊
  const CHIP_OUTLINE = outline((a) => 24.5 + 0.9 * Math.sin(5 * a + 0.4) + 0.6 * Math.sin(9 * a + 1.3));
  const JAM_OUTLINE = outline((a) => 23 + 1.5 * Math.cos(12 * a));
  const CHECKER_OUTLINE = `<rect x="5" y="5" width="44" height="44" rx="2"`;
  const HEART_OUTLINE = 'M27 48 C10 36 3 26 7 16 C11 6 23 6 27 15 C31 6 43 6 47 16 C51 26 44 36 27 48 Z';

  const symbol = (id, body) => `<symbol id="${id}" viewBox="0 0 54 54">${body}</symbol>`;

  /*
    每種餅乾兩個 symbol：
      cookie-<種類>       俯視圖
      cookie-<種類>-edge  同形狀的深色剪影，墊在底下做出厚度
  */
  const COOKIE_SYMBOLS = [
    // 巧克力豆餅乾
    symbol('cookie-chip-edge', `<path ${fill('--cookie-edge')} d="${CHIP_OUTLINE}" />`),
    symbol(
      'cookie-chip',
      `<path ${fill('--cookie-dough')} d="${CHIP_OUTLINE}" />` +
        `<ellipse cx="24" cy="23" rx="15" ry="13" ${fill('--cookie-dough-light')} />` +
        `<g ${fill('--cookie-chip')}>` +
        `<ellipse cx="17" cy="18" rx="3.2" ry="2.4" transform="rotate(20 17 18)" />` +
        `<ellipse cx="31" cy="13" rx="2.8" ry="2.2" transform="rotate(-30 31 13)" />` +
        `<ellipse cx="39" cy="26" rx="3.4" ry="2.6" transform="rotate(45 39 26)" />` +
        `<ellipse cx="25" cy="29" rx="3" ry="2.3" transform="rotate(-10 25 29)" />` +
        `<ellipse cx="13" cy="34" rx="2.6" ry="2.1" transform="rotate(60 13 34)" />` +
        `<ellipse cx="33" cy="40" rx="3.3" ry="2.5" transform="rotate(15 33 40)" />` +
        `<ellipse cx="43" cy="37" rx="2.4" ry="2" transform="rotate(-40 43 37)" />` +
        `<ellipse cx="21" cy="44" rx="2.6" ry="2" transform="rotate(30 21 44)" />` +
        `</g>`
    ),
    // 果醬夾心
    symbol('cookie-jam-edge', `<path ${fill('--cookie-edge')} d="${JAM_OUTLINE}" />`),
    symbol(
      'cookie-jam',
      `<path ${fill('--cookie-butter')} d="${JAM_OUTLINE}" />` +
        `<circle cx="27" cy="27" r="12" ${fill('--cookie-butter-dark')} />` +
        `<circle cx="27" cy="27" r="8.5" ${fill('--cookie-jam')} />` +
        `<ellipse cx="24.5" cy="24" rx="3" ry="1.8" transform="rotate(-30 24.5 24)" ${fill('--cookie-jam-shine')} />`
    ),
    // 棋盤餅乾：4 × 4 格，深色格放在 (列 + 欄) 為奇數的位置
    symbol('cookie-checker-edge', `${CHECKER_OUTLINE} ${fill('--cookie-edge')} />`),
    symbol(
      'cookie-checker',
      `${CHECKER_OUTLINE} ${fill('--cookie-checker-light')} />` +
        `<g ${fill('--cookie-checker-dark')}>` +
        `<rect x="16" y="5" width="11" height="11" /><rect x="38" y="5" width="11" height="11" />` +
        `<rect x="5" y="16" width="11" height="11" /><rect x="27" y="16" width="11" height="11" />` +
        `<rect x="16" y="27" width="11" height="11" /><rect x="38" y="27" width="11" height="11" />` +
        `<rect x="5" y="38" width="11" height="11" /><rect x="27" y="38" width="11" height="11" />` +
        `</g>`
    ),
    // 糖霜愛心：愛心尖端朝 symbol 的下方，平躺後會朝向櫃子前面
    symbol('cookie-heart-edge', `<path ${fill('--cookie-edge')} d="${HEART_OUTLINE}" />`),
    symbol(
      'cookie-heart',
      `<path ${fill('--cookie-sugar')} d="${HEART_OUTLINE}" />` +
        `<path ${fill('--cookie-icing')} d="M27 43 C13 33 8 25 11 17 C14 10 23 10 27 18 C31 10 40 10 43 17 C46 25 41 33 27 43 Z" />` +
        `<g ${fill('--cookie-icing-dot')}>` +
        `<circle cx="17" cy="20" r="1.2" /><circle cx="22" cy="27" r="1.2" /><circle cx="31" cy="24" r="1.2" />` +
        `<circle cx="37" cy="19" r="1.2" /><circle cx="27" cy="33" r="1.2" /><circle cx="35" cy="29" r="1.2" />` +
        `</g>`
    ),
  ].join('');

  // 所有 symbol 只放一次，放在 <body> 最前面；已經有了就不再放
  function ensureDefs() {
    if (document.getElementById('cookie-chip')) return;
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<svg class="lab__defs" aria-hidden="true" focusable="false">${COOKIE_SYMBOLS}</svg>`
    );
  }

  /*
    一個位置上的一疊餅乾。x / y / z 是位置（＝ Figma 裡 instance 的擺放位置），
    r0 是最底下那片繞垂直軸轉的角度，count 是疊幾片（最多 3 片）。
    往上每一片多轉 23°、左右錯開一點，看起來是隨手疊的，而不是同一張圖複製好幾次。
  */
  const STACK_DX = [0, 1.5, -1]; // 第 1、2、3 片往旁邊錯開多少
  function cookieStack(type, x, y, z, r0, count) {
    let layers = '';
    for (let k = 0; k < count; k++) {
      const vars = `--k: ${k}; --r: ${r0 + 23 * k}; --dx: ${STACK_DX[k]}`;
      layers +=
        `<svg class="cookie__edge" viewBox="0 0 54 54" style="${vars}"><use href="#cookie-${type}-edge" /></svg>` +
        `<svg class="cookie__top" viewBox="0 0 54 54" style="${vars}"><use href="#cookie-${type}" /></svg>`;
    }
    return `<div class="cookie" style="--x: ${x}; --y: ${y}; --z: ${z}">${layers}</div>`;
  }

  /*
    展示櫃的餅乾擺放表：[種類, x, 層板高度 y, 前後 z, 底下那片的角度, 疊幾片]
    x 是 4 欄的中心，y 是 3 層層板（300 / 210 / 120），z 是後排 −36、前排 +36。
  */
  const CASE_COOKIES = [
    // 第 1 層（高度 300）
    ['chip', 84, 300, -36, -9, 3],
    ['checker', 188, 300, -36, -12, 1],
    ['jam', 292, 300, -36, -15, 2],
    ['heart', 396, 300, -36, -18, 1],
    ['heart', 84, 300, 36, 10, 2],
    ['chip', 188, 300, 36, 7, 1],
    ['checker', 292, 300, 36, 4, 3],
    ['jam', 396, 300, 36, 1, 1],
    // 第 2 層（高度 210）
    ['jam', 84, 210, -36, 2, 1],
    ['heart', 188, 210, -36, -1, 3],
    ['chip', 292, 210, -36, -4, 2],
    ['checker', 396, 210, -36, -7, 1],
    ['checker', 84, 210, 36, -19, 2],
    ['jam', 188, 210, 36, 18, 3],
    ['heart', 292, 210, 36, 15, 1],
    ['chip', 396, 210, 36, 12, 2],
    // 第 3 層（高度 120）
    ['heart', 84, 120, -36, 13, 1],
    ['chip', 188, 120, -36, 10, 2],
    ['jam', 292, 120, -36, 7, 1],
    ['checker', 396, 120, -36, 4, 3],
    ['chip', 84, 120, 36, -8, 1],
    ['checker', 188, 120, 36, -11, 1],
    ['heart', 292, 120, 36, -14, 2],
    ['jam', 396, 120, 36, -17, 2],
  ];

  const part = (cls, inner = '') => `<div class="part ${cls}">${inner}</div>`;

  // 展示櫃的所有平面（＝ Figma「Display Case」裡的圖層）。每一片的位置與角度寫在 styles/display-case.css
  function displayCase() {
    ensureDefs();
    return [
      part('case__back'),
      part('case__base-top'),
      part('case__base-left'),
      part('case__base-right'),
      part(
        'case__base-front',
        '<p class="case__name">日日餅乾</p><p class="case__name case__name--latin">COOKIE DAILY</p><div class="case__kick"></div>'
      ),
      part('case__shelf case__shelf--2'),
      part('case__shelf-edge case__shelf-edge--2'),
      part('case__shelf case__shelf--3'),
      part('case__shelf-edge case__shelf-edge--3'),
      ...CASE_COOKIES.map((c) => cookieStack(...c)),
      part('case__glass case__glass--left'),
      part('case__glass case__glass--right'),
      part('case__roof'),
      part('case__roof-left'),
      part('case__roof-right'),
      part('case__light'),
      part('case__led'),
      // 前面的玻璃最後放：跟後面的東西重疊時，瀏覽器才會把它畫在最上面
      part('case__glass case__glass--front'),
    ].join('');
  }

  Lab.props = { ensureDefs, cookieStack, displayCase };

  for (const el of document.querySelectorAll('[data-prop="display-case"]')) {
    el.innerHTML = displayCase();
  }
})();
