<!-- e9de5547-3949-489e-aef9-a7dd2a8f3280 1e4956c1-fa7d-4527-9a3e-4197de8a638e -->
# 部首 Tooltip 待辦計畫

## 實作步驟

1. Tooltip 擴充：更新 `src/views/radical-pages/RadicalViews.tsx` 讓部首 bucket 內每個字的 `<a>` 也帶 `data-radical-id`，並確認 tooltip 腳本可沿用與部首表一致的 ID 格式。
2. 伺服器端支援：調整 `src/radical-tooltip-html.ts`（必要時 `src/radical-functions.tsx`）以確保對應的 tooltip 內容完整，含字詞鏈結與 fallback 行為。
3. 樣式微調：對照字典頁 tooltip，檢查並調整部首 tooltip 的排版（字型、間距、可點擊區域等），如需可在共用 CSS/inline style 做修正，並在瀏覽器驗證。

## 待辦清單

- todo-radical-tooltip-links: 為部首 bucket 單字加上 tooltip 支援
- todo-radical-tooltip-style: 調整部首 tooltip 樣式以對齊部首頁，用楷書，黑色的字，不要底線