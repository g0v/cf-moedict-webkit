# 打星號與字詞記錄簿功能實作 TODO

## 概述

實現與原專案 `moedict-webkit` 完全相同的星號收藏和字詞記錄簿功能，包括星號按鈕、LocalStorage 儲存機制、收藏狀態切換、字詞記錄簿頁面等。

## 📍 星號按鈕位置

根據截圖 `UI/內容_筆順與星號.png`，星號按鈕位於：
- **位置**：主字標題同行靠右對齊
- **樣式**：空星號（未收藏）或實心星號（已收藏）
- **提示文字**：「加入字詞記錄簿」/「已加入記錄簿」

## 📋 待完成項目

### 1. 星號按鈕實現

- [x] **星號按鈕實現**
  - [x] 在每個字典頁面添加星號圖示按鈕
  - [x] 實現星號狀態切換（空星號 ↔ 實心星號）
  - [x] 添加 hover 提示文字（「加入字詞記錄簿」/「已加入記錄簿」）
  - [x] 應用正確的 CSS 類名 (`.star`, `.icon-star`, `.icon-star-empty`)
  - [x] 參考原專案檔案: `moedict-webkit/view.ls` 第100-106行, `Star` 組件

### 2. LocalStorage 儲存機制

- [x] **LocalStorage 儲存機制**
  - [x] 實現字詞收藏的 LocalStorage 儲存
  - [x] 使用 `STARRED[LANG]` 物件儲存各語言的收藏字詞
  - [x] 字詞格式：`"字詞名稱"\n` (包含引號和換行)
  - [x] 實現 `setPref("starred-#LANG", STARRED[LANG])` 儲存機制
  - [x] 參考原專案檔案: `moedict-webkit/main.ls` 第43行, 第605-619行

### 3. 星號點擊事件處理

- [x] **星號點擊事件處理**
  - [x] 實現星號點擊切換收藏狀態
  - [x] 點擊空星號：加入收藏，切換為實心星號
  - [x] 點擊實心星號：移除收藏，切換為空星號
  - [x] 更新導航列中的收藏按鈕背景色提示
  - [x] 參考原專案檔案: `moedict-webkit/main.ls` 第605-619行

### 4. 手動微調localStorage的讀寫格式以對齊原專案


- [x] **微調localStorage的讀寫格式**

正確(相容原專案)：		「"草木"\n"萌"\n」
當前：							「"草木" "萌"」

看起來AI很難分辨哪裡要加反斜線，這裡的讀取和寫入邏輯可能需要手刻微調。

### 5. 字詞記錄簿頁面

- [x] **字詞記錄簿頁面**
  - [x] 實現 `=*` 路由處理，顯示收藏的字詞列表
  - [x] 從 LocalStorage 讀取 `STARRED[LANG]` 資料
  - [x] 解析字詞列表並生成連結列表
  - [x] 實現收藏字詞的點擊導航功能
  - [x] 參考原專案檔案: `moedict-webkit/main.ls` 第547行, `load-json` 函數

### 6. 多語言支援

- [x] **多語言支援**
  - [x] 為不同語言（華語、台語、客語、兩岸）分別儲存收藏
  - [x] 使用 `starred-a`, `starred-t`, `starred-h`, `starred-c` 作為 LocalStorage 鍵名
  - [x] 確保各語言收藏獨立管理
  - [x] 參考原專案檔案: `moedict-webkit/main.ls` 第43行, `HASH-OF` 對應關係

## 🔍 原專案程式碼研究

### 1. Star 組件 (view.ls 第100-106行)

```livescript
Star = createClass do
  render: ->
    { CurrentId, LANG } = @props
    STARRED = window?STARRED || {}
    if STARRED[LANG] and ~STARRED[LANG].indexOf("\"#CurrentId\"")
      return i { className: "star iconic-color icon-star", title: \已加入記錄簿 }
    return i { className: "star iconic-color icon-star-empty", title: \加入字詞記錄簿 }
```

**關鍵點**：
- 使用 `CurrentId` 和 `LANG` 作為 props
- 檢查 `STARRED[LANG]` 中是否包含 `"字詞名稱"` 格式
- 根據收藏狀態返回不同的 CSS 類名和提示文字

