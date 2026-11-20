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
  - 產生重複出現的東西（`props.js` 展示櫃與商品、`characters.js` 角色、`shop.js` 整間店、`storefront.js` 店面與前廳、`order.js` 泡泡與訂單卡、`letters.js` 字母商品、`words.js` 單字表），改一處就全部一起變
  - 互動：`rotate.js` 拖曳旋轉（改 `--rx`／`--ry` 兩個 CSS 變數）、`controls.js` 切換按鈕（改目標元素的 data 屬性）、`game.js` 遊戲開場、`book.js` 說明書翻頁、`play.js` 出題、計時、暫停與計分（只決定什麼時候換下一步，動畫本身是 CSS transition；🔊 用瀏覽器內建的語音合成）

## 進度

1. 紙盒 — `index.html`
2. 展示櫃 — `display-case.html`（4 種餅乾各用 SVG `<symbol>` 畫一次、`<use>` 引用；一層 4×2，部分疊成一疊）
3. 刺蝟店員「小栗」 — `hedgehog.html`（6 層分層紙偶；三種表情、走路、提籃子／拿法棍，用 data 屬性切換；圖層由 `scripts/characters.js` 產生，分層、表情、走路的樣式在 `styles/characters.css`，之後的顧客也共用）
4. 烘焙店「日日餅乾」 — `bakery.html`（整間店都是平面；鏡頭切換門口／展示櫃／麵包架／櫃台，拖曳可以轉頭。場景由 `scripts/shop.js` 產生，之後遊戲頁共用；展示櫃、餅乾、麵包、商品價目表集中在 `scripts/props.js`）
5. 三位顧客與對話泡泡 — `customers.html`（兔子、小熊、狐狸，跟小栗共用 `styles/characters.css` 的分層、表情、走路；頭上的泡泡可收合成「…」，點了打開訂單卡，由 `scripts/order.js` 產生）
6. 英文單字小遊戲 — `game.html`。字母就是店裡的餅乾和麵包：a–m 是展示櫃頂上的字母餅乾、n–z 是麵包架上的字母麵包（`scripts/letters.js`）。開場：店外 → 點門進店 → 導覽字母放在哪裡 → 翻遊戲說明書（`scripts/book.js`，縫線邊框、可前後翻，每頁一張遊戲截圖 `images/howto/`）→ 開始遊戲 → 3、2、1。營業：顧客出挖空的英文單字（中文提示、🔊 發音），按「餅乾櫃／麵包架」轉過去點缺的字母，小栗走過去拿回來補上；右上角時鐘倒數，快到會變紅晃動；齒輪可暫停（繼續、重新開始、遊戲說明、回到主畫面）。15 位顧客後顯示成績與單字複習（`scripts/play.js`，100 個單字在 `scripts/words.js`）

### 為什麼店分成好幾層

整間店、店面全部放在同一個 3D 空間時，Chrome 排前後會出錯：某些舞台寬度下牆被漏畫一塊、店面右半邊被截掉、店裡的牆被畫到店外。
所以地板、天花板、每一面牆、擺設、店面……各自一層 `.shop__room`（套同一個鏡頭），依固定順序疊起來。
挑的順序都是「後面那層不可能擋住前面那層」，例如鏡頭永遠在牆面圍起來的那一側，所以擺設一定疊在牆面上面。
