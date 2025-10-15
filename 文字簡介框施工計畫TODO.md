### 1. 游標滑過文字顯示簡介框

- [x] **Tooltip 功能實現**
  - [x] 實現游標滑過文字時顯示簡介框
  - [x] 簡介框內容包含：注音、拼音、基本定義
  - [x] 支援動態定位和樣式調整
  - [x] 參考原專案檔案: `moedict-webkit/main.ls` 第637-660行, `moedict-webkit/js/jquery.hoverIntent.js`

- [x] **文字檢測和查詢**
  - [x] 實現頁面文字的即時檢測
  - [x] 當游標滑過文字時觸發查詢
  - [x] 處理查詢結果的格式化顯示
  - [x] 實現快取機制避免重複查詢
  - [x] 參考原專案檔案: `moedict-webkit/main.ls` 第546-551行, `load-json` 函數

- [x] **簡介框樣式和動畫**
  - [x] 實現簡介框的 CSS 樣式
  - [x] 添加淡入淡出動畫效果
  - [x] 處理簡介框的定位邏輯（避免超出視窗）
  - [x] 實現響應式設計適配
  - [x] 參考原專案檔案: `moedict-webkit/sass/_result.scss` 第63-146行, `moedict-webkit/css/cupertino/jquery-ui-1.10.4.custom.css`

- [x] **效能優化**
  - [x] 實現防抖動機制避免過度查詢
  - [x] 優化查詢速度和使用者體驗
  - [x] 處理大量文字時的效能問題

### 2. 待修復問題

- [ ] **HTML 標籤清理問題**
  - [ ] 修復 tooltip 內容仍顯示 HTML 標籤的問題
  - [ ] 確保 `buildTooltipHTML` 中的 `untag` 函數正確執行
  - [ ] 檢查 `escapeHtml` 和 `replace(/<[^>]*>/g, '')` 的執行順序
  - [ ] 參考當前專案: `cf-moedict-webkit/src/page-rendering.ts` 第1038行, `buildTooltipHTML` 函數

- [ ] **注音拼音顯示格式問題**
  - [ ] 修復注音應為直書顯示，而非橫書
  - [ ] 實現注音與主文字排版一致（yin, diao 位置）
  - [ ] 使用原專案的 hruby 結構和 CSS 樣式
  - [ ] 參考原專案: `moedict-webkit/sass/_result.scss` 第422-439行, hruby 樣式
  - [ ] 參考當前專案: `cf-moedict-webkit/src/preact-components.tsx` 第58-64行, `decorateRuby` 和 `rightAngle` 使用

- [ ] **Tooltip 定位邏輯問題**
  - [ ] 實現當滑鼠在頁面下方時，tooltip 顯示在文字上方
  - [ ] 修改 `positionNear` 函數的定位邏輯
  - [ ] 根據滑鼠 Y 座標和視窗高度動態調整 tooltip 位置
  - [ ] 參考原專案: `moedict-webkit/main.ls` 第653-660行, tooltip 定位邏輯
  - [ ] 參考當前專案: `cf-moedict-webkit/src/page-rendering.ts` 第747-758行, `positionNear` 函數
