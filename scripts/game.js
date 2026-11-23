/*
  小遊戲的開場：店門口 → 推門進店 → 導覽三站（字母放在哪裡）→ 遊戲說明書 → 主畫面 → 開始營業。
  說明書看完或跳過，都先停在主畫面：正中間一顆大大的「開始遊戲」，下面是現在的難度、單字量，
  還有「遊戲說明」「設定」「回到店門口」。按下開始遊戲：按鈕壓下去、彈開、碎成字母餅乾和星星飛出去，再 3、2、1。

  為什麼需要 JS：開場是照順序發生的一連串事情（門打開、鏡頭走進店、導覽一站一站換），
  每一步要等上一步的動畫走完，也要接住玩家按的「下一站」「略過導覽」。
  這支只決定「什麼時候換下一步」：門怎麼轉、鏡頭怎麼走，都是改 data 屬性之後由 CSS 的 transition 做；
  開始遊戲飛出去的碎片也是 CSS animation，這裡只負責產生那幾片、給每片一個方向。

  狀態都寫在 data 屬性上：
    .game[data-phase]   street 店外／entering 推門進店／tour 導覽／book 看說明書／lobby 主畫面／
                        starting 按下開始遊戲的那一下／open 營業中
    .shop[data-camera]  鏡頭：street（店外）＋烘焙店頁的 door／cases／bread／counter＋遊戲的 play
    .shop[data-door]    closed／open
    .hud[data-mode]     右上角：idle 只有音樂／lobby 多了齒輪／play 再多鬧鐘（play 由 scripts/play.js 設）
  遊戲本體（scripts/play.js）從 open 接手：開始營業時在 .game 上發出 game:open；
  回到主畫面、回到店門口時發出 game:reset，讓它收掉這一局。

  載入順序：props.js → shop.js → storefront.js → characters.js → settings.js → 這支（整間店都長好了）
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
  const hud = game.querySelector('[data-hud]');
  const lobbyEl = game.querySelector('[data-lobby]');
  const startButton = lobbyEl.querySelector('[data-lobby-start]');
  const burstEl = lobbyEl.querySelector('[data-lobby-burst]');
  const lobbySummary = lobbyEl.querySelector('[data-lobby-summary]');

  // 整間店（店裡、店外兩層）都是裝飾，讀螢幕的軟體只需要知道那扇門
  for (const el of shop.querySelectorAll('.shop__room > *')) {
    if (el !== door) el.setAttribute('aria-hidden', 'true');
  }

  // ---------- 開場的文字 [需確認] ----------

  const STREET = { title: '歡迎光臨', text: '點一下店門，走進日日餅乾。' };
  const TOUR = [
    { camera: 'cases', title: '字母餅乾 a–m', text: '左邊兩座展示櫃頂上立著字母餅乾，a 到 m 照字母順序從左排到右。' },
    { camera: 'bread', title: '字母麵包 n–z', text: '右邊麵包架上的麵包寫著 n 到 z，一樣照順序，從上排到下。' },
    { camera: 'counter', title: '櫃台', text: '顧客會走到櫃台前出題。找到缺的字母，點那個餅乾或麵包，小栗就會去拿回來。' },
  ];

  // ---------- 小工具 ----------

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 動畫要多久：直接讀 CSS 算好的 transition-duration。減少動態效果時是 0，就不用等
  const durationOf = (el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0;
  const tokenMs = (name) => parseFloat(getComputedStyle(game).getPropertyValue(name)) || 0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    hud.dataset.mode = 'idle';
    lobbyEl.hidden = true;
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

  // 導覽結束（或略過）：打開遊戲說明書；看完或跳過都停在主畫面（scripts/book.js）
  function ready() {
    setPhase('book');
    shop.dataset.camera = 'counter';
    card.hidden = true;
    onNext = null;
    window.Lab.book.open('intro', lobby);
  }

  // ---------- 主畫面 ----------

  function lobby() {
    setPhase('lobby');
    shop.dataset.camera = 'play'; // 先轉到營業時的位置，按開始之後鏡頭就不用再動
    card.hidden = true;
    status.hidden = true;
    hud.dataset.mode = 'lobby';
    lobbySummary.textContent = `現在是：${window.Lab.settings?.summary() ?? ''}`;
    lobbyEl.hidden = false;
    startButton.focus({ preventScroll: true });
  }

  const focusStart = () => game.dataset.phase === 'lobby' && startButton.focus({ preventScroll: true });

  // 按下開始遊戲飛出去的碎片：一圈字母餅乾和星星，每片往不同的方向飛（距離、轉幾圈、晚一點點出發都隨機）
  const SPARKS = 18;
  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
  function burst() {
    burstEl.replaceChildren();
    burstEl.insertAdjacentHTML('beforeend', '<span class="lobby__ring"></span><span class="lobby__ring lobby__ring--late"></span>');
    for (let i = 0; i < SPARKS; i++) {
      const angle = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.3;
      const reach = 0.6 + Math.random() * 0.4;
      const star = i % 3 === 0;
      const spark = document.createElement('span');
      spark.className = `lobby__spark lobby__spark--${star ? 'star' : 'letter'}`;
      spark.textContent = star ? '★' : ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      spark.style.setProperty('--dx', (Math.cos(angle) * reach).toFixed(3));
      spark.style.setProperty('--dy', (Math.sin(angle) * reach).toFixed(3));
      spark.style.setProperty('--spin', `${Math.round((Math.random() - 0.5) * 540)}deg`);
      spark.style.setProperty('--delay', (Math.random() * 0.12).toFixed(3));
      burstEl.append(spark);
    }
  }

  async function launch() {
    if (game.dataset.phase !== 'lobby') return;
    const id = run;
    setPhase('starting');
    if (!reduced()) {
      lobbyEl.classList.add('is-launching');
      burst();
      await wait(tokenMs('--lobby-launch-duration'));
    }
    lobbyEl.classList.remove('is-launching');
    burstEl.replaceChildren();
    if (id !== run) return;
    lobbyEl.hidden = true;
    open();
  }

  function openSettings() {
    if (game.dataset.phase !== 'lobby') return; // 營業中的齒輪交給 scripts/play.js（暫停）
    window.Lab.settings.open('lobby', focusStart);
  }

  function openHowto() {
    if (game.dataset.phase !== 'lobby') return;
    window.Lab.book.open('lobby', focusStart);
  }

  function open() {
    setPhase('open');
    card.hidden = true;
    status.hidden = false;
    onNext = null;
    game.dispatchEvent(new CustomEvent('game:open'));
  }

  // 回到主畫面（暫停選單、成績頁）：收掉這一局，停在開始遊戲的大按鈕前
  function toLobby() {
    run++;
    window.Lab.book?.close();
    window.Lab.settings?.close();
    game.dispatchEvent(new CustomEvent('game:reset'));
    lobby();
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
    window.Lab.book?.close();
    window.Lab.settings?.close();
    game.dispatchEvent(new CustomEvent('game:reset'));
    atStreet();
  }

  door.addEventListener('click', enter);
  nextButton.addEventListener('click', () => onNext?.());
  skipButton.addEventListener('click', ready);
  startButton.addEventListener('click', launch);
  lobbyEl.querySelector('[data-lobby-howto]').addEventListener('click', openHowto);
  // 右上角的齒輪和主畫面的「設定」
  for (const button of game.querySelectorAll('[data-settings-open]')) button.addEventListener('click', openSettings);
  // 暫停選單和成績頁的「回到主畫面」、主畫面的「回到店門口」
  for (const button of game.querySelectorAll('[data-game-lobby]')) button.addEventListener('click', toLobby);
  for (const button of game.querySelectorAll('[data-game-restart]')) button.addEventListener('click', restart);
  game.addEventListener('settings:change', () => {
    lobbySummary.textContent = `現在是：${window.Lab.settings.summary()}`;
  });

  atStreet();
})();
