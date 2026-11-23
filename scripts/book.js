/*
  遊戲說明書：像一本有縫線邊框的小書，每頁一張遊戲截圖配一段說明，可以前後翻。
  打開的時機有三種，只差在按鈕上的字，關上之後都交給呼叫的人（onClose）：
    - 'intro'  導覽結束後第一次打開：最後一頁「看完了」、右上角「跳過說明」，關上之後停在主畫面
    - 'lobby'  從主畫面再打開：最後一頁「看完了」、右上角「關閉」
    - 'resume' 遊戲中從設定選單打開：最後一頁「回到遊戲」、右上角「關閉」

  為什麼需要 JS：翻頁（記住第幾頁、上一頁／下一頁、鍵盤左右鍵）、依打開的時機換按鈕，
  還有翻頁的那張紙：翻的時候要同時看到「翻之前」和「翻之後」兩頁，CSS 只有一份畫面，
  所以先把翻之前的紙複製一份，換頁之後再複製一份，兩份貼在翻起來那張紙的正反面（.book__flip，styles/book.css）。
  紙怎麼轉、陰影怎麼變都是 CSS animation；減少動態效果時直接換頁、不放這層。

  提供：Lab.book.open(mode, onClose)、Lab.book.close()
*/

(function () {
  const game = document.querySelector('[data-game]');
  const book = game?.querySelector('[data-book]');
  if (!book) return;

  const cover = book.querySelector('.book__cover');
  const paper = book.querySelector('.book__paper');
  const pages = [...book.querySelectorAll('[data-book-page]')];
  const prev = book.querySelector('[data-book-prev]');
  const next = book.querySelector('[data-book-next]');
  const finish = book.querySelector('[data-book-finish]');
  const skip = book.querySelector('[data-book-skip]');
  const counter = book.querySelector('[data-book-count]');

  const LABELS = {
    intro: { finish: '看完了', skip: '跳過說明' },
    lobby: { finish: '看完了', skip: '關閉' },
    resume: { finish: '回到遊戲', skip: '關閉' },
  };

  let index = 0;
  let onClose = null;
  let flip = null; // 正在翻的那一層

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 768px)'); // 桌面版是左右兩頁的跨頁

  // ---------- 翻頁的紙 ----------

  // 把現在的紙複製一份當「照片」：拿掉 id（不能重複）
  function snapshot() {
    const copy = paper.cloneNode(true);
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    return copy;
  }

  function layer(className, copy, show) {
    const el = document.createElement('div');
    el.className = className;
    if (show) el.dataset.show = show;
    el.append(copy);
    return el;
  }

  function stopFlip() {
    flip?.remove();
    flip = null;
  }

  // before：換頁之前拍的照片；呼叫的時候真正的書已經換成新的一頁
  function turn(direction, before) {
    stopFlip();
    const after = snapshot();
    const spread = wide.matches;
    const forward = direction === 'forward';

    flip = document.createElement('div');
    flip.className = 'book__flip';
    flip.dataset.turn = direction;
    flip.dataset.layout = spread ? 'spread' : 'single';
    flip.inert = true;
    flip.setAttribute('aria-hidden', 'true');

    const leaf = document.createElement('div');
    leaf.className = 'book__leaf';

    if (spread) {
      // 往前翻：左半邊先留著舊的，右半頁翻過去（正面舊的右半、背面新的左半）；往後翻反過來
      flip.append(layer('book__flip-under', before.cloneNode(true), forward ? 'left' : 'right'));
      leaf.append(
        layer('book__leaf-face book__leaf-face--front', before, forward ? 'right' : 'left'),
        layer('book__leaf-face book__leaf-face--back', after, forward ? 'left' : 'right')
      );
    } else if (forward) {
      // 手機版往前翻：舊的整頁翻走，露出底下新的一頁
      leaf.append(layer('book__leaf-face book__leaf-face--front', before));
    } else {
      // 手機版往後翻：舊的那頁先留著，上一頁翻回來蓋住
      flip.append(layer('book__flip-under', before));
      leaf.append(layer('book__leaf-face book__leaf-face--front', after));
    }

    flip.append(leaf);
    cover.append(flip);
    const current = flip;
    leaf.addEventListener('animationend', (event) => {
      if (event.target === leaf && flip === current) stopFlip();
    });
  }

  // ---------- 換頁 ----------

  function show(i, direction) {
    const target = Math.max(0, Math.min(pages.length - 1, i));
    const animate = direction && target !== index && !reduced() && !book.hidden;
    const before = animate ? snapshot() : null;

    index = target;
    pages.forEach((page, n) => (page.hidden = n !== index));
    counter.textContent = `${index + 1} / ${pages.length}`;
    prev.disabled = index === 0;
    const last = index === pages.length - 1;
    next.hidden = last;
    finish.hidden = !last;

    if (before) turn(direction, before);
  }

  function open(mode = 'intro', closeCallback = null) {
    const labels = LABELS[mode] ?? LABELS.intro;
    onClose = closeCallback;
    finish.textContent = labels.finish;
    skip.textContent = labels.skip;
    stopFlip();
    book.hidden = false;
    show(0);
    book.querySelector('[data-book-title]').focus({ preventScroll: true });
  }

  function close() {
    stopFlip();
    book.hidden = true;
  }

  function done() {
    close();
    const callback = onClose;
    onClose = null;
    callback?.();
  }

  prev.addEventListener('click', () => show(index - 1, 'back'));
  next.addEventListener('click', () => show(index + 1, 'forward'));
  finish.addEventListener('click', done);
  skip.addEventListener('click', done);
  book.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' && index < pages.length - 1) show(index + 1, 'forward');
    if (event.key === 'ArrowLeft' && index > 0) show(index - 1, 'back');
  });

  window.Lab.book = { open, close };
})();
