/*
  記事本：考過的單字都記在這裡，從設定視窗打開。長得像一本橫線筆記本（styles/settings.css）。
  每答完一題（答對或時間到）就記一筆：英文、中文、等級、答對幾次、答錯幾次、最後一次考的時間；
  最近考的排在最上面，可以只看「答錯過的」，每個字都能按 🔊 再聽一次。

  為什麼需要 JS：要記住考過的字（存在這台瀏覽器的 localStorage，換電腦或清掉瀏覽器資料就沒了），
  打開時把清單畫出來。[需確認] 要不要之後改存到 Supabase，換一台電腦也看得到

  提供：Lab.notebook.record(word, ok)、Lab.notebook.open(onClose)、Lab.notebook.close()、Lab.notebook.count()
*/

(function () {
  const Lab = (window.Lab = window.Lab || {});
  const game = document.querySelector('[data-game]');
  const dialog = game?.querySelector('[data-notebook]');
  if (!dialog) return;

  const KEY = 'nichinichi-notebook';
  const LEVELS = { 1: '初級', 2: '中級', 3: '高級' };

  const list = dialog.querySelector('[data-notebook-list]');
  const empty = dialog.querySelector('[data-notebook-empty]');
  const summaryText = dialog.querySelector('[data-notebook-summary]');
  const filters = [...dialog.querySelectorAll('[data-notebook-filter]')];
  const clear = dialog.querySelector('[data-notebook-clear]');

  // ---------- 存起來 ----------

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  }

  let notes = load(); // { apple: { en, zh, level, right, wrong, last } }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes));
    } catch {
      // 存不了（無痕模式、空間滿了）就只記在這一次
    }
  }

  function record(word, ok) {
    const before = notes[word.en] || { right: 0, wrong: 0 };
    notes[word.en] = {
      en: word.en,
      zh: word.zh,
      level: word.level,
      right: before.right + (ok ? 1 : 0),
      wrong: before.wrong + (ok ? 0 : 1),
      last: Date.now(),
    };
    save();
  }

  const count = () => Object.keys(notes).length;

  // ---------- 畫出清單 ----------

  // 單字和中文來自 Supabase 後台，放進 HTML 之前先把特殊字元換掉
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
  const SPEAKER = game.querySelector('[data-quiz-speak]')?.innerHTML ?? '';
  const canSpeak = Lab.wordBank?.canSpeak;

  let filter = 'all';
  let clearArmed = 0; // 「清空」要按兩次，第一次只是換字提醒

  function render() {
    const all = Object.values(notes).sort((a, b) => b.last - a.last);
    const missed = all.filter((w) => w.wrong > 0);
    const shown = filter === 'missed' ? missed : all;

    summaryText.textContent = all.length ? `考過 ${all.length} 個單字・答錯過 ${missed.length} 個` : '還沒有考過的單字';
    filters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.notebookFilter === filter)));

    list.innerHTML = shown
      .map(
        (w) =>
          `<li class="notebook__item">` +
          `<span class="notebook__level" data-level="${Number(w.level) || 1}">${LEVELS[w.level] ?? ''}</span>` +
          `<span class="notebook__en">${escapeHTML(w.en)}</span>` +
          `<span class="notebook__zh">${escapeHTML(w.zh)}</span>` +
          `<span class="notebook__tally">` +
          `<span class="notebook__right" aria-label="答對 ${w.right} 次">✓ ${w.right}</span>` +
          `<span class="notebook__wrong" aria-label="答錯 ${w.wrong} 次">✗ ${w.wrong}</span>` +
          `</span>` +
          (canSpeak
            ? `<button type="button" class="notebook__speak" data-say="${escapeHTML(w.en)}" aria-label="唸出 ${escapeHTML(w.en)}">${SPEAKER}</button>`
            : '') +
          `</li>`
      )
      .join('');
    list.hidden = !shown.length;
    empty.hidden = shown.length > 0;
    empty.textContent = all.length ? '沒有答錯過的單字，太厲害了！' : '還沒有考過的單字。玩一局，考過的字就會記在這裡。';
    clear.hidden = !all.length;
  }

  function disarm() {
    clearTimeout(clearArmed);
    clearArmed = 0;
    clear.textContent = '清空記事本';
    clear.classList.remove('is-armed');
  }

  // ---------- 打開、關上 ----------

  let onClose = null;

  function open(closeCallback = null) {
    onClose = closeCallback;
    filter = 'all';
    disarm();
    render();
    dialog.hidden = false;
    list.scrollTop = 0;
    dialog.querySelector('[data-notebook-close]').focus({ preventScroll: true });
  }

  function close() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    disarm();
    if (Lab.wordBank?.canSpeak) speechSynthesis.cancel();
    const callback = onClose;
    onClose = null;
    callback?.();
  }

  dialog.querySelector('[data-notebook-close]').addEventListener('click', close);
  for (const button of filters) {
    button.addEventListener('click', () => {
      filter = button.dataset.notebookFilter;
      render();
    });
  }
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-say]');
    if (button) Lab.wordBank.speak(button.dataset.say);
  });
  clear.addEventListener('click', () => {
    if (!clearArmed) {
      clear.textContent = '再按一次就全部清掉';
      clear.classList.add('is-armed');
      clearArmed = setTimeout(disarm, 3000);
      return;
    }
    disarm();
    notes = {};
    save();
    render();
    dialog.querySelector('[data-notebook-close]').focus({ preventScroll: true });
  });
  // Esc 只關記事本，回到設定視窗（不往下傳，免得連設定、暫停一起關掉）
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  });

  Lab.notebook = { record, open, close, count };
})();
