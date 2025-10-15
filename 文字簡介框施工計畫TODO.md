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


- [x] **Tooltip 標題超連結對齊問題**
  - [x] 修復單字 tooltip 標題缺少超連結的問題
  - [x] 確保所有 tooltip 標題都與主頁面保持一致的超連結樣式
  - [x] 保留多字詞的超連結表現，並對齊到單字
  - [x] 修改 `buildTooltipHTML` 中的標題生成邏輯
  - [x] 參考當前專案: `cf-moedict-webkit/src/preact-components.tsx` 第69-89行, 主頁面標題結構

- [x] **注音拼音顯示格式問題**
  - [x] 修復注音應為直書顯示，而非橫書
  - [x] 實現注音與主文字排版一致（yin, diao 位置）
  - [x] 使用原專案的 hruby 結構和 CSS 樣式
  - [x] 參考原專案: `moedict-webkit/sass/_result.scss` 第422-439行, hruby 樣式
  - [x] 參考當前專案: `cf-moedict-webkit/src/preact-components.tsx` 第58-64行, `decorateRuby` 和 `rightAngle` 使用

- [ ] **主字樣式問題**
  - [ ] 修復 tooltip 標題中的超連結樣式，對齊主頁面主字樣式
  - [ ] 超連結顏色改為黑色而非藍色
  - [ ] 字體家族對齊主字，優先使用楷書字體
  - [ ] hover 時移除 underline 效果
  - [ ] 參考主字 CSS: `h1.title` 樣式定義
  - [ ] 參考當前專案: `cf-moedict-webkit/src/page-rendering.ts` 第413-422行, 主字標題樣式



- [ ] **Tooltip 定位邏輯問題**
  - [ ] 實現當滑鼠在頁面下方時，tooltip 顯示在文字上方
  - [ ] 修改 `positionNear` 函數的定位邏輯
  - [ ] 根據滑鼠 Y 座標和視窗高度動態調整 tooltip 位置
  - [ ] 參考原專案: `moedict-webkit/main.ls` 第653-660行, tooltip 定位邏輯
  - [ ] 參考當前專案: `cf-moedict-webkit/src/page-rendering.ts` 第747-758行, `positionNear` 函數
