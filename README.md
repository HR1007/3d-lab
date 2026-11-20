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
- 沒有任何函式庫。`scripts/rotate.js` 是唯一的 JS，只負責拖曳旋轉（改 `--rx`／`--ry` 兩個 CSS 變數）。

## 進度

1. 紙盒 — `index.html`
2. 展示櫃 — 待做
3. 刺蝟麵包師「小栗」 — 待做
4. 烘焙店場景 — 待做
