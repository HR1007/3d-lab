/*
  烘焙店「日日餅乾」的場景產生器。

  為什麼用 JS 產生：整間店有一百多片平面（地板、天花板、三面牆、兩座展示櫃、4 層麵包架、
  櫃台、收銀機、吊燈…），烘焙店頁和之後的遊戲頁都要用。寫死在 HTML 就要複製兩份，
  改一個位置得改兩處。頁面上放 <div class="shop__room" data-scene="bakery"></div>，
  這支就會把整間店填進去。

  數值照 Figma「烘焙店場景」的建置腳本：
    - 房間 寬 1200 × 深 1200 × 高 700。原點在門口左上角，x 往右、y 往下，越往店裡面 z 越負
    - 每一片平面以「中心點」擺放（跟 Figma 腳本的 put() 一樣），3D transform 照抄
  跟 Figma 不一樣的地方：
    - 甜甜圈全部換成餅乾，招牌改成「日日餅乾」，黑板菜單改列 8 種商品與價格
    - 櫃台從 200 高降到 110，小栗改站到櫃台後面。200 高的櫃台會把小栗擋到只剩帽子，
      130 還是會擋到嘴巴（櫃台頂面有 150 深，擋住的是後緣）。[需確認]
    - 吊燈的電線從 120 縮成 30，三盞往門口挪（Depth −250／−550／−850），原本會擋住櫃台

  載入順序：scripts/props.js（餅乾、麵包、展示櫃）→ 這支 → scripts/characters.js（長出小栗）
*/

