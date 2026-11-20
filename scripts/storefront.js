/*
  遊戲頁的店門口：「日日餅乾」的店面，以及門內接上原本店面的一段前廳。

  為什麼用 JS 產生：跟 scripts/shop.js 同一套擺法（平面以中心點擺放、照抄 Figma 的 3D transform），
  外牆的門窗洞、櫥窗擺設、遮雨棚的斜度都要從幾個數字算出來，寫死在 HTML 會是一長串看不懂的數字。

  座標接著烘焙店的房間（x 往右、y 往下、越往店裡面 z 越負）：
    - 店面的牆放在 z 600：把原本開著的門口往外推 600，中間多出一段前廳。
      烘焙店頁的四個鏡頭都在 z 600 以內，進店之後照樣用那四個鏡頭
    - 牆上挖三個洞（中間的門、左右兩扇櫥窗），用 clip-path 的 evenodd 規則：
      外框裡面再描一圈，那一圈就變成洞
    - 門是一顆按鈕，鉸鏈在左邊；打開時轉 Y 往店裡推（styles/storefront.css）

  分成好幾層 .shop__room（套同一個鏡頭），由下往上疊：店裡（地板、天花板、三面牆、擺設各一層，scripts/shop.js）→
  前廳（地板、天花板、左右牆各一層）→ 櫥窗擺設 → 人行道 → 店外 → 遮雨棚 → 波浪邊。
    全部放在同一個 3D 空間時，Chrome 排前後會出錯（店面右半邊被截掉、店裡的牆被畫到店外、
    轉頭時牆上破洞露出背景）。分開之後每層各自排，層與層之間靠疊的順序，而這個順序本身就是對的：
      - 前廳和店裡以 z 0 分界：鏡頭在前廳或店外時，前廳的東西只會擋住店裡的，不會反過來；
        鏡頭走進店裡（z 0 以內）之後，前廳整個在鏡頭背後，不會畫出來。前廳的四片彼此不重疊，
        櫥窗擺設在它們圍起來的空間裡面，一定比它們離鏡頭近
      - 鏡頭在店外時，人行道只出現在門窗下緣以下，跟從門窗看進去的店裡不重疊；
        店外的牆、門、遮雨棚、立牌又一定在人行道和店裡所有東西的前面
      - 鏡頭走進店裡之後，人行道和店外的東西都在鏡頭背後，不會畫出來

  標記：<div class="shop__room" data-scene="bakery" data-storefront></div>
    前廳、人行道、店外各長一層，依序接在取景框的最後面
  載入順序：scripts/shop.js（蓋好店、提供擺放工具）→ 這支 → scripts/characters.js
*/

