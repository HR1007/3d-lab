/*
  店裡的背景音樂：慢節奏的 lo-fi 電子音，用瀏覽器內建的 Web Audio 即時合成，沒有任何音檔、沒有版權問題。
  曲子是這裡自己寫的：84 BPM、F 大調、16 小節一輪（約 46 秒）不停循環。
  氣氛參考療癒系經營／料理小遊戲的店內音樂（溫暖的大七和弦、軟軟的電鋼琴琶音、鈴聲旋律、輕輕的鼓），
  旋律與和弦進行都是原創，沒有照抄任何一首曲子。

  為什麼需要 JS：瀏覽器沒有「用 CSS 放音樂」這回事；用 Web Audio 現場合成，不必下載音檔，也能隨時開關。
  瀏覽器規定要使用者先點過畫面才能出聲，所以第一次點遊戲裡的任何地方（例如店門）才開始播。
  右上角的音樂按鈕可以開關，選擇記在這台瀏覽器裡（localStorage，讀不到就當作開著）。

  提供：Lab.music.toggle()、Lab.music.render(context, startTime, bars)（給匯出音檔用，同一份樂譜）
*/

(function () {
  const Lab = (window.Lab = window.Lab || {});

  // ---------- 樂譜 ----------

  const BPM = 84;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const midi = (n) => 440 * 2 ** ((n - 69) / 12);

  // 一小節一個和弦：[名稱, 和弦音（MIDI）, 貝斯根音]
  const CHORDS = [
    ['Fmaj7', [53, 57, 60, 64], 41],
    ['Am7', [57, 60, 64, 67], 45],
    ['Bbmaj7', [58, 62, 65, 69], 46],
    ['C6', [60, 64, 67, 69], 48],
    ['Fmaj7', [53, 57, 60, 64], 41],
    ['Am7', [57, 60, 64, 67], 45],
    ['Gm7', [55, 58, 62, 65], 43],
    ['C7sus4', [60, 65, 67, 70], 48],
    ['Dm7', [62, 65, 69, 72], 50],
    ['Am7', [57, 60, 64, 67], 45],
    ['Bbmaj7', [58, 62, 65, 69], 46],
    ['F/A', [57, 60, 64, 65], 45],
    ['Gm7', [55, 58, 62, 65], 43],
    ['Am7', [57, 60, 64, 67], 45],
    ['Bbmaj7', [58, 62, 65, 69], 46],
    ['C7', [60, 64, 67, 70], 48],
  ];

  // 鈴聲旋律：每小節 [拍, 音, 拍數]，用 F 大調五聲音階為主
  const MELODY = [
    [[0, 69, 1.5], [1.5, 72, 0.5], [2, 69, 1], [3, 67, 1]],
    [[0, 64, 2], [2, 67, 1], [3, 69, 1]],
    [[0, 65, 1.5], [1.5, 69, 0.5], [2, 74, 1.5], [3.5, 72, 0.5]],
    [[0, 72, 3]],
    [[0, 69, 1], [1, 72, 1], [2, 74, 1.5], [3.5, 72, 0.5]],
    [[0, 69, 2], [2, 67, 2]],
    [[0, 65, 1], [1, 67, 1], [2, 69, 1], [3, 74, 1]],
    [[0, 72, 2], [2, 67, 2]],
    [[0, 65, 1], [1, 69, 1], [2, 72, 2]],
    [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 2]],
    [[0, 74, 1], [1, 72, 1], [2, 69, 2]],
    [[0, 72, 4]],
    [[0, 70, 1], [1, 69, 1], [2, 67, 1], [3, 65, 1]],
    [[0, 64, 1.5], [1.5, 67, 0.5], [2, 69, 2]],
    [[0, 74, 2], [2, 72, 1], [3, 69, 1]],
    [[0, 67, 2]],
  ];

  // 電鋼琴琶音：每拍兩個八分音符，依序彈和弦裡的第幾個音（4 以上是高八度）
  const ARP = [0, 2, 1, 3, 2, 4, 3, 1];

  // ---------- 音色 ----------

  // 一個「錄音室」：所有樂器接到同一組殘響、延遲、總音量上；即時播放和匯出音檔都用它
  function studio(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0.55;
    const warm = ctx.createBiquadFilter(); // 整體收掉一點高頻，聲音比較溫暖
    warm.type = 'lowpass';
    warm.frequency.value = 9000;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18;
    glue.ratio.value = 3;
    warm.connect(glue).connect(master).connect(ctx.destination);

    // 殘響：用逐漸變小的雜訊做一段 2.6 秒的空間感
    const reverb = ctx.createConvolver();
    const length = Math.floor(ctx.sampleRate * 2.6);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
    }
    reverb.buffer = impulse;
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.35;
    reverbSend.connect(reverb).connect(warm);

    // 附點八分音符的回聲，給琶音和鈴聲用
    const delay = ctx.createDelay(2);
    delay.delayTime.value = BEAT * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.22;
    delaySend.connect(delay).connect(feedback).connect(delay);
    delay.connect(warm);

    // 一秒的白雜訊，給鼓用
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    return { ctx, master, dry: warm, reverbSend, delaySend, noise };
  }

  // 接到乾聲、殘響、回聲（各自的量）
  function route(s, node, { dry = 1, reverb = 0, delay = 0 }) {
    const gain = (value, to) => {
      if (!value) return;
      const g = s.ctx.createGain();
      g.gain.value = value;
      node.connect(g).connect(to);
    };
    gain(dry, s.dry);
    gain(reverb, s.reverbSend);
    gain(delay, s.delaySend);
  }

  function envelope(param, t, { attack, peak, decay, sustain = 0, release, length }) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setTargetAtTime(sustain, t + attack, decay / 3);
    const end = t + Math.max(length, attack + decay);
    param.setValueAtTime(sustain || 0.0001, end);
    param.linearRampToValueAtTime(0, end + release);
    return end + release;
  }

  // 軟軟的弦樂墊底：兩個稍微走音的鋸齒波，濾掉高頻，慢慢淡入淡出
  function pad(s, note, t, length) {
    const { ctx } = s;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850;
    filter.Q.value = 0.4;
    const amp = ctx.createGain();
    filter.connect(amp);
    route(s, amp, { dry: 0.6, reverb: 0.8 });
    const end = envelope(amp.gain, t, { attack: 0.9, peak: 0.035, decay: 1, sustain: 0.03, release: 1.2, length });
    for (const detune of [-8, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midi(note);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }

  // 電鋼琴：三角波加一點高八度的正弦，彈下去很快變小
  function keys(s, note, t, velocity) {
    const { ctx } = s;
    const amp = ctx.createGain();
    route(s, amp, { dry: 0.7, reverb: 0.5, delay: 0.6 });
    const end = envelope(amp.gain, t, { attack: 0.006, peak: 0.09 * velocity, decay: 0.7, release: 0.2, length: 0.05 });
    for (const [type, ratio, level] of [
      ['triangle', 1, 1],
      ['sine', 2, 0.25],
    ]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = level;
      osc.type = type;
      osc.frequency.value = midi(note) * ratio;
      osc.connect(g).connect(amp);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }

  // 鈴聲旋律：正弦波加上不整數倍的泛音，像小鐵琴
  function bell(s, note, t, length) {
    const { ctx } = s;
    const amp = ctx.createGain();
    route(s, amp, { dry: 0.6, reverb: 0.7, delay: 0.5 });
    const end = envelope(amp.gain, t, { attack: 0.004, peak: 0.075, decay: Math.min(1.6, length * BEAT + 0.6), release: 0.3, length: 0.05 });
    for (const [ratio, level] of [
      [1, 1],
      [2.76, 0.18],
      [5.4, 0.06],
    ]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = level;
      osc.type = 'sine';
      osc.frequency.value = midi(note) * ratio;
      osc.connect(g).connect(amp);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }

  // 貝斯：圓圓的正弦波
  function bass(s, note, t, length) {
    const { ctx } = s;
    const amp = ctx.createGain();
    route(s, amp, { dry: 1 });
    const end = envelope(amp.gain, t, { attack: 0.02, peak: 0.22, decay: 0.4, sustain: 0.14, release: 0.15, length });
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midi(note);
    osc.connect(amp);
    osc.start(t);
    osc.stop(end + 0.05);
  }

  function kick(s, t) {
    const { ctx } = s;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    amp.gain.setValueAtTime(0.5, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(amp);
    route(s, amp, { dry: 1 });
    osc.start(t);
    osc.stop(t + 0.35);
  }

  function noiseHit(s, t, { type, frequency, q = 0.8, level, length, reverb = 0 }) {
    const { ctx } = s;
    const src = ctx.createBufferSource();
    src.buffer = s.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(level, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + length);
    src.connect(filter).connect(amp);
    route(s, amp, { dry: 1, reverb });
    src.start(t);
    src.stop(t + length + 0.02);
  }

  // ---------- 把第 bar 小節排進時間軸 ----------

  const SWING = 0.08; // 反拍的八分音符稍微晚一點，比較慵懶

  function scheduleBar(s, bar, t, loop) {
    const [, chord, root] = CHORDS[bar % CHORDS.length];
    const at = (beat) => t + beat * BEAT + (beat % 1 === 0.5 ? SWING * BEAT : 0);

    for (const note of chord) pad(s, note, t, BAR);

    bass(s, root, at(0), BEAT * 1.6);
    bass(s, root, at(2.5), BEAT * 0.9);
    bass(s, root + 12, at(3.5), BEAT * 0.4);

    // 第一輪的頭兩小節只有和弦，琶音、鼓慢慢加進來
    const intro = loop === 0 && bar < 2;
    if (!intro) {
      ARP.forEach((step, i) => {
        const note = chord[step % 4] + (step >= 4 ? 12 : 0) + 12;
        keys(s, note, at(i / 2), i % 2 ? 0.7 : 1);
      });
      kick(s, at(0));
      kick(s, at(2.5));
      noiseHit(s, at(1), { type: 'bandpass', frequency: 1600, level: 0.12, length: 0.18, reverb: 0.4 });
      noiseHit(s, at(3), { type: 'bandpass', frequency: 1600, level: 0.12, length: 0.18, reverb: 0.4 });
      for (let i = 0; i < 8; i++) {
        noiseHit(s, at(i / 2), { type: 'highpass', frequency: 7500, level: i % 2 ? 0.035 : 0.05, length: 0.045 });
      }
    }

    for (const [beat, note, length] of MELODY[bar % MELODY.length]) bell(s, note, at(beat), length);
  }

  // 一次排好好幾個小節（匯出音檔用）
  function render(ctx, startTime, bars) {
    const s = studio(ctx);
    for (let i = 0; i < bars; i++) scheduleBar(s, i, startTime + i * BAR, Math.floor(i / CHORDS.length));
    return startTime + bars * BAR;
  }

  // ---------- 即時播放 ----------

  const KEY = 'nichinichi-music';
  const readPref = () => {
    try {
      return localStorage.getItem(KEY) !== 'off';
    } catch {
      return true;
    }
  };
  const writePref = (on) => {
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* 存不了就算了，下次照樣預設開著 */
    }
  };

  let s = null; // 播放中的錄音室
  let timer = 0;
  let bar = 0;
  let loop = 0;
  let nextTime = 0;
  let on = readPref();

  const VOLUME = 0.55;
  const LOOKAHEAD = 0.4; // 先排好接下來 0.4 秒內要響的音

  function tick() {
    while (nextTime < s.ctx.currentTime + LOOKAHEAD) {
      scheduleBar(s, bar, nextTime, loop);
      nextTime += BAR;
      bar = (bar + 1) % CHORDS.length;
      if (bar === 0) loop++;
    }
  }

  function start() {
    if (!s) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      s = studio(new Context());
      nextTime = s.ctx.currentTime + 0.1;
      timer = setInterval(tick, 100);
      tick();
    }
    s.ctx.resume();
    s.master.gain.cancelScheduledValues(s.ctx.currentTime);
    s.master.gain.setTargetAtTime(VOLUME, s.ctx.currentTime, 0.4);
  }

  function stop() {
    if (!s) return;
    s.master.gain.cancelScheduledValues(s.ctx.currentTime);
    s.master.gain.setTargetAtTime(0, s.ctx.currentTime, 0.15);
    setTimeout(() => {
      if (!on && s) s.ctx.suspend();
    }, 600);
  }

  const buttons = () => document.querySelectorAll('[data-music-toggle]');
  function renderButtons() {
    for (const button of buttons()) {
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? '音樂：開（按一下關掉）' : '音樂：關（按一下打開）');
    }
  }

  function toggle() {
    // 還沒開始播（使用者第一下就按音樂按鈕）：按鈕顯示「開」，所以這一下是開始播，不是關掉
    if (on && (!s || s.ctx.state !== 'running')) {
      start();
      return;
    }
    on = !on;
    writePref(on);
    renderButtons();
    on ? start() : stop();
  }

  for (const button of buttons()) button.addEventListener('click', toggle);
  renderButtons();

  // 瀏覽器要使用者先互動過才能出聲：第一次點遊戲裡的任何地方（或按鍵）就開始
  const game = document.querySelector('[data-game]');
  const firstTouch = (event) => {
    if (event.target.closest?.('[data-music-toggle]')) return; // 按的是音樂按鈕就交給 toggle
    if (on) start();
    game?.removeEventListener('pointerdown', firstTouch);
    document.removeEventListener('keydown', firstTouch);
  };
  game?.addEventListener('pointerdown', firstTouch);
  document.addEventListener('keydown', firstTouch);

  // state()：'running' 正在播、'suspended' 暫停、'off' 還沒開始（測試、除錯用）
  Lab.music = { toggle, render, BAR, BARS: CHORDS.length, state: () => (s ? s.ctx.state : 'off') };
})();
