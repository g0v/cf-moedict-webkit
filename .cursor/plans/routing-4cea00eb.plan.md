<!-- 4cea00eb-22c0-40f4-ad47-382502815a9b 589a010c-a426-4261-bf6f-0cb140691265 -->
# 路由即時查詢 MVP

## 1. 建立 AppShell 與同步初始資料

- 新增 `src/AppShell.tsx` 定義 `<MainLayout>` 包裹的頂層元件，接收 `initialRoute` 與各視圖初始資料
- 於 AppShell 內根據 `RouteState` 選擇渲染對應子頁面，navbar/sidebar 維持既有 slot
- 修改 `src/page-rendering.tsx`：以 AppShell 取代直接渲染 `<MainLayout>`，並於 `<head>` 或 `body` 注入 `window.__INITIAL_ROUTE__` / `window.__INITIAL_VIEW_DATA__`
- 加回 `src/client.tsx` 呼叫 `hydrate(<AppShell ...>, document.getElementById('app-root'))`
- 在 `package.json` 恢復 `esbuild` devDependency 與 `build:client`/`build` 指令，於 HTML 加載打包後 `assets/js/client.js`

## 2. 實作字典頁動態資料流程

- 新增或改寫 `src/views/dictionary/DictionaryViews.tsx`：
- 抽出純展示的 `DictionaryPage` / `SearchResultsPage` / `NotFoundPage`
- 新增 `DictionaryRouteView`，內部使用 `useRouter()` 與 `useEffect` 監聽 route change
- 透過 `fetchDictionaryEntry` → 若為 null 則 `fetchFuzzySearch` + `Promise.all(fetchDefinition)` 組裝段落
- 設定 state：`loading`、`entry`、`search-results`、`not-found`、`error`
- SSR 時從 props 套用 initial state、Client 端更新時僅重繪 `main-content`

## 3. SearchBox 與路由互動

- 更新 `src/components/sidebar/SearchBox.tsx`：
- 在輸入變更時 (除空字串) 透過 200ms debounce 觸發 `router.navigate` 到字典路由 `{ view:'dictionary', payload.term }`
- 若輸入清空則導回 `{ view:'home' }`
- 維持現有 suggestion 點擊/submit 行為，避免與 debounce 衝突 (清除計時器)

## 4. 錯誤處理與 UX

- 在 `DictionaryRouteView` 中加入 `載入中…`、錯誤提示 UI，保持 `navbar`/`sidebar` 固定
- 確保 `MainLayout` 的 `onRouteChange` 呼叫可通知 AppShell 更新（如需同步其它 state）
- 補充 `src/api/dictionary.ts` 若需回傳結構化結果 (例如新增型別或共用 util)