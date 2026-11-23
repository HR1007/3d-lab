/*
  設定：用拉桿調整「單字難度」和「單字量」，記在這台瀏覽器裡（localStorage，讀不到就用預設：普通、15 個）。
  同一個視窗有兩種樣子（.settings[data-mode]）：
    - 'lobby' 從主畫面打開：兩個拉桿、記事本、「完成」
    - 'play'  營業中按齒輪：遊戲暫停，多了繼續、重新開始、遊戲說明、回到主畫面
              （這幾顆按鈕由 scripts/play.js、game.js 接；改了設定從下一局開始）

  單字難度（5 段）決定一局出哪幾個等級的字，單字量平均分給這幾個等級、由易到難排：
    1 很簡單 只有初級／2 簡單 初級＋中級／3 普通 初級→中級→高級（原本的玩法）／4 困難 中級＋高級／5 超難 只有高級
  [需確認] 分段的名稱、單字量的範圍（5–30，每格 5 個）

  為什麼需要 JS：記住選擇、拉桿旁邊的文字跟著換、算出這一局每一題要出哪個等級。
  拉桿本身是原生的 <input type="range">（滑鼠、手指拖、鍵盤左右鍵都能用），樣式在 styles/settings.css；
  拉過的那一段有多長由這裡寫進 --fill。

  提供：Lab.settings.value → { difficulty, count }
        Lab.settings.plan() → 這一局每一題的等級，例如 [1, 1, 1, 1, 1, 2, …]
        Lab.settings.summary() → 「普通・15 個單字」
        Lab.settings.open(mode, onClose)、Lab.settings.close()、Lab.settings.isOpen()
  改了設定會在 .game 上發出 settings:change。
*/

(function () {
  const Lab = (window.Lab = window.Lab || {});
  const game = document.querySelector('[data-game]');
  const dialog = game?.querySelector('[data-settings]');
  if (!dialog) return;

  const KEY = 'nichinichi-settings';
  const DIFFICULTY = {
    1: { name: '很簡單', levels: [1], hint: '只出初級的字。' },
    2: { name: '簡單', levels: [1, 2], hint: '初級、中級，先易後難。' },
    3: { name: '普通', levels: [1, 2, 3], hint: '初級 → 中級 → 高級，越後面越難。' },
    4: { name: '困難', levels: [2, 3], hint: '中級、高級，先易後難。' },
    5: { name: '超難', levels: [3], hint: '只出高級的字（7 個字母以上）。' },
  };
  const LEVEL_NAMES = { 1: '初級', 2: '中級', 3: '高級' };

  const inputs = [...dialog.querySelectorAll('[data-setting]')];
  const title = dialog.querySelector('[data-settings-title]');
  const notebookCount = dialog.querySelector('[data-notebook-count]');
  const DEFAULTS = Object.fromEntries(inputs.map((input) => [input.dataset.setting, Number(input.defaultValue)]));

  // 存的值超出拉桿的範圍（例如之後改了範圍）就夾回來、對齊刻度
  function fit(input, value) {
    const min = Number(input.min);
    const max = Number(input.max);
    const step = Number(input.step) || 1;
    if (!Number.isFinite(value)) return Number(input.defaultValue);
    return Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step));
  }

  function load() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      // 讀不到（無痕模式、被擋）就用預設
    }
    return Object.fromEntries(inputs.map((input) => [input.dataset.setting, fit(input, Number(saved[input.dataset.setting] ?? NaN))]));
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // 存不了就只在這一次有效
    }
  }

  const state = { ...DEFAULTS, ...load() };

  // ---------- 這一局出什麼 ----------

  // 單字量平均分給這個難度的幾個等級，除不盡的多給比較簡單的等級；由易到難排好
  function plan(difficulty = state.difficulty, count = state.count) {
    const { levels } = DIFFICULTY[difficulty];
    const per = Math.floor(count / levels.length);
    const extra = count % levels.length;
    return levels.flatMap((level, i) => Array(per + (i < extra ? 1 : 0)).fill(level));
  }

  const summary = () => `${DIFFICULTY[state.difficulty].name}・${state.count} 個單字`;

  // ---------- 拉桿旁邊的文字 ----------

  const TEXT = {
    difficulty: (value) => ({
      out: DIFFICULTY[value].name,
      hint: DIFFICULTY[value].hint,
      spoken: `${DIFFICULTY[value].name}，${DIFFICULTY[value].levels.map((l) => LEVEL_NAMES[l]).join('、')}`,
    }),
    count: (value) => {
      const counts = {};
      for (const level of plan(state.difficulty, value)) counts[level] = (counts[level] || 0) + 1;
      const split = Object.entries(counts).map(([level, n]) => `${LEVEL_NAMES[level]} ${n}`).join('、');
      return { out: `${value} 個`, hint: `一局 ${value} 位顧客：${split}。`, spoken: `${value} 個單字` };
    },
  };

  function render() {
    for (const input of inputs) {
      const key = input.dataset.setting;
      const value = state[key];
      const text = TEXT[key](value);
      input.value = value;
      input.style.setProperty('--fill', `${((value - input.min) / (input.max - input.min)) * 100}%`);
      input.setAttribute('aria-valuetext', text.spoken);
      dialog.querySelector(`[data-setting-out="${key}"]`).textContent = text.out;
      dialog.querySelector(`[data-setting-hint="${key}"]`).textContent = text.hint;
      for (const tick of input.parentElement.querySelectorAll('[data-tick]')) {
        tick.classList.toggle('is-current', Number(tick.dataset.tick) === value);
      }
    }
    if (notebookCount && Lab.notebook) {
      const n = Lab.notebook.count();
      notebookCount.textContent = n ? `已經考過 ${n} 個單字` : '還沒有考過的單字';
    }
  }

  for (const input of inputs) {
    input.addEventListener('input', () => {
      state[input.dataset.setting] = Number(input.value);
      save();
      render();
      game.dispatchEvent(new CustomEvent('settings:change', { detail: { ...state } }));
    });
  }

  // ---------- 打開、關上 ----------

  let onClose = null;

  function open(mode = 'lobby', closeCallback = null) {
    dialog.dataset.mode = mode;
    onClose = closeCallback;
    title.textContent = mode === 'play' ? '暫停' : '設定';
    render();
    dialog.hidden = false;
    const first = mode === 'play' ? dialog.querySelector('[data-pause-resume]') : inputs[0];
    first.focus({ preventScroll: true });
  }

  function close() {
    if (dialog.hidden) return;
    Lab.notebook?.close();
    dialog.hidden = true;
    const callback = onClose;
    onClose = null;
    callback?.();
  }

  dialog.querySelector('[data-settings-done]').addEventListener('click', close);
  dialog.querySelector('[data-notebook-open]').addEventListener('click', () => {
    Lab.notebook?.open(() => {
      render(); // 記事本可能被清空了
      dialog.querySelector('[data-notebook-open]').focus({ preventScroll: true });
    });
  });

  // 主畫面打開的設定：Esc 關上（營業中的 Esc 交給 scripts/play.js：關上設定＝繼續遊戲）
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog.dataset.mode === 'lobby') {
      event.stopPropagation();
      close();
    }
  });

  Lab.settings = {
    get value() {
      return { ...state };
    },
    DIFFICULTY,
    plan,
    summary,
    open,
    close,
    isOpen: () => !dialog.hidden,
  };
})();