### 2. STARRED 初始化 (main.ls 第43行)

```livescript
window.STARRED = STARRED = {[key, getPref("starred-#key") || ""] for key of HASH-OF}
```

**關鍵點**：
- 從 LocalStorage 讀取各語言的收藏資料
- 使用 `HASH-OF` 的鍵作為語言代碼
- 預設值為空字串

### 3. 星號點擊事件處理 (main.ls 第605-619行)

```livescript
$ '.results .star' .on vclick, ->
  $star = $(@)hide!
  key = "\"#prevId\"\n"
  if $(@).hasClass \icon-star-empty
    STARRED[LANG] = key + STARRED[LANG]
    $(@).attr \title \已加入記錄簿
  else
    STARRED[LANG] -= "#key"
    $(@).attr \title \加入字詞記錄簿
  $(@).toggleClass \icon-star-empty .toggleClass \icon-star
  $('#btn-starred a').fadeOut \fast ->
    $(@).css(\background \#ddd)fadeIn ->
      $(@).css(\background \transparent)
      $star.fadeIn \fast
  setPref "starred-#LANG" STARRED[LANG]
```

**關鍵點**：
- 使用 `vclick` 事件（支援觸控和滑鼠）
- 字詞格式：`"字詞名稱"\n`
- 切換 CSS 類名：`icon-star-empty` ↔ `icon-star`
- 更新導航列收藏按鈕的背景色動畫
- 使用 `setPref` 儲存到 LocalStorage

### 4. LocalStorage 工具函數 (main.ls 第143-145行)

```livescript
function setPref (k, v) => try localStorage?setItem(k, JSON?stringify(v))
function getPref (k) => try $.parseJSON(localStorage?getItem(k) ? \null)
function rmPref (k) => try localStorage?removeItem(k)
```

**關鍵點**：
- `setPref`: 使用 JSON.stringify 儲存
- `getPref`: 使用 JSON.parse 讀取，預設值為 null
- `rmPref`: 移除 LocalStorage 項目

### 5. 導航列收藏按鈕 (index.html 第48行)

```html
<li id="btn-starred"><a title="字詞紀錄簿" href="#=*"><i class="icon-bookmark-empty"></i></a></li>
```

**關鍵點**：
- 使用 `icon-bookmark-empty` 圖示
- 連結到 `#=*` 路由
- 標題為「字詞紀錄簿」

### 6. 收藏按鈕點擊事件 (main.ls 第317-319行)

```livescript
$ \body
.on \click '#btn-starred' ->
  if $(\#query).val! is '=*'
    window.press-back!
```

**關鍵點**：
- 點擊收藏按鈕時導航到 `=*` 路由
- 如果已經在收藏頁面，則返回上一頁

## 🎯 實作重點

### 1. 資料格式
- 收藏字詞格式：`"字詞名稱"\n`
- LocalStorage 鍵名：`starred-a`, `starred-t`, `starred-h`, `starred-c`
- 使用 JSON.stringify/parse 處理資料

### 2. CSS 類名
- 空星號：`.star.iconic-color.icon-star-empty`
- 實心星號：`.star.iconic-color.icon-star`
- 收藏按鈕：`#btn-starred`

### 3. 事件處理
- 使用事件委派處理星號點擊
- 支援觸控和滑鼠事件
- 添加視覺回饋動畫

### 4. 多語言支援
- 各語言獨立儲存收藏
- 使用 `HASH-OF` 對應關係
- 確保語言切換時收藏狀態正確

## 📁 需要修改的檔案

### 新專案檔案
- `cf-moedict-webkit/src/preact-components.tsx` - 添加 Star 組件
- `cf-moedict-webkit/src/page-rendering.ts` - 添加星號按鈕到 HTML
- `cf-moedict-webkit/src/starred-page.tsx` - 字詞記錄簿頁面組件
- `cf-moedict-webkit/src/navbar-component.tsx` - 導航列收藏按鈕

### 需要添加的功能
- LocalStorage 工具函數
- 星號點擊事件處理
- 收藏狀態管理
- 字詞記錄簿路由處理

---

**創建日期**: 2025-10-16
**參考版本**: moedict-webkit
**優先級**: 高
