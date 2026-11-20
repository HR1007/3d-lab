/*
  對話泡泡與訂單卡。

  為什麼需要 JS：
    - 泡泡和訂單卡要從同一張訂單產生（商品圖示、數量），遊戲裡每位顧客的訂單都是隨機的
    - 點泡泡要打開訂單卡；按關閉或 Esc 收起來時，焦點要回到泡泡，鍵盤也能完整操作
  泡泡要顯示完整訂單、收合成「…」或不顯示，是角色上的 data-bubble 屬性，外觀交給 CSS。

  標記：
    <div class="character" data-character="rabbit" data-order="chip:2,croissant:1" data-bubble="order">
      角色身上有 data-order 就會長出一個泡泡。泡泡是角色的子元素，跟著角色一起在 3D 空間裡移動
    <div class="order-card" data-order-card hidden></div>
      訂單卡的空殼，點任何一個泡泡都會在這裡打開那位顧客的訂單

  載入順序：scripts/props.js（商品與圖示）→ scripts/characters.js（角色與稱呼）→ 這支
*/

(function () {
  const Lab = (window.Lab = window.Lab || {});
  const { ensureDefs, cookieIcon, bread } = Lab.props;
  const names = Lab.characters.names;
  ensureDefs(); // 泡泡和訂單卡裡的商品圖示是 <use> 引用 symbol，頁面上沒有展示櫃時也要先放好
  const products = Object.fromEntries(Lab.products.map((p) => [p.id, p]));

  const icon = (id) => (products[id].kind === 'cookie' ? cookieIcon(id) : bread(id).svg);

  // 訂單的文字格式 "chip:2,croissant:1" ↔ [{ id: 'chip', qty: 2 }, { id: 'croissant', qty: 1 }]
  const parse = (text) =>
    text.split(',').map((entry) => {
      const [id, qty] = entry.split(':');
      return { id: id.trim(), qty: Number(qty) || 1 };
    });
  const count = (order) => order.reduce((sum, item) => sum + item.qty, 0);

  // ---------- 泡泡 ----------

  function bubbleHTML(who, order) {
    const items = order
      .map(({ id, qty }) => `<span class="bubble__item">${icon(id)}<span class="bubble__qty">×${qty}</span></span>`)
      .join('');
    return (
      `<button type="button" class="bubble" aria-label="${who}的訂單，共 ${count(order)} 件，打開訂單卡">` +
      `<span class="bubble__items" aria-hidden="true">${items}</span>` +
      `<span class="bubble__dots" aria-hidden="true"><span></span><span></span><span></span></span>` +
      `</button>`
    );
  }

  // 依角色的 data-order 長出（或換掉）頭上的泡泡，回傳泡泡按鈕
  function attachBubble(character) {
    character.querySelector(':scope > .bubble')?.remove();
    const order = parse(character.dataset.order);
    character.insertAdjacentHTML('beforeend', bubbleHTML(names[character.dataset.character], order));
    return character.querySelector(':scope > .bubble');
  }

  // ---------- 訂單卡 ----------

  const CARD_SHELL =
    `<div class="order-card__head">` +
    `<p class="order-card__title" id="order-card-title"></p>` +
    `<button type="button" class="order-card__close" aria-label="關閉訂單卡">×</button>` +
    `</div>` +
    `<ul class="order-card__list"></ul>` +
    `<p class="order-card__total"></p>`;

  function setupCard(card) {
    card.innerHTML = CARD_SHELL;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'order-card-title');
    card.tabIndex = -1;

    let opener = null;
    const close = () => {
      card.hidden = true;
      opener?.focus();
      opener = null;
    };

    card.querySelector('.order-card__close').addEventListener('click', close);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    return {
      open(character, from) {
        const order = parse(character.dataset.order);
        card.querySelector('.order-card__title').textContent = `${names[character.dataset.character]}的訂單`;
        card.querySelector('.order-card__list').innerHTML = order
          .map(
            ({ id, qty }) =>
              `<li class="order-card__row"><span class="order-card__icon">${icon(id)}</span>` +
              `<span class="order-card__name">${products[id].name}</span><span class="order-card__qty">×${qty}</span></li>`
          )
          .join('');
        card.querySelector('.order-card__total').textContent = `共 ${count(order)} 件`;
        opener = from;
        card.hidden = false;
        card.focus();
      },
      close,
    };
  }

  Lab.order = { parse, count, attachBubble, setupCard };

  // ---------- 頁面上已經擺好的顧客 ----------

  const cardEl = document.querySelector('[data-order-card]');
  const card = cardEl && setupCard(cardEl);
  for (const character of document.querySelectorAll('.character[data-order]')) {
    const bubble = attachBubble(character);
    bubble.addEventListener('click', () => card?.open(character, bubble));
  }
})();
