/*
  遊戲說明書：像一本有縫線邊框的小書，每頁一張遊戲截圖配一段說明，可以前後翻。
    - 導覽結束後打開（mode 'start'）：最後一頁是「開始遊戲」，每一頁右上角也能「跳過說明」直接開始
    - 遊戲中從設定選單打開（mode 'resume'）：最後一頁是「回到遊戲」，右上角是「關閉」

  為什麼需要 JS：翻頁（記住第幾頁、上一頁／下一頁、鍵盤左右鍵）、依打開的時機換按鈕。
  翻頁的動畫是 CSS（.book[data-turn] 觸發），減少動態效果時直接換頁。

  提供：Lab.book.open(mode, onClose)、Lab.book.close()
  開始遊戲時在 .game 上發出 game:book-start，由 scripts/game.js 接著開始營業。
*/

(function () {
  const game = document.querySelector('[data-game]');
  const book = game?.querySelector('[data-book]');
  if (!book) return;

  const pages = [...book.querySelectorAll('[data-book-page]')];
  const prev = book.querySelector('[data-book-prev]');
  const next = book.querySelector('[data-book-next]');
  const finish = book.querySelector('[data-book-finish]');
  const skip = book.querySelector('[data-book-skip]');
  const counter = book.querySelector('[data-book-count]');

  let index = 0;
  let mode = 'start';
  let onClose = null;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(i, direction) {
    index = Math.max(0, Math.min(pages.length - 1, i));
    pages.forEach((page, n) => (page.hidden = n !== index));
    counter.textContent = `${index + 1} / ${pages.length}`;
    prev.disabled = index === 0;
    const last = index === pages.length - 1;
    next.hidden = last;
    finish.hidden = !last;
    if (direction && !reduced()) {
      book.dataset.turn = direction;
      book.addEventListener('animationend', () => delete book.dataset.turn, { once: true });
    }
  }

  function open(openMode = 'start', closeCallback = null) {
    mode = openMode;
    onClose = closeCallback;
    finish.textContent = mode === 'start' ? '開始遊戲' : '回到遊戲';
    skip.textContent = mode === 'start' ? '跳過說明' : '關閉';
    book.hidden = false;
    show(0);
    book.querySelector('[data-book-title]').focus({ preventScroll: true });
  }

  function close() {
    book.hidden = true;
  }

  function done() {
    close();
    if (mode === 'start') game.dispatchEvent(new CustomEvent('game:book-start'));
    else onClose?.();
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
