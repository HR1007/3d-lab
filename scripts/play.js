/*
  小遊戲本體（6-2）：英文單字填空。
  「開始營業」之後接手：15 位顧客輪流走到櫃台前，每一位帶一題挖空的英文單字（附中文提示），
  玩家從 3 個字母裡選出缺的那一個，整個字補完就完成這筆訂單，顧客拿著紙袋開心離開；
  時間到就公布答案，顧客著急地離開。最後顯示成績與這一局的 15 個單字，方便複習。

  為什麼需要 JS：出題（隨機抽字、挖空、產生選項）、倒數計時、判斷對錯、記分，以及顧客一位接一位的順序。
  動畫照舊交給 CSS：顧客走路是改 --l / --tz 由 transition 補間，表情、紙袋、泡泡是 data 屬性。
  🔊 用瀏覽器內建的語音合成（speechSynthesis），不用另外裝任何東西；不支援的瀏覽器就不顯示按鈕。

  規則 [需確認]：
    - 每局 15 位顧客、15 個不重複的字
    - 挖空：4 個字母以內挖 1 個、5–6 個挖 2 個、7 個以上挖 3 個；第一個字母不挖，留著當提示
    - 選項：缺的字母＋2 個干擾字母；缺的是母音就從其他母音挑，是子音就從其他子音挑，不會一眼看穿
    - 時間：30 秒＋每個空格 10 秒；剩三成時顧客變著急；時間到公布答案
    - 選錯不扣時間，只有那顆按鈕搖一下、顧客皺一下眉。電腦也可以直接按鍵盤的字母

  載入順序：words.js（單字）→ characters.js（顧客）→ game.js（開場）→ 這支
*/