(function () {
  const { ensureDefs, cookieStack, cookieIcon, bread, displayCase } = window.Lab.props;
  const products = window.Lab.products;

  // 0 不寫出來：這些變數在 styles/shop.css 都登記了初始值 0
  const vars = (entries) =>
    Object.entries(entries)
      .filter(([, value]) => value)
      .map(([name, value]) => `--${name}: ${value}`)
      .join('; ');

  /*
    房間裡的一片平面。size 是 [寬, 高]，center 是中心點 [x, y]，
    tf 是 Figma 的 3D transform：z ＝ Depth，x / y ＝ 繞 X / Y 軸轉幾度。
  */
  const part = (cls, [w, h], [cx, cy], tf = {}, inner = '', attrs = '') =>
    `<div class="shop__part ${cls}" style="${vars({
      l: cx - w / 2,
      t: cy - h / 2,
      w,
      h,
      tz: tf.z,
      ax: tf.x,
      ay: tf.y,
    })}"${attrs}>${inner}</div>`;

  // 平面上的裝飾（招牌、海報…）：box 是 [x, y, 寬, 高]，以左上角擺放，跟 Figma 的 frameIn() 一樣
  const deco = (cls, [l, t, w, h], inner = '') =>
    `<div class="shop__deco ${cls}" style="${vars({ l, t, w, h })}">${inner}</div>`;

  // ---------- 地板、天花板 ----------

  const floor = part('shop__floor', [1200, 1200], [600, 700], { x: 90, z: -600 });
  const ceiling = part('shop__ceiling', [1200, 1200], [600, 0], { x: -90, z: -600 });

  // ---------- 後牆：招牌、黑板菜單、工房入口 ----------

  const menuColumn = (kind, title) =>
    `<div><p class="shop__menu-head">${title}</p>` +
    products
      .filter((p) => p.kind === kind)
      .map((p) => `<p class="shop__menu-row"><span>${p.name}</span><span>${p.price}</span></p>`)
      .join('') +
    `</div>`;

  const backWall = part(
    'shop__wall shop__wall--back',
    [1200, 700],
    [600, 350],
    { z: -1200 },
    deco('shop__sign', [380, 50, 440, 100], '<p class="shop__sign-name">日日餅乾</p><p class="shop__sign-latin">COOKIE DAILY</p>') +
      deco(
        'shop__menu',
        [110, 200, 300, 240],
        `<p class="shop__menu-title">MENU</p><div class="shop__menu-cols">${menuColumn('cookie', '餅乾')}${menuColumn('bread', '麵包')}</div>`
      ) +
      deco('shop__door', [880, 250, 200, 450]) +
      deco(
        'shop__noren',
        [880, 250, 200, 90],
        deco('shop__noren-slit', [65, 34, 3, 56]) + deco('shop__noren-slit', [132, 34, 3, 56]) + '<p class="shop__noren-text">工房</p>'
      )
  );

  // ---------- 左牆：兩張「本日推薦」海報，各自掛在一座展示櫃上方 ----------

  const poster = (x, id) =>
    deco(
      'shop__poster',
      [x - 100, 100, 200, 160],
      deco('shop__poster-art', [64, 20, 72, 72], cookieIcon(id)) + '<p class="shop__poster-text">本日推薦</p>'
    );
  // 左牆轉 Y 90°，牆面自己的 x 0 在門口、1200 在最裡面
  const leftWall = part('shop__wall shop__wall--left', [1200, 700], [0, 350], { y: 90, z: -600 }, poster(390, 'chip') + poster(900, 'heart'));

  // ---------- 右牆：麵包層架的背板 ----------

  // 右牆轉 Y −90°，牆面自己的 x 0 在最裡面、1200 在門口
  const rightWall = part(
    'shop__wall shop__wall--right',
    [1200, 700],
    [1200, 350],
    { y: -90, z: -600 },
    deco('shop__rack-title', [150, 128, 800, 40], '每日現烤') + deco('shop__rack', [150, 190, 800, 370])
  );

  // ---------- 左牆的兩座展示櫃（跟展示櫃頁同一份，轉 Y 90° 面向走道） ----------

  const cases = [-390, -900]
    .map(
      (z) =>
        `<div class="case shop__part" style="${vars({ l: 90 - 240, t: 510 - 190, w: 480, h: 380, tz: z, ay: 90 })}">${displayCase()}</div>`
    )
    .join('');

  // ---------- 右牆的麵包層架：4 層，每層 5 個，麵包立起來、轉 Y −60° 朝向走道 ----------

  const SHELVES = [
    [230, 'roll'],
    [330, 'croissant'],
    [430, 'toast'],
    [530, 'cinnamon'],
  ];
  const BREAD_Z = [-950, -800, -650, -500, -350];

  const racks = SHELVES.map(([y, id]) => {
    const b = bread(id);
    return (
      part('shop__shelf', [60, 800], [1170, y], { x: 90, z: -650 }) +
      part('shop__shelf-edge', [800, 6], [1140, y + 3], { y: -90, z: -650 }) +
      BREAD_Z.map((z) => part('shop__bread', [b.w, b.h], [1170, y - b.h / 2], { y: -60, z }, b.svg, ` data-product="${id}"`)).join('')
    );
  }).join('');

  // ---------- 櫃台、收銀機、試吃托盤 ----------

  const COUNTER_H = 110; // [需確認] Figma 是 200
  const COUNTER_TOP = 700 - COUNTER_H;
  const onCounter = (y) => y + COUNTER_TOP - 500; // Figma 的櫃台頂面在 y 500，收銀機和托盤跟著往下移

  const counter =
    part(
      'shop__counter-front',
      [460, COUNTER_H],
      [650, 700 - COUNTER_H / 2],
      { z: -950 },
      deco('shop__counter-lip', [0, 0, 460, 12]) +
        [0, 1, 2].map((i) => deco('shop__counter-panel', [22 + i * 144, 26, 128, COUNTER_H - 44])).join('')
    ) +
    part('shop__counter-top', [480, 150], [650, COUNTER_TOP], { x: 90, z: -1020 }) +
    part('shop__counter-side', [140, COUNTER_H], [420, 700 - COUNTER_H / 2], { y: -90, z: -1020 }) +
    part('shop__counter-side', [140, COUNTER_H], [880, 700 - COUNTER_H / 2], { y: 90, z: -1020 });

  const register =
    part('shop__register-front', [90, 46], [780, onCounter(477)], { z: -990 }) +
    part('shop__register-top', [90, 60], [780, onCounter(454)], { x: 90, z: -1020 }) +
    part('shop__register-side', [60, 46], [735, onCounter(477)], { y: -90, z: -1020 }) +
    part('shop__register-side', [60, 46], [825, onCounter(477)], { y: 90, z: -1020 }) +
    part('shop__register-screen', [70, 36], [780, onCounter(432)], { x: -15, z: -1030 });

  // 托盤上平躺三片餅乾（Figma 是三個縮小的甜甜圈；餅乾 54 寬，托盤加寬到 190 才放得下）
  const tray =
    part('shop__tray', [190, 80], [560, COUNTER_TOP - 1], { x: 90, z: -1000 }) +
    [
      ['chip', 500, -8],
      ['jam', 560, 12],
      ['heart', 620, -5],
    ]
      .map(([id, x, r]) => cookieStack(id, x, COUNTER_TOP - 1, -1000, r, 1))
      .join('');

  // ---------- 小栗：站在櫃台後面。腳底（角色畫板的 y 250）踩在地板上 ----------

  const clerk =
    `<div class="hedgehog shop__part shop__clerk" data-character="hedgehog" data-expression="normal" ` +
    `data-walking="false" data-carry="basket" style="${vars({ l: 540, t: 450, w: 200, h: 260, tz: -1140 })}"></div>`;

  // ---------- 吊燈：電線、燈罩、光暈畫在同一張平面上，永遠轉向鏡頭 ----------

  const LAMP_SHADE =
    `<svg viewBox="0 0 100 64" aria-hidden="true" focusable="false">` +
    `<path d="M4 56 Q4 8 50 8 Q96 8 96 56 Z" style="fill: var(--shop-lamp-shade)" />` +
    `<rect x="44" y="0" width="12" height="10" rx="2" style="fill: var(--shop-lamp-cord)" />` +
    `<rect x="2" y="54" width="96" height="5" rx="2.5" style="fill: var(--shop-lamp-cord)" />` +
    `<ellipse cx="50" cy="58" rx="16" ry="6" style="fill: var(--shop-lamp-bulb)" />` +
    `</svg>`;

  const lamps = [-250, -550, -850]
    .map((z) =>
      part(
        'shop__lamp',
        [300, 330],
        [600, 165],
        { z },
        deco('shop__lamp-glow', [10, -56, 280, 280]) + deco('shop__lamp-cord', [149, 0, 2, 30]) + deco('shop__lamp-shade', [100, 26, 100, 64], LAMP_SHADE)
      )
    )
    .join('');

  // ---------- 門口的地墊 ----------

  const mat = part('shop__mat', [320, 180], [600, 699], { x: 90, z: -300 }, '<p class="shop__mat-text">WELCOME</p>');

  const ROOM = [floor, ceiling, backWall, leftWall, rightWall, mat, cases, racks, counter, register, tray, clerk, lamps].join('');

  ensureDefs();
  for (const room of document.querySelectorAll('[data-scene="bakery"]')) {
    room.innerHTML = ROOM;
  }
})();
