/*
  小遊戲本體：英文單字填空，字母就是店裡的餅乾和麵包。
  主畫面按「開始遊戲」→ 3、2、1 倒數 → 顧客輪流走到櫃台前，每位帶一個挖空的英文單字（附中文提示）。
  玩家按「餅乾櫃 a–m」或「麵包架 n–z」轉過去，點缺的那個字母的商品，小栗就走過去拿回櫃台補上；
  整個字補完，顧客拿著紙袋開心離開；時間到就公布答案。每一題都記進記事本（scripts/notebook.js）。
  最後顯示成績和這一局的單字複習。

  為什麼需要 JS：出題、倒數、判斷對錯、記分、暫停，以及顧客、小栗、鏡頭一步接一步的順序。
  動畫照舊交給 CSS：走路是改擺放位置的 CSS 變數由 transition 補間，鏡頭是 data-camera，表情與紙袋是 data 屬性。
  🔊 用瀏覽器內建的語音合成（Lab.wordBank.speak），不支援的瀏覽器就不顯示按鈕。

  規則（2026-11-21 受訪者覺得太簡單，調難；數字都是 [需確認]）：
    - 一局幾位顧客、出哪幾個等級由設定的拉桿決定（scripts/settings.js），預設 15 位：前 5 位初級、中間 5 位中級、
      最後 5 位高級，各從題庫隨機抽（scripts/words.js、Supabase）
    - 挖空：3–4 個字母挖 2 格、5–6 挖 3 格、7–8 挖 4 格、9 以上挖 5 格；優先挖母音、母音組合、重複字母、字尾的 e；
      初級的第一個字母一定給，中級以上第一個字母也可能挖掉
    - 時間：每位顧客 20 秒＋每格 8 秒，小栗走路也算在時間裡。右上角的鬧鐘：鐘面色塊是剩下的時間，
      過半變橘；剩三成變紅、鈴鐺晃、兩邊冒震動線條、顧客變著急；最後 5 秒整顆跟著震
    - 點錯字母扣 3 秒：商品搖一下、顧客皺一下眉、時鐘閃一下、飄出「−3 秒」
    - 星星：答對 85% 以上三顆、60% 以上兩顆、1 題以上一顆（15 題就是 13、9、1 題）
  電腦也能直接按鍵盤字母（等於點那個商品）；Esc 打開或關上設定選單（暫停）。

  載入順序：words.js → letters.js → settings.js → notebook.js → game.js → book.js → 這支
*/

(function () {
  const game = document.querySelector('[data-game]');
  const Lab = window.Lab;
  if (!game || !Lab.wordBank || !Lab.letters) return;

  const shop = game.querySelector('.shop');
  const clerk = shop.querySelector('.shop__clerk');
  const fixtures = shop.querySelector('.shop__room--fixtures');
  const status = game.querySelector('[data-game-status]');
  const $ = (selector) => game.querySelector(selector);

  const quiz = $('[data-quiz]');
  const quizWho = $('[data-quiz-who]');
  const quizLevel = $('[data-quiz-level]');
  const quizHint = $('[data-quiz-hint]');
  const quizWord = $('[data-quiz-word]');
  const quizMessage = $('[data-quiz-message]');
  const quizSpeak = $('[data-quiz-speak]');

  const hud = $('[data-hud]');
  const clock = $('[data-clock]');
  const clockTime = $('[data-clock-time]');
  const clockPenalty = $('[data-clock-penalty]');
  const pauseMenu = $('[data-settings]');
  const countdown = $('[data-countdown]');

  const result = $('[data-result]');
  const resultStars = $('[data-result-stars]');
  const resultScore = $('[data-result-score]');
  const resultList = $('[data-result-list]');

  // ---------- 規則 ----------

  // 一局幾位顧客、各是什麼等級：設定的拉桿決定（scripts/settings.js）；讀不到設定就用原本的 5 + 5 + 5
  const DEFAULT_PLAN = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3];
  const TIME_BASE = 20; // 每題 20 秒＋每個空格 8 秒 [需確認]
  const TIME_PER_BLANK = 8;
  const WRONG_PENALTY = 3; // 點錯扣 3 秒 [需確認]
  const HALF = 0.5; // 鬧鐘的色塊從綠變橘
  const HURRY = 0.3; // 變紅、鈴鐺晃、顧客著急
  const FINAL = 5; // 最後 5 秒整顆鬧鐘跟著震
  // 3–4 個字母挖 2 格、5–6 挖 3 格、7–8 挖 4 格、9 以上挖 5 格，至少留一個字母
  const blanksFor = (length) => Math.min(length - 1, length <= 4 ? 2 : length <= 6 ? 3 : length <= 8 ? 4 : 5);
  const starsFor = (correct, total) => (correct >= total * 0.85 ? 3 : correct >= total * 0.6 ? 2 : correct >= 1 ? 1 : 0);

  // 顧客從麵包架旁淡入、走到櫃台左前方，結帳完走回去淡出（門在鏡頭背後，從那裡進來會貼著鏡頭冒出來）
  const ENTRANCE = { x: 1060, z: -640 };
  const SPOT = { x: 430, z: -780 };
  const ANIMALS = ['rabbit', 'bear', 'fox'];

  /*
    小栗去拿商品的路線：先在櫃台後面走到櫃台旁邊，再走出來到走道，最後走到商品前面。
    走出櫃台之後換到顧客那一層（疊在店裡擺設上面），走在走道上不會被店裡的東西蓋住；
    回到櫃台旁邊再換回擺設那一層，站在櫃台後面時才會被櫃台擋住下半身。[需確認] 走路速度
  */
  const HOME = { x: 640, z: -1140 };
  const LANES = {
    cookie: { corner: { x: 330, z: -1140 }, front: { x: 330, z: -960 }, pickX: 300 },
    bread: { corner: { x: 970, z: -1140 }, front: { x: 970, z: -960 }, pickX: 1010 },
  };
  const CLERK_SPEED = 0.55; // 每毫秒走幾個單位

  // ---------- 小工具 ----------

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const durationOf = (el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0;
  const tokenMs = (name) => parseFloat(getComputedStyle(game).getPropertyValue(name)) || 0;
  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const { canSpeak, speak } = Lab.wordBank;

  // ---------- 暫停：時間停住、流程停在下一步之前，按繼續才往下 ----------

  let paused = false;
  let resumeWaiters = [];
  const gate = () => (paused ? new Promise((resolve) => resumeWaiters.push(resolve)) : Promise.resolve());
  const pausableWait = async (ms) => {
    await wait(ms);
    await gate();
  };

  // ---------- 鏡頭：櫃台、餅乾櫃、麵包架 ----------

  const CAMERAS = { counter: 'play', cookie: 'shelf-cookie', bread: 'shelf-bread' };
  function setView(view) {
    game.dataset.view = view;
    shop.dataset.camera = CAMERAS[view];
  }

  // ---------- 顧客 ----------

  // 顧客和走出櫃台的小栗放在自己的一層，疊在店裡所有東西上面
  shop.insertAdjacentHTML('beforeend', '<div class="shop__room shop__room--customers" aria-hidden="true"></div>');
  const crowd = shop.lastElementChild;

  let lastAnimal = null;
  function nextAnimal() {
    const options = ANIMALS.filter((a) => a !== lastAnimal);
    lastAnimal = options[Math.floor(Math.random() * options.length)];
    return lastAnimal;
  }

  // 角色畫板 200 × 260、腳底在 y 250：左上角 = (x − 100, 700 − 250)
  const placeVars = ({ x, z }) => `--l: ${x - 100}; --t: 450; --w: 200; --h: 260; --tz: ${z}`;
  function moveTo(el, { x, z }) {
    el.style.setProperty('--l', x - 100);
    el.style.setProperty('--tz', z);
  }

  function spawn(who) {
    crowd.insertAdjacentHTML(
      'beforeend',
      `<div class="character shop__part game__customer" data-character="${who}" data-expression="normal" ` +
        `data-walking="true" data-carry="none" data-bubble="order" data-presence="out" style="${placeVars(ENTRANCE)}"></div>`
    );
    const el = crowd.lastElementChild;
    Lab.characters.mount(el);
    return el;
  }

  async function walk(el, to) {
    el.dataset.walking = 'true';
    moveTo(el, to);
    await wait(durationOf(el));
    el.dataset.walking = 'false';
  }

  // ---------- 小栗 ----------

  let clerkAt = { ...HOME };
  async function clerkTo(point) {
    const distance = Math.hypot(point.x - clerkAt.x, point.z - clerkAt.z);
    clerk.style.setProperty('--move-ms', `${Math.round(distance / CLERK_SPEED)}ms`);
    clerk.dataset.walking = 'true';
    moveTo(clerk, point);
    clerkAt = { ...point };
    await wait(durationOf(clerk));
    clerk.dataset.walking = 'false';
  }

  function resetClerk() {
    clerk.classList.remove('is-moving');
    fixtures.append(clerk);
    clerk.style.removeProperty('--move-ms');
    moveTo(clerk, HOME);
    clerkAt = { ...HOME };
    clerk.dataset.walking = 'false';
    clerk.dataset.expression = 'normal';
    clerk.querySelector('.clerk-letter')?.remove();
  }

  // 走去拿一個字母商品再回到櫃台後面；回傳時小栗已經站回原位
  let busy = false;
  async function fetchLetter(letter, id) {
    busy = true;
    const item = Lab.letters.find(letter);
    const lane = LANES[item.area];
    const pick = { x: lane.pickX, z: Math.max(-1060, Math.min(-200, item.z)) };
    clerk.classList.add('is-moving');

    await clerkTo(lane.corner);
    await clerkTo(lane.front);
    crowd.append(clerk); // 走出櫃台：換到顧客那一層
    await clerkTo(pick);
    if (id !== run) return;

    // 拿起來：商品跳一下，字母浮在小栗頭上帶回去
    item.el.classList.remove('is-picked');
    void item.el.offsetWidth;
    item.el.classList.add('is-picked');
    clerk.insertAdjacentHTML('beforeend', `<span class="clerk-letter" aria-hidden="true">${letter}</span>`);
    await pausableWait(tokenMs('--play-pick-duration'));
    if (id !== run) return;

    setView('counter');
    await clerkTo(lane.front);
    fixtures.append(clerk); // 回到櫃台旁邊：換回擺設那一層
    await clerkTo(lane.corner);
    await clerkTo(HOME);
    clerk.querySelector('.clerk-letter')?.remove();
    clerk.classList.remove('is-moving');
    busy = false;
  }

  // ---------- 題目 ----------

  // 單字和中文可以在 Supabase 後台改，放進 HTML 之前先把特殊字元換掉
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

  // 挖哪幾格：優先挖容易拼錯的地方——母音、母音組合（ea、ie、ou）、重複字母（ll、pp）、字尾不發音的 e；
  // 每格再加一點隨機，同一個字每次挖的地方不一樣。初級第一個字母一定給，中級以上第一個字母也可能挖掉。
  const VOWELS = 'aeiou';
  const tricky = (letters, i) => {
    const [prev, letter, next] = [letters[i - 1], letters[i], letters[i + 1]];
    const vowel = VOWELS.includes(letter);
    let score = Math.random();
    if (vowel) score += 1;
    if (vowel && (VOWELS.includes(prev) || VOWELS.includes(next))) score += 1;
    if (letter === prev || letter === next) score += 1;
    if (letter === 'e' && i === letters.length - 1) score += 0.5;
    return score;
  };

  function makeQuestion(word) {
    const letters = [...word.en];
    const from = word.level === 1 ? 1 : 0;
    const blanks = letters
      .map((_, i) => i)
      .slice(from)
      .map((i) => ({ i, score: tricky(letters, i) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, blanksFor(letters.length))
      .map(({ i }) => i)
      .sort((a, b) => a - b);
    return { ...word, letters, blanks, cursor: 0 };
  }

  function renderQuestion(q, finished) {
    quizWord.style.setProperty('--letters', q.letters.length); // 字越長，每一格越小，一排放得下
    quizWord.innerHTML = q.letters
      .map((letter, i) => {
        const blankIndex = q.blanks.indexOf(i);
        if (blankIndex === -1) return `<span class="quiz__slot">${letter}</span>`;
        const done = blankIndex < q.cursor;
        const cls = done ? 'is-filled' : finished ? 'is-revealed' : blankIndex === q.cursor ? 'is-current' : '';
        return `<span class="quiz__slot quiz__slot--blank ${cls}">${done || finished ? letter : ''}</span>`;
      })
      .join('');
    quizWord.setAttribute(
      'aria-label',
      q.letters.map((letter, i) => (q.blanks.indexOf(i) >= q.cursor && !finished ? '空格' : letter)).join(' ')
    );
  }

  let run = 0;
  let current = null; // 目前這一題：{ q, pick(letter) }

  // left：還剩幾成（0–1），鐘面的色塊照這個畫；data-time 決定鬧鐘現在多急
  function setClock(seconds, left = 1) {
    const s = Math.max(0, Math.ceil(seconds));
    clockTime.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    clock.style.setProperty('--left', Math.max(0, Math.min(1, left)).toFixed(4));
    clock.dataset.time = left <= 0 ? 'plenty' : seconds <= FINAL ? 'final' : left < HURRY ? 'hurry' : left < HALF ? 'half' : 'plenty';
  }
  const hurrying = () => clock.dataset.time === 'hurry' || clock.dataset.time === 'final';

  // 出一題，等字母補齊或時間到；答對回傳 true
  function ask(word, who, customer, id) {
    return new Promise((resolve) => {
      const q = makeQuestion(word);
      const total = (TIME_BASE + TIME_PER_BLANK * q.blanks.length) * 1000;
      let elapsed = 0;
      let last = performance.now();
      let frame = 0;
      let frownTimer = 0;

      quiz.removeAttribute('data-state');
      quizLevel.textContent = Lab.wordBank.LEVELS[q.level];
      quizLevel.dataset.level = q.level;
      quizWho.textContent = `${Lab.characters.names[who]}想要：`;
      quizHint.textContent = q.zh;
      quizMessage.textContent = '按「餅乾櫃」或「麵包架」，去找缺的字母。';
      renderQuestion(q, false);
      quiz.hidden = false;
      setClock(total / 1000, 1);
      $('[data-go="cookie"]').focus({ preventScroll: true });

      const finish = (ok) => {
        cancelAnimationFrame(frame);
        clearTimeout(frownTimer);
        current = null;
        if (ok) q.cursor = q.blanks.length;
        quiz.dataset.state = ok ? 'correct' : 'timeout';
        renderQuestion(q, true);
        quizMessage.textContent = ok ? `答對了！${q.en}，${q.zh}。` : `時間到！答案是 ${q.en}（${q.zh}）。`;
        clock.dataset.time = 'plenty';
        speak(q.en);
        resolve(ok);
      };

      const tick = (now) => {
        if (id !== run) return;
        if (!paused) elapsed += now - last;
        last = now;
        const left = Math.max(0, 1 - elapsed / total);
        setClock((total - elapsed) / 1000, left);
        if (left < HURRY) customer.dataset.expression = 'flustered';
        if (left <= 0) {
          finish(false);
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      current = {
        q,
        async pick(letter) {
          if (busy || paused) return;
          const item = Lab.letters.find(letter);
          if (!item) return;
          const answer = q.letters[q.blanks[q.cursor]];
          if (letter !== answer) {
            // 點錯：商品搖一下、顧客皺眉、時鐘閃一下、飄出「−3 秒」
            item.el.classList.remove('is-wrong');
            void item.el.offsetWidth;
            item.el.classList.add('is-wrong');
            elapsed += WRONG_PENALTY * 1000;
            clock.classList.remove('is-penalty');
            clockPenalty.classList.remove('is-shown');
            void clock.offsetWidth;
            clock.classList.add('is-penalty');
            clockPenalty.classList.add('is-shown');
            quizMessage.textContent = `這是 ${letter}，不是缺的那個字母喔。扣 ${WRONG_PENALTY} 秒。`;
            customer.dataset.expression = 'flustered';
            clearTimeout(frownTimer);
            frownTimer = setTimeout(() => {
              if (!hurrying()) customer.dataset.expression = 'normal';
            }, tokenMs('--play-frown-duration'));
            return;
          }
          quizMessage.textContent = `對！小栗去拿 ${letter} 了。`;
          await fetchLetter(letter, id);
          if (id !== run || current?.q !== q) return; // 已經時間到或換下一位了
          q.cursor++;
          if (q.cursor === q.blanks.length) {
            finish(true);
            return;
          }
          renderQuestion(q, false);
          quizMessage.textContent = '再找下一個缺的字母。';
        },
      };
    });
  }

  // 扣時間的閃一下結束就拿掉，不然會蓋住「時間快到」的晃動
  clockPenalty.textContent = `−${WRONG_PENALTY} 秒`;
  clock.addEventListener('animationend', (event) => {
    if (event.animationName === 'clock-penalty') clock.classList.remove('is-penalty');
    if (event.animationName === 'clock-penalty-float') clockPenalty.classList.remove('is-shown');
  });

  // 點商品（滑鼠、手指，或鍵盤在商品上按 Enter）
  shop.addEventListener('click', (event) => {
    const item = event.target.closest('.letter-item');
    if (item && current) current.pick(item.dataset.letter);
  });
  shop.addEventListener('keydown', (event) => {
    const item = event.target.closest('.letter-item');
    if (item && current && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      current.pick(item.dataset.letter);
    }
  });

  // 電腦：直接按鍵盤字母＝點那個商品；Esc 開關設定
  document.addEventListener('keydown', (event) => {
    if (game.dataset.phase !== 'open') return;
    if (event.key === 'Escape') {
      paused ? resume() : openPause();
      return;
    }
    if (!current || paused || event.metaKey || event.ctrlKey || event.altKey || !/^[a-z]$/i.test(event.key)) return;
    if (event.target.closest('input, textarea')) return;
    current.pick(event.key.toLowerCase());
  });

  // 題目卡上的按鈕：去餅乾櫃、去麵包架、回到櫃台
  quiz.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]');
    if (go && !paused) setView(go.dataset.go);
  });

  quizSpeak.hidden = !canSpeak;
  quizSpeak.addEventListener('click', () => current && speak(current.q.en));

  // ---------- 一位顧客 ----------

  async function serve(word, id) {
    const who = nextAnimal();
    const customer = spawn(who);
    await nextFrame();
    customer.dataset.presence = 'in';
    await walk(customer, SPOT);
    await gate();
    if (id !== run) return false;

    customer.insertAdjacentHTML('beforeend', `<div class="bubble bubble--hint"><span class="bubble__hint">${escapeHTML(word.zh)}</span></div>`);
    const ok = await ask(word, who, customer, id);
    if (id !== run) return false;
    Lab.notebook?.record(word, ok);

    setView('counter');
    customer.dataset.bubble = 'none';
    customer.dataset.expression = ok ? 'happy' : 'flustered';
    if (ok) customer.dataset.carry = 'bag';
    clerk.dataset.expression = ok ? 'happy' : 'flustered';
    await pausableWait(tokenMs('--play-react-duration'));
    if (id !== run) return false;

    quiz.hidden = true;
    await walk(customer, ENTRANCE);
    customer.dataset.presence = 'out';
    await pausableWait(tokenMs('--play-fade-duration'));
    customer.remove();
    clerk.dataset.expression = 'normal';
    return ok;
  }

  // ---------- 一局 ----------

  function updateStatus(served, correct, total) {
    status.textContent = `第 ${Math.min(served + 1, total)}／${total} 位・答對 ${correct} 題`;
  }

  async function runCountdown(id) {
    countdown.hidden = false;
    for (const text of ['3', '2', '1', '開始！']) {
      if (id !== run) return;
      countdown.textContent = text;
      countdown.classList.remove('is-tick');
      void countdown.offsetWidth;
      countdown.classList.add('is-tick');
      await wait(tokenMs('--countdown-step'));
    }
    countdown.hidden = true;
  }

  async function start() {
    const id = ++run;
    const bank = await Lab.wordBank.ready; // 通常早就讀好了（開場、說明書的時間就夠）
    if (id !== run) return;
    clearStage();
    // 主畫面已經把鏡頭轉到櫃台前了；從成績頁「再玩一次」、暫停選單「重新開始」也一樣，就不用等鏡頭
    const moving = shop.dataset.camera !== CAMERAS.counter;
    setView('counter');
    // 照設定的順序出題（由易到難），每個等級各自洗牌抽，同一局不會重複；某個等級的字不夠就少出幾題
    const pools = { 1: shuffle(bank[1]), 2: shuffle(bank[2]), 3: shuffle(bank[3]) };
    const plan = Lab.settings?.plan() ?? DEFAULT_PLAN;
    const words = plan
      .map((level) => {
        const word = pools[level].pop();
        return word && { ...word, level };
      })
      .filter(Boolean);
    const results = [];
    updateStatus(0, 0, words.length);
    status.hidden = false;
    hud.dataset.mode = 'play';
    setClock(TIME_BASE, 1);
    if (moving) await wait(durationOf(shop));
    await runCountdown(id);

    for (const word of words) {
      if (id !== run) return;
      const ok = await serve(word, id);
      if (id !== run) return;
      results.push({ ...word, ok });
      updateStatus(results.length, results.filter((r) => r.ok).length, words.length);
    }
    showResult(results);
  }

  // ---------- 成績 ----------

  const SPEAKER = quizSpeak.innerHTML;

  function showResult(results) {
    const correct = results.filter((r) => r.ok).length;
    const total = results.length;
    const stars = starsFor(correct, total);
    resultStars.innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'is-on' : ''}">★</span>`).join('');
    resultStars.setAttribute('aria-label', `${stars} 顆星`);
    resultScore.textContent = `${total} 位顧客裡，你幫 ${correct} 位拼對了單字。`;
    resultList.innerHTML = results
      .map(
        (r) =>
          `<li class="result__item ${r.ok ? 'is-ok' : 'is-miss'}">` +
          `<span class="result__mark" aria-label="${r.ok ? '答對' : '沒答出來'}">${r.ok ? '✓' : '✗'}</span>` +
          `<span class="result__en">${escapeHTML(r.en)}</span><span class="result__zh">${escapeHTML(r.zh)}</span>` +
          (canSpeak ? `<button type="button" class="result__speak" data-say="${r.en}" aria-label="唸出 ${r.en}">${SPEAKER}</button>` : '') +
          `</li>`
      )
      .join('');
    status.textContent = `營業結束・答對 ${correct}／${total} 題`;
    hud.dataset.mode = 'idle';
    result.hidden = false;
    result.querySelector('[data-play-again]').focus({ preventScroll: true });
  }

  resultList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-say]');
    if (button) speak(button.dataset.say);
  });
  result.querySelector('[data-play-again]').addEventListener('click', start);

  // ---------- 設定選單（暫停）：拉桿、記事本，加上繼續、重新開始、遊戲說明、回到主畫面 ----------
  // 設定視窗本身在 scripts/settings.js；「回到主畫面」由 scripts/game.js 接

  function openPause() {
    if (paused || game.dataset.phase !== 'open' || !result.hidden) return;
    paused = true;
    game.dataset.paused = 'true';
    Lab.settings.open('play');
    if (canSpeak) speechSynthesis.cancel();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    delete game.dataset.paused;
    Lab.settings.close();
    Lab.book?.close();
    const waiters = resumeWaiters;
    resumeWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  $('[data-hud] [data-settings-open]').addEventListener('click', openPause);
  pauseMenu.querySelector('[data-pause-resume]').addEventListener('click', resume);
  pauseMenu.querySelector('[data-pause-restart]').addEventListener('click', () => {
    resume();
    start();
  });
  // 遊戲說明：打開說明書，看完按「回到遊戲」回到設定選單（還是暫停中）
  pauseMenu.querySelector('[data-pause-howto]').addEventListener('click', () => {
    Lab.settings.close();
    Lab.book.open('resume', () => Lab.settings.open('play'));
  });

  // ---------- 開始與重來 ----------

  function clearStage() {
    current = null;
    busy = false;
    quiz.hidden = true;
    result.hidden = true;
    countdown.hidden = true;
    crowd.querySelectorAll('.game__customer').forEach((el) => el.remove());
    resetClerk();
    if (canSpeak) speechSynthesis.cancel();
  }

  game.addEventListener('game:open', start);
  game.addEventListener('game:reset', () => {
    run++;
    if (paused) resume();
    clearStage();
    hud.dataset.mode = 'idle';
    delete game.dataset.view;
  });
})();