(function () {
  const { vars, part, deco } = window.Lab.shop;
  const { cookieIcon, bread } = window.Lab.props;
  const products = Object.fromEntries(window.Lab.products.map((p) => [p.id, p]));

  const FRONT = 600; // 店面的牆在哪個深度

  // ---------- 前廳：地板、天花板、左右牆接在原本房間的前面 ----------

  // 地板的磁磚從店裡那一端（z 0）開始算，100 一格，接縫處深淺照樣交錯
  // 跟店裡一樣，地板、天花板、左右牆各自一層（見 scripts/shop.js 開頭的說明）
  const hall = [
    part('shop__floor', [1200, FRONT], [600, 700], { x: 90, z: FRONT / 2 }),
    part('shop__ceiling shop__ceiling--hall', [1200, FRONT], [600, 0], { x: -90, z: FRONT / 2 }),
    part('shop__wall shop__wall--left', [FRONT, 700], [0, 350], { y: 90, z: FRONT / 2 }),
    part('shop__wall shop__wall--right', [FRONT, 700], [1200, 350], { y: -90, z: FRONT / 2 }),
  ];

  // ---------- 外牆 ----------

  // [x, y, 寬, 高]。牆比鏡頭在店外看到的範圍還寬，左右看不到盡頭；上緣是屋簷，再上面是天空
  const WALL = [-400, -170, 2000, 870];
  const DOOR = [490, 280, 220, 420];
  const WINDOWS = [
    [100, 300, 320, 300],
    [780, 300, 320, 300],
  ];

  const [wallX, wallY, wallW, wallH] = WALL;
  const wallRight = wallX + wallW;
  const wallBottom = wallY + wallH;

  // 房間座標 → 牆面自己的座標（牆的左上角是 0, 0）
  const onWall = ([x, y, w, h]) => [x - wallX, y - wallY, w, h];
  const wallDeco = (cls, box, inner) => deco(cls, onWall(box), inner);

  /*
    挖洞：沿著外框走，中途繞去每扇窗描一圈再回到起點，門則是從下緣往上凹進去的缺口。
    來回的那段線重疊、互相抵銷，evenodd 只留下窗戶那一圈當洞。
  */
  const pct = ([x, y]) => `${(((x - wallX) / wallW) * 100).toFixed(3)}% ${(((y - wallY) / wallH) * 100).toFixed(3)}%`;
  const hole = ([x, y, w, h]) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y], [wallX, wallY]];
  const [doorX, doorY, doorW, doorH] = DOOR;
  const outline = [
    [wallX, wallY],
    ...WINDOWS.flatMap(hole),
    [wallRight, wallY],
    [wallRight, wallBottom],
    [doorX + doorW, wallBottom],
    [doorX + doorW, doorY],
    [doorX, doorY],
    [doorX, wallBottom],
    [wallX, wallBottom],
  ];
  const clip = `polygon(evenodd, ${outline.map(pct).join(', ')})`;

  // 招牌上方的鵝頸燈（右邊那盞用 CSS 左右翻過來）
  const GOOSENECK =
    `<svg viewBox="0 0 70 76" aria-hidden="true" focusable="false">` +
    `<rect x="0" y="0" width="14" height="10" rx="2" style="fill: var(--front-trim)" />` +
    `<path d="M7 8 Q7 30 30 30 Q50 30 50 46" style="fill: none; stroke: var(--front-trim); stroke-width: 4" />` +
    `<path d="M34 50 Q50 38 66 50 L62 58 H38 Z" style="fill: var(--front-trim)" />` +
    `<ellipse cx="50" cy="59" rx="10" ry="3.5" style="fill: var(--shop-lamp-bulb)" />` +
    `</svg>`;

  const wallDecos =
    // 屋簷與兩側的壁柱
    wallDeco('storefront__cornice', [wallX, wallY, wallW, 34]) +
    wallDeco('storefront__cornice-trim', [wallX, wallY + 34, wallW, 8]) +
    wallDeco('storefront__pilaster', [20, wallY + 42, 40, wallBottom - wallY - 42]) +
    wallDeco('storefront__pilaster', [1140, wallY + 42, 40, wallBottom - wallY - 42]) +
    // 招牌：跟店裡後牆同一塊深色木頭，兩邊各一片餅乾
    wallDeco(
      'storefront__sign',
      [350, -60, 500, 160],
      deco('storefront__sign-icon', [26, 50, 60, 60], cookieIcon('chip')) +
        deco('storefront__sign-icon', [414, 50, 60, 60], cookieIcon('heart')) +
        '<p class="storefront__sign-name">日日餅乾</p><p class="storefront__sign-latin">COOKIE DAILY</p>'
    ) +
    wallDeco('storefront__lamp', [400, -128, 70, 76], GOOSENECK) +
    wallDeco('storefront__lamp storefront__lamp--flip', [730, -128, 70, 76], GOOSENECK) +
    // 遮雨棚落在牆上的影子
    wallDeco('storefront__awning-shadow', [50, 160, 1100, 90]) +
    // 櫥窗：外框、窗台、底下的腰板
    WINDOWS.map(
      ([x, y, w, h]) =>
        wallDeco('storefront__frame', [x - 16, y - 16, w + 32, h + 32]) +
        wallDeco('storefront__sill', [x - 28, y + h + 10, w + 56, 16]) +
        wallDeco('storefront__kick', [x - 16, y + h + 26, w + 32, 700 - (y + h + 26)])
    ).join('') +
    // 門框：上、左、右三邊
    wallDeco('storefront__door-frame', [doorX - 18, doorY - 18, doorW + 36, 700 - doorY + 18]);

  const wall =
    `<div class="shop__part storefront__wall" style="${vars({ l: wallX, t: wallY, w: wallW, h: wallH, tz: FRONT })}; clip-path: ${clip}">` +
    `${wallDecos}</div>`;

  // ---------- 櫥窗：玻璃，和玻璃後面的展示台 ----------

  const glass = WINDOWS.map(([x, y, w, h], i) =>
    part('storefront__glass', [w, h], [x + w / 2, y + h / 2], { z: FRONT - 4 }, `<p class="storefront__decal">${i ? '手工餅乾' : '每日現烤'}</p>`)
  ).join('');

  // 展示台：頂面平躺、正面立著，頂面高度在 y 560（從街上看，正好露出在窗框下緣上面）
  const DISPLAY_TOP = 560;
  const platform = ([x, , w]) =>
    part('storefront__platform-top', [w, 50], [x + w / 2, DISPLAY_TOP], { x: 90, z: FRONT - 30 }) +
    part('storefront__platform', [w, 600 - DISPLAY_TOP], [x + w / 2, (600 + DISPLAY_TOP) / 2], { z: FRONT - 5 });

  // 立在展示台上的東西：size 是 [寬, 高]，x 是中心，底部踩在展示台上
  const standing = (cls, [w, h], x, z, inner) => part(cls, [w, h], [x, DISPLAY_TOP - h / 2], { z }, inner);
  const breadOnDisplay = (id, x, z) => {
    const b = bread(id);
    return standing('storefront__item', [b.w * 1.4, b.h * 1.4], x, z, b.svg);
  };

  // 左邊櫥窗：三種麵包；右邊櫥窗：一罐餅乾、一個小蛋糕架
  const COOKIE_JAR =
    `<svg viewBox="0 0 150 170" aria-hidden="true" focusable="false">` +
    `<use href="#cookie-checker" x="18" y="108" width="54" height="54" />` +
    `<use href="#cookie-chip" x="72" y="104" width="58" height="58" />` +
    `<use href="#cookie-jam" x="28" y="62" width="54" height="54" />` +
    `<use href="#cookie-heart" x="76" y="54" width="54" height="54" />` +
    `<path d="M28 30 H122 Q140 30 140 52 V150 Q140 168 122 168 H28 Q10 168 10 150 V52 Q10 30 28 30 Z" ` +
    `style="fill: var(--front-jar-glass); stroke: var(--front-jar-line); stroke-width: 3" />` +
    `<path d="M24 58 Q21 100 26 140" style="fill: none; stroke: var(--front-glass-shine); stroke-width: 6; stroke-linecap: round" />` +
    `<rect x="40" y="18" width="70" height="14" rx="3" style="fill: var(--front-jar-lid-dark)" />` +
    `<rect x="32" y="4" width="86" height="18" rx="7" style="fill: var(--front-jar-lid)" />` +
    `<circle cx="75" cy="5" r="6" style="fill: var(--front-jar-lid-dark)" />` +
    `</svg>`;

  const COOKIE_STAND =
    `<svg viewBox="0 0 90 110" aria-hidden="true" focusable="false">` +
    `<use href="#cookie-jam" x="13" y="6" width="64" height="64" />` +
    `<rect x="8" y="70" width="74" height="7" rx="3.5" style="fill: var(--front-stand)" />` +
    `<rect x="41" y="77" width="8" height="24" style="fill: var(--front-stand)" />` +
    `<rect x="25" y="100" width="40" height="8" rx="4" style="fill: var(--front-stand)" />` +
    `</svg>`;

  const displays =
    WINDOWS.map(platform).join('') +
    breadOnDisplay('toast', 265, FRONT - 45) +
    breadOnDisplay('croissant', 178, FRONT - 25) +
    breadOnDisplay('cinnamon', 355, FRONT - 25) +
    standing('storefront__item', [150, 170], 900, FRONT - 35, COOKIE_JAR) +
    standing('storefront__item', [90, 110], 1035, FRONT - 25, COOKIE_STAND);

  // ---------- 店門：一顆按鈕，鉸鏈在左邊 ----------

  // 按鈕裡只能放 phrasing content，所以門上的零件用 span（.shop__deco 是絕對定位，span 一樣能撐出大小）
  const doorPart = (cls, [l, t, w, h], inner = '') => `<span class="shop__deco ${cls}" style="${vars({ l, t, w, h })}">${inner}</span>`;

  const OPEN_SIGN_CORD =
    `<svg viewBox="0 0 120 34" aria-hidden="true" focusable="false">` +
    `<path d="M60 6 L20 32 M60 6 L100 32" style="fill: none; stroke: var(--front-open-cord); stroke-width: 2.5" />` +
    `<circle cx="60" cy="6" r="4.5" style="fill: var(--front-handle)" />` +
    `</svg>`;

  const door =
    `<button type="button" class="shop__part storefront__door" data-game-door aria-label="推開店門，走進日日餅乾" ` +
    `style="${vars({ l: doorX, t: doorY, w: doorW, h: doorH, tz: FRONT })}">` +
    doorPart('storefront__door-glass', [28, 30, 164, 160]) +
    doorPart('storefront__open-cord', [50, 44, 120, 34], OPEN_SIGN_CORD) +
    doorPart('storefront__open', [62, 74, 96, 40], '<span class="storefront__open-text">OPEN</span>') +
    doorPart('storefront__door-panel', [28, 214, 164, 84]) +
    doorPart('storefront__door-panel', [28, 314, 164, 84]) +
    doorPart('storefront__handle', [184, 196, 12, 70]) +
    `</button>`;

  // ---------- 遮雨棚：從牆上 y 160 斜斜往外伸 160、往下 80，前緣掛一排波浪邊 ----------

  const AWNING = { top: 160, drop: 80, reach: 160, x: [50, 1150] };
  const awningWidth = AWNING.x[1] - AWNING.x[0];
  const awningLength = Math.hypot(AWNING.drop, AWNING.reach);
  // 轉 X 之後，平面往下的方向變成（往下 cos、往外 sin），所以角度是 atan(往外 ÷ 往下)
  const awningAngle = (Math.atan2(AWNING.reach, AWNING.drop) * 180) / Math.PI;
  const awning = part(
    'storefront__awning',
    [awningWidth, awningLength],
    [600, AWNING.top + AWNING.drop / 2],
    { x: awningAngle.toFixed(2), z: FRONT + AWNING.reach / 2 }
  );
  const valance = part('storefront__valance', [awningWidth, 40], [600, AWNING.top + AWNING.drop + 20], { z: FRONT + AWNING.reach });

  // ---------- 人行道、門口的台階、盆栽、A 字立牌 ----------

  // 人行道和台階離店面的牆 2：剛好跟牆碰在同一個深度時，Chrome 排前後容易出錯
  const ground = part('storefront__ground', [2400, 600], [600, 700], { x: 90, z: FRONT + 302 });
  const step = part('storefront__step', [290, 46], [600, 699], { x: 90, z: FRONT + 25 });

  const PLANTER =
    `<svg viewBox="0 0 150 210" aria-hidden="true" focusable="false">` +
    `<circle cx="45" cy="82" r="40" style="fill: var(--front-bush-dark)" />` +
    `<circle cx="105" cy="80" r="40" style="fill: var(--front-bush-dark)" />` +
    `<circle cx="75" cy="52" r="46" style="fill: var(--front-bush)" />` +
    `<circle cx="40" cy="96" r="32" style="fill: var(--front-bush)" />` +
    `<circle cx="110" cy="96" r="32" style="fill: var(--front-bush)" />` +
    `<circle cx="58" cy="38" r="6" style="fill: var(--front-flower)" />` +
    `<circle cx="96" cy="62" r="6" style="fill: var(--front-flower)" />` +
    `<circle cx="38" cy="84" r="5" style="fill: var(--front-flower)" />` +
    `<path d="M28 124 H122 L110 208 H40 Z" style="fill: var(--front-pot)" />` +
    `<rect x="22" y="114" width="106" height="18" rx="4" style="fill: var(--front-pot-rim)" />` +
    `</svg>`;
  const planter = part('storefront__item', [150, 210], [-60, 700 - 105], { z: FRONT + 70 }, PLANTER);

  // A 字立牌：兩片黑板往中間靠，頂端碰在一起；正面寫今天推薦的餅乾
  const BOARD = { x: 1260, h: 230, tilt: 12, apex: FRONT + 140 };
  const boardRad = (BOARD.tilt * Math.PI) / 180;
  const boardCenterY = 700 - (BOARD.h / 2) * Math.cos(boardRad);
  const boardOffsetZ = (BOARD.h / 2) * Math.sin(boardRad);
  const pick = products.chip;
  const aboard =
    part(
      'storefront__aboard',
      [160, BOARD.h],
      [BOARD.x, boardCenterY],
      { x: BOARD.tilt, z: BOARD.apex + boardOffsetZ },
      '<p class="storefront__aboard-title">本日推薦</p>' +
        deco('storefront__aboard-icon', [45, 72, 70, 70], cookieIcon(pick.id)) +
        `<p class="storefront__aboard-name">${pick.name}</p><p class="storefront__aboard-price">${pick.price} 元</p>`
    ) + part('storefront__aboard', [160, BOARD.h], [BOARD.x, boardCenterY], { x: -BOARD.tilt, z: BOARD.apex - boardOffsetZ });

  // 前廳：地板、天花板、左右牆各一層，櫥窗後面的展示台與擺設一層。人行道：地面與台階。店外：牆、玻璃、門、遮雨棚、人行道上的東西
  const LAYERS = [
    ...hall.map((plane) => ['hall', [plane]]),
    ['display', [displays]],
    ['ground', [ground, step]],
    ['outside', [glass, wall, door, planter, aboard]],
    // 遮雨棚、波浪邊跟牆碰在同一條邊上，放在一起 Chrome 會把波浪邊截短；各自一層疊在牆上面（從街上看本來就在牆前面）
    ['awning', [awning]],
    ['awning', [valance]],
  ];

  // 接在取景框裡最後面，疊在店裡的牆面、擺設兩層上面
  for (const room of document.querySelectorAll('[data-scene="bakery"][data-storefront]')) {
    const html = LAYERS.map(([name, parts]) => `<div class="shop__room shop__room--${name}">${parts.join('')}</div>`).join('');
    room.parentElement.insertAdjacentHTML('beforeend', html);
  }
})();
