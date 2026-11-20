# 3D 實驗室

把 Figma「作品集（面試用）／3d porject」頁的 3D transform 範例，用原生 CSS 3D 在網頁上重現。
獨立於作品集之外，確認效果之後再決定要不要搬進作品集。

## 怎麼打開

直接雙擊 `index.html` 就能看，不需要安裝或 build。
想用本機伺服器也可以：`python3 -m http.server 4317`，再開 http://127.0.0.1:4317/。

## Figma → CSS

| Figma | CSS |
|---|---|
| 3D transform（Depth、X／Y／Z 旋轉） | `transform: translateZ() rotateX() rotateY() rotateZ()`，順序相同 |
| Keep nested layers 3D | `transform-style: preserve-3d` |
| Perspective | `perspective` |
| 背面不顯示 | `backface-visibility: hidden` |

Figma 的 transform origin 預設在圖層中心，CSS 也是，所以數值可以直接照抄。

## 寫法約定（比照作品集）

- 色彩、字級、間距、尺寸都從 `styles/tokens.css` 引用，元件裡不寫死色碼或 px（border 的 1px 例外）。
- 3D 物件的尺寸以「Figma 的 1px」為單位：`--u` 乘上 Figma 量到的數字；改 `--box-scale` 就整個等比縮放。
- 斷點只用 375／768／1200。
- 沒有任何函式庫。JS 只做兩件事：
  - 產生重複出現的東西（`props.js` 展示櫃與商品、`characters.js` 角色、`shop.js` 整間店、`order.js` 泡泡與訂單卡），改一處就全部一起變
  - 互動：`rotate.js` 拖曳旋轉（改 `--rx`／`--ry` 兩個 CSS 變數）、`controls.js` 切換按鈕（改目標元素的 data 屬性）

## 進度

1. 紙盒 — `index.html`
2. 展示櫃 — `display-case.html`（4 種餅乾各用 SVG `<symbol>` 畫一次、`<use>` 引用；一層 4×2，部分疊成一疊）
3. 刺蝟店員「小栗」 — `hedgehog.html`（6 層分層紙偶；三種表情、走路、提籃子／拿法棍，用 data 屬性切換；圖層由 `scripts/characters.js` 產生，分層、表情、走路的樣式在 `styles/characters.css`，之後的顧客也共用）
4. 烘焙店「日日餅乾」 — `bakery.html`（整間店都是平面；鏡頭切換門口／展示櫃／麵包架／櫃台，拖曳可以轉頭。場景由 `scripts/shop.js` 產生，之後遊戲頁共用；展示櫃、餅乾、麵包、商品價目表集中在 `scripts/props.js`）
5. 三位顧客與對話泡泡 — `customers.html`（兔子、小熊、狐狸，跟小栗共用 `styles/characters.css` 的分層、表情、走路；頭上的泡泡可收合成「…」，點了打開訂單卡，由 `scripts/order.js` 產生）
6. 小遊戲 — 待做
