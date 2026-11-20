/*
  小遊戲的開場：店門口 → 推門進店 → 導覽三站 → 開始營業。

  為什麼需要 JS：開場是照順序發生的一連串事情（門打開、鏡頭走進店、導覽一站一站換），
  每一步要等上一步的動畫走完，也要接住玩家按的「下一站」「略過導覽」。
  這支只決定「什麼時候換下一步」：門怎麼轉、鏡頭怎麼走，都是改 data 屬性之後由 CSS 的 transition 做。

  狀態都寫在 data 屬性上：
    .game[data-phase]   street 店外／entering 推門進店／tour 導覽／ready 準備開店／open 營業中
    .shop[data-camera]  鏡頭：street（店外）＋烘焙店頁的 door／cases／bread／counter
    .shop[data-door]    closed／open
  第 6-2 輪的遊戲本體從 open 接手：開始營業時會在 .game 上發出 game:open 事件。

  載入順序：props.js → shop.js → storefront.js → characters.js → 這支（最後，整間店都長好了）
*/

(function () {
  const game = document.querySelector('[data-game]');
  if (!game) return;

  const shop = game.querySelector('.shop');
  const door = game.querySelector('[data-game-door]');
  const card = game.querySelector('[data-game-card]');
  const cardStep = card.querySelector('[data-game-step]');
  const cardTitle = card.querySelector('[data-game-title]');
  const cardText = card.querySelector('[data-game-text]');
  const cardActions = card.querySelector('[data-game-actions]');
  const skipButton = card.querySelector('[data-game-skip]');
  const nextButton = card.querySelector('[data-game-next]');
  const status = game.querySelector('[data-game-status]');

  // 整間店（店裡、店外兩層）都是裝飾，讀螢幕的軟體只需要知道那扇門
  for (const el of shop.querySelectorAll('.shop__room > *')) {
    if (el !== door) el.setAttribute('aria-hidden', 'true');
  }

  // ---------- 開場的文字 [需確認] ----------

  const STREET = { title: '歡迎光臨', text: '點一下店門，走進日日餅乾。' };
  const TOUR = [
    { camera: 'cases', title: '餅乾展示櫃', text: '左邊兩座展示櫃放餅乾：巧克力豆、果醬夾心、棋盤、糖霜愛心。' },
    { camera: 'bread', title: '麵包架', text: '右邊的層架放麵包：餐包、可頌、吐司、肉桂捲。' },
    { camera: 'counter', title: '櫃台', text: '小栗站在櫃台後面。顧客點好餐，點商品讓小栗去拿，拿齊了點收銀機結帳。' },
  ];
  const READY = { title: '準備好了嗎？', text: '今天會有 15 位顧客上門，每一位都在等，動作要快喔。', next: '開始營業' };

  // ---------- 小工具 ----------

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 動畫要多久：直接讀 CSS 算好的 transition-duration。減少動態效果時是 0，就不用等
  const durationOf = (el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0;

  // 每次「回到店門口」就換一個號碼；還在等動畫的舊流程醒來發現號碼不對，就不再往下做
  let run = 0;
  let onNext = null;

  function setPhase(phase) {
    game.dataset.phase = phase;
    door.disabled = phase !== 'street';
  }

  function showCard({ step = '', title, text, next = '', skip = false }) {
    cardStep.textContent = step;
    cardStep.hidden = !step;
    cardTitle.textContent = title;
    cardText.textContent = text;
    nextButton.textContent = next;
    nextButton.hidden = !next;
    skipButton.hidden = !skip;
    cardActions.hidden = !next && !skip;
    card.hidden = false;
  }

  // ---------- 開場的每一步 ----------

  function atStreet() {
    setPhase('street');
    showCard(STREET);
  }

  async function enter() {
    if (game.dataset.phase !== 'street') return;
    const id = ++run;
    setPhase('entering');
    card.hidden = true;

    // 門開到三成就開始往前走，走到門口時門已經全開
    shop.dataset.door = 'open';
    await wait(durationOf(door) * 0.3);
    if (id !== run) return;

    shop.dataset.walk = 'enter';
    shop.dataset.camera = 'door';
    await wait(durationOf(shop));
    if (id !== run) return;

    // 走進來之後門在背後關上（之後顧客進門會再推開）
    delete shop.dataset.walk;
    shop.dataset.door = 'closed';
    tour(0);
    nextButton.focus();
  }

  function tour(index) {
    const stop = TOUR[index];
    const last = index === TOUR.length - 1;
    setPhase('tour');
    shop.dataset.camera = stop.camera;
    showCard({
      step: `導覽 ${index + 1}／${TOUR.length}`,
      title: stop.title,
      text: stop.text,
      next: last ? '知道了' : '下一站',
      skip: true,
    });
    onNext = last ? ready : () => tour(index + 1);
  }

  function ready() {
    setPhase('ready');
    shop.dataset.camera = 'door';
    showCard(READY);
    onNext = open;
    nextButton.focus();
  }

  function open() {
    setPhase('open');
    card.hidden = true;
    status.hidden = false;
    onNext = null;
    game.dispatchEvent(new CustomEvent('game:open'));
  }

  // 回到店門口：關掉動畫直接跳回去，套用之後再把動畫接回來
  function restart() {
    run++;
    shop.dataset.instant = '';
    delete shop.dataset.walk;
    shop.dataset.camera = 'street';
    shop.dataset.door = 'closed';
    void shop.offsetWidth; // 先讓瀏覽器套用沒有動畫的位置（連門一起）
    delete shop.dataset.instant;
    status.hidden = true;
    onNext = null;
    atStreet();
  }

  door.addEventListener('click', enter);
  nextButton.addEventListener('click', () => onNext?.());
  skipButton.addEventListener('click', ready);
  document.querySelector('[data-game-restart]')?.addEventListener('click', restart);

  atStreet();
})();
