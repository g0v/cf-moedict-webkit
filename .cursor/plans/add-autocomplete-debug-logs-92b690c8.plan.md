<!-- 92b690c8-b658-447c-aa96-2280acab5bae b4da968e-98ca-4a78-abea-2620b683bff9 -->
# 加入 Autocomplete Debug Logs

在 autocomplete 功能中加入詳細的 debug logs，追蹤從輸入框打字到顯示建議的每個環節。

## 修改檔案

### 1. `src/components/sidebar/SearchBox.tsx`

在以下位置加入 console.log：

- **handleInputChange**：
- 輸入值變化時記錄原始值
- 調用 `searchAutocomplete` 前記錄參數
- 調用後記錄返回結果數量
- 設置 `suggestions` 和 `showSuggestions` 時記錄狀態

- **useEffect (路由更新)**：
- 路由變化時記錄當前路由和設置的值

- **handleSelectSuggestion**：
- 選擇建議時記錄選擇的建議

- **onFocus**：
- 輸入框獲得焦點時記錄

- **render**：
- 記錄 `showSuggestions`、`suggestions.length`、`hasIndex` 狀態

### 2. `src/hooks/useAutocomplete.ts`

在以下位置加入 console.log：

- **loadIndex (useEffect)**：
- 開始載入時記錄語言和 URL
- fetch 前後記錄狀態
- indexRef.current 設置時記錄長度
- 錯誤時記錄錯誤訊息

- **search 函數**：
- 函數開始時記錄輸入值和 indexRef.current 狀態
- 每個處理步驟記錄中間結果（processedTerm、regex 等）
- 正則表達式匹配前後記錄
- 返回結果前記錄結果數量

## Log 格式

使用統一的 log 前綴 `[Autocomplete]` 或 `[SearchBox]` 以便識別：

- `[SearchBox]` 用於 SearchBox 組件的 logs
- `[Autocomplete]` 用於 useAutocomplete hook 的 logs

每個 log 包含：

- 動作名稱（如 "input change", "fetch index", "search"）
- 相關資料（值、狀態、數量等）
- 時間戳（可選）