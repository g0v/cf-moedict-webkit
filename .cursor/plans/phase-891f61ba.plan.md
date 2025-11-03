<!-- 891f61ba-9f03-443a-9dd9-3b7beddd2825 e5bc24fd-d012-4d2c-91f9-05493abacec4 -->
# 階段 3 施工計畫

## 目標概述

- 前端可直接命中 R2 公開端點或後備 API，並統一錯誤/快取處理。
- `DictionaryView`、`RadicalView` 建立資料狀態機，支援路由切換時的局部重繪與 loading 體驗。
- 重新封裝 LRU／Starred 本地資料流程，避免重複 DOM 注入並確保 Navbar 穩定。

## 施工步驟

### data-sourcing

- 建立 `src/services/dictionary-client.ts`：
- 匯出 `fetchDictionaryEntry`, `fetchRadicalBucket`, `fetchRadicalTable`, `fetchDefinitionFragments`，內含：
- 以 `Env` 暴露的 `ASSET_BASE_URL`、`DICTIONARY_BASE_URL` 為主要來源，支援 querystring 指定。
- 失敗時退回 Worker API (`/:text.json`)；以 Response status 判斷 fallback。
- 內建 request 去彈性化（timeout、重試次數常數化）。
- 採用 `AbortController` 支援路由切換取消請求。
- 在 `src/layouts/MainLayout.tsx` 初始化 `DataContext`，提供 env、cache 物件。
- 補齊 `.d.ts` 或 `types.ts` 中 `Env` 欄位（公開端點 URL）。

### dictionary-state

- 在 `DictionaryView` 賦予 `useDictionaryResource(term, lang)` hook（放在 `src/views/dictionary/hooks.ts`）：
- 回傳 `{status: 'idle'|'loading'|'ready'|'error', entry, segments, error}`。
- 初次載入採用 SSR 注入的 `initialRoute.payload.initialData`，之後使用 fetch。
- 路由 term 變動時：
- 立刻進入 `loading`，若有快取使用 `stale-while-revalidate`。
- 請求 `fetchDictionaryEntry`，404 時再呼叫 `fetchDefinitionFragments`。
- 在 hook 內與 `MainLayout` 的 cancel token 同步，避免 race。
- 更新 `DictionaryPage`：
- 以 `status` 分支渲染 Loading skeleton、錯誤訊息、NotFound 結構。
- 保留現有視覺組件，只在資料缺失時顯示 placeholder。
- 提供 `usePrefetchDictionary(term)`，讓 Navbar 搜尋結果 hover/預載。

### radical-state

- 新增 `src/views/radical-pages/hooks.ts`：
- `useRadicalTable(isCrossStrait)` 與 `useRadicalBucket(radical, options)`。
- 共享 `fetchRadicalTable/Bucket`，同樣支援快取+abort。
- 在 `RadicalTable`、`RadicalBucket` 內改為依 hook 的 `status`/`data` 渲染（保留原部首表樣式）。

### local-persistence

- 建立 `src/hooks/useStarredStore.ts`、`src/hooks/useRecentWords.ts`：
- 封裝 localStorage 讀寫與事件廣播（`window.dispatchEvent`）。
- 替換 `DictionaryPage` 星號 handler、`StarredPage` 最近清單渲染邏輯。
- 加入 SSR 渲染保留 placeholder，但 hydration 後以 hook 控制。
- 在 `MainLayout` `useEffect` 中監聽 route 變化，調用 `recentWords.add(term)`，確保 Navbar 不刷新。

### partial-render

- 調整 `MainLayout`：
- Content 區塊以 `route.view` 為 key，限制重新掛載範圍。
- Navbar 取資料 entirely via props/context，不因 route 改變重繪（僅更新 active 狀態）。
- 將 `scrollTo(0,0)` 改成 `requestAnimationFrame` 內執行，避免 layout thrash。

### instrumentation & fallback

- 在 `services` 層加入 console.debug toggles、錯誤統計入口（預留給後續 Sentry）。
- 定義 `DataErrorBoundary`（Preact `Component`），包覆主要內容；若前端路由啟動失敗，可呼叫 `window.__MOEDICT_ROUTER__.go(raw)` 強制整頁重載。

## 驗收與測試

- 撰寫 `vitest` 單元測試覆蓋 `services/dictionary-client` 的 fallback 與快取策略。
- 為 `useDictionaryResource`、`useRadicalTable` 建立 hook 測試（使用 `@testing-library/preact-hooks`）。
- 編寫 Cypress 指南：路由切換、離線/錯誤模擬、星號/歷史同步。
- 手動驗證：
- 同一搜尋切換語言不刷新 Navbar。
- 從 radical list 進入單字並返回，loading 過渡正常。
- localStorage 清除按鈕後字詞清單即時更新。

### To-dos

- [ ] 建立 dictionary-client 服務層並串接 env fallback
- [ ] 為 DictionaryView 實作資料 hook 與狀態管理
- [ ] 為 RadicalView 建立資料 hook 與快取機制
- [ ] 抽象 Starred/LRU localStorage 操作為 hook
- [ ] 調整 MainLayout 確保局部重繪與錯誤防護
- [ ] 撰寫服務與 hook 測試、更新驗收清單