(function () {
  const game = document.querySelector('[data-game]');
  const Lab = window.Lab;
  if (!game || !Lab.words) return;

  const shop = game.querySelector('.shop');
  const clerk = shop.querySelector('.shop__clerk');
  const status = game.querySelector('[data-game-status]');

  const quiz = game.querySelector('[data-quiz]');
  const quizWho = quiz.querySelector('[data-quiz-who]');
  const quizHint = quiz.querySelector('[data-quiz-hint]');
  const quizWord = quiz.querySelector('[data-quiz-word]');
  const quizChoices = quiz.querySelector('[data-quiz-choices]');
  const quizMessage = quiz.querySelector('[data-quiz-message]');
  const quizSpeak = quiz.querySelector('[data-quiz-speak]');

  const result = game.querySelector('[data-result]');
  const resultStars = result.querySelector('[data-result-stars]');
  const resultScore = result.querySelector('[data-result-score]');
  const resultList = result.querySelector('[data-result-list]');

  // ---------- 規則 [需確認] ----------

  const ROUND = 15;
  const TIME_BASE = 30; // 秒
  const TIME_PER_BLANK = 10; // 秒
  const HURRY = 0.3; // 剩下三成時間時顧客變著急
  const VOWELS = 'aeiou';
  const CONSONANTS = 'bcdfghklmnprstvwy';
  const blanksFor = (length) => (length <= 4 ? 1 : length <= 6 ? 2 : 3);

  // 顧客從麵包架旁邊淡入、走到櫃台左前方（不擋到櫃台後面的小栗），結帳完走回去淡出 [需確認]
  // 門其實在鏡頭背後，從那裡走進來會先貼著鏡頭出現一隻很大的顧客，所以改從畫面右邊進出
  const ENTRANCE = { x: 1060, z: -640 };
  const SPOT = { x: 430, z: -780 };
  const ANIMALS = ['rabbit', 'bear', 'fox'];

  // ---------- 小工具 ----------

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const durationOf = (el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0;
  // 時間長度的 token（例如 "1400ms"）換成毫秒；減少動態效果時 CSS 會把它設成 0ms
  const tokenMs = (name) => parseFloat(getComputedStyle(game).getPropertyValue(name)) || 0;

  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 一題：哪些位置挖空（第一個字母不挖），依位置先後補
  function makeQuestion(word) {
    const letters = [...word.en];
    const candidates = letters.map((_, i) => i).slice(1);
    const blanks = shuffle(candidates)
      .slice(0, blanksFor(letters.length))
      .sort((a, b) => a - b);
    return { ...word, letters, blanks, cursor: 0 };
  }

  function choicesFor(letter) {
    const pool = VOWELS.includes(letter) ? VOWELS : CONSONANTS;
    const others = shuffle([...pool].filter((c) => c !== letter)).slice(0, 2);
    return shuffle([letter, ...others]);
  }

  // 🔊 唸出英文
  const canSpeak = 'speechSynthesis' in window;
  function speak(text) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  }

  // ---------- 顧客 ----------

  // 顧客放在自己的一層，疊在店裡所有東西上面（顧客站在櫃台前面，不會被店裡的東西擋到）
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

  function setClerk(expression) {
    if (clerk) clerk.dataset.expression = expression;
  }

  // ---------- 題目卡 ----------

  let run = 0; // 每次開新的一局（或回到店門口）就換號碼，還在等的舊流程醒來就停
  let current = null; // 目前這一題：{ q, choose(letter, button) }

  function renderQuestion(q, finished) {
    quizWord.innerHTML = q.letters
      .map((letter, i) => {
        const blankIndex = q.blanks.indexOf(i);
        if (blankIndex === -1) return `<span class="quiz__slot">${letter}</span>`;
        const done = blankIndex < q.cursor;
        const cls = done ? 'is-filled' : finished ? 'is-revealed' : blankIndex === q.cursor ? 'is-current' : '';
        const shown = done || finished ? letter : '';
        return `<span class="quiz__slot quiz__slot--blank ${cls}">${shown}</span>`;
      })
      .join('');
    // 讀螢幕的軟體：缺字的地方唸成「空格」
    quizWord.setAttribute(
      'aria-label',
      q.letters.map((letter, i) => (q.blanks.indexOf(i) >= q.cursor && !finished ? '空格' : letter)).join(' ')
    );

    if (finished) {
      quizChoices.innerHTML = '';
      return;
    }
    const answer = q.letters[q.blanks[q.cursor]];
    quizChoices.innerHTML = choicesFor(answer)
      .map((c) => `<button type="button" class="quiz__choice" data-letter="${c}" aria-label="字母 ${c}">${c}</button>`)
      .join('');
  }

  // 出一題，等玩家答完或時間到；答對回傳 true
  function ask(word, who, customer, id) {
    return new Promise((resolve) => {
      const q = makeQuestion(word);
      const total = (TIME_BASE + TIME_PER_BLANK * q.blanks.length) * 1000;
      const started = performance.now();
      let frame = 0;
      let frownTimer = 0;

      quiz.removeAttribute('data-state');
      quiz.dataset.hurry = 'false';
      quiz.style.setProperty('--time-left', 1);
      quizWho.textContent = `${Lab.characters.names[who]}想要：`;
      quizHint.textContent = q.zh;
      quizMessage.textContent = '';
      renderQuestion(q, false);
      quiz.hidden = false;
      quizChoices.querySelector('button')?.focus({ preventScroll: true });

      const finish = (ok) => {
        cancelAnimationFrame(frame);
        clearTimeout(frownTimer);
        current = null;
        q.cursor = ok ? q.blanks.length : q.cursor;
        quiz.dataset.state = ok ? 'correct' : 'timeout';
        renderQuestion(q, true);
        quizMessage.textContent = ok ? `答對了！${q.en}，${q.zh}。` : `時間到！答案是 ${q.en}（${q.zh}）。`;
        speak(q.en);
        resolve(ok);
      };

      const tick = () => {
        if (id !== run) return;
        const left = Math.max(0, 1 - (performance.now() - started) / total);
        quiz.style.setProperty('--time-left', left);
        const hurry = left < HURRY;
        quiz.dataset.hurry = String(hurry);
        if (hurry) customer.dataset.expression = 'flustered';
        if (left <= 0) {
          finish(false);
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      current = {
        q,
        choose(letter, button) {
          const answer = q.letters[q.blanks[q.cursor]];
          if (letter === answer) {
            q.cursor++;
            if (q.cursor === q.blanks.length) {
              finish(true);
              return;
            }
            renderQuestion(q, false);
            quizChoices.querySelector('button')?.focus({ preventScroll: true });
            return;
          }
          // 選錯：按鈕搖一下、顧客皺一下眉，不扣時間
          if (button) {
            button.classList.remove('is-wrong');
            void button.offsetWidth;
            button.classList.add('is-wrong');
          }
          quizMessage.textContent = `不是 ${letter}，再試試看。`;
          customer.dataset.expression = 'flustered';
          clearTimeout(frownTimer);
          frownTimer = setTimeout(() => {
            if (quiz.dataset.hurry !== 'true') customer.dataset.expression = 'normal';
          }, tokenMs('--play-frown-duration'));
        },
      };
    });
  }

  quizChoices.addEventListener('click', (event) => {
    const button = event.target.closest('[data-letter]');
    if (button && current) current.choose(button.dataset.letter, button);
  });

  // 電腦：直接按鍵盤的字母也能作答
  document.addEventListener('keydown', (event) => {
    if (!current || event.metaKey || event.ctrlKey || event.altKey || !/^[a-z]$/i.test(event.key)) return;
    const letter = event.key.toLowerCase();
    current.choose(letter, quizChoices.querySelector(`[data-letter="${letter}"]`));
  });

  quizSpeak.hidden = !canSpeak;
  quizSpeak.addEventListener('click', () => current && speak(current.q.en));

  // ---------- 一位顧客 ----------

  async function serve(word, id) {
    const who = nextAnimal();
    const customer = spawn(who);
    await nextFrame(); // 先在入口站定（透明），下一格再淡入、開始走，transition 才有起點
    customer.dataset.presence = 'in';
    await walk(customer, SPOT);
    if (id !== run) return false;

    // 頭上的泡泡寫中文提示，提醒這位要的是什麼
    customer.insertAdjacentHTML('beforeend', `<div class="bubble bubble--hint"><span class="bubble__hint">${word.zh}</span></div>`);
    const ok = await ask(word, who, customer, id);
    if (id !== run) return false;

    customer.dataset.bubble = 'none';
    customer.dataset.expression = ok ? 'happy' : 'flustered';
    if (ok) customer.dataset.carry = 'bag';
    setClerk(ok ? 'happy' : 'flustered');
    await wait(tokenMs('--play-react-duration'));
    if (id !== run) return false;

    quiz.hidden = true;
    await walk(customer, ENTRANCE);
    customer.dataset.presence = 'out';
    await wait(tokenMs('--play-fade-duration'));
    customer.remove();
    setClerk('normal');
    return ok;
  }

  // ---------- 一局 ----------

  function updateStatus(served, correct) {
    status.textContent = `第 ${Math.min(served + 1, ROUND)}／${ROUND} 位・答對 ${correct} 題`;
  }

  async function start() {
    const id = ++run;
    clearStage();
    shop.dataset.camera = 'play';
    const words = shuffle(Lab.words).slice(0, ROUND);
    const results = [];
    updateStatus(0, 0);
    status.hidden = false;
    await wait(durationOf(shop));

    for (const word of words) {
      if (id !== run) return;
      const ok = await serve(word, id);
      if (id !== run) return;
      results.push({ ...word, ok });
      updateStatus(results.length, results.filter((r) => r.ok).length);
    }
    showResult(results);
  }

  // ---------- 成績 ----------

  // [需確認] 13 題以上三顆星、9 題以上兩顆、至少答對 1 題一顆
  const starsFor = (correct) => (correct >= 13 ? 3 : correct >= 9 ? 2 : correct >= 1 ? 1 : 0);

  function showResult(results) {
    const correct = results.filter((r) => r.ok).length;
    const stars = starsFor(correct);
    resultStars.innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'is-on' : ''}">★</span>`).join('');
    resultStars.setAttribute('aria-label', `${stars} 顆星`);
    resultScore.textContent = `${ROUND} 位顧客裡，你幫 ${correct} 位拼對了單字。`;
    resultList.innerHTML = results
      .map(
        (r) =>
          `<li class="result__item ${r.ok ? 'is-ok' : 'is-miss'}">` +
          `<span class="result__mark" aria-label="${r.ok ? '答對' : '沒答出來'}">${r.ok ? '✓' : '✗'}</span>` +
          `<span class="result__en">${r.en}</span><span class="result__zh">${r.zh}</span>` +
          (canSpeak ? `<button type="button" class="result__speak" data-say="${r.en}" aria-label="唸出 ${r.en}">${SPEAKER}</button>` : '') +
          `</li>`
      )
      .join('');
    status.textContent = `營業結束・答對 ${correct}／${ROUND} 題`;
    result.hidden = false;
    result.querySelector('[data-play-again]').focus({ preventScroll: true });
  }

  const SPEAKER = quizSpeak.innerHTML; // 成績頁每個單字旁的 🔊 跟題目卡用同一個圖示

  resultList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-say]');
    if (button) speak(button.dataset.say);
  });

  result.querySelector('[data-play-again]').addEventListener('click', start);

  // ---------- 開始與重來 ----------

  function clearStage() {
    current = null;
    quiz.hidden = true;
    result.hidden = true;
    crowd.innerHTML = '';
    setClerk('normal');
    if (canSpeak) speechSynthesis.cancel();
  }

  game.addEventListener('game:open', start);
  game.addEventListener('game:reset', () => {
    run++;
    clearStage();
  });
})();
