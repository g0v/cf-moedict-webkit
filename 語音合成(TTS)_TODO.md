# 語音合成 (TTS) 實現計畫

## 概述

實現瀏覽器語音合成 API，讓使用者可以點擊翻譯文字來聽取發音。支援英文、法文、德文三種語言的語音合成。

## 原專案原始碼分析

### 1. Translations 組件 (view.ls 第64-83行)

```livescript
Translations = createClass do
  render: ->
    {translation} = @props
    div { className: \xrefs }, span { className: \translation },
      ...for let key, val of { English: \英, francais: \法, Deutsch: \德 } | translation[key]
        text = untag(translation[key] * ', ') - /, CL:.*/g - /\|[^[,.()]+/g
        div { key, className: \xref-line },
          span { className: \fw_lang }, val
          span { className: \fw_def, onClick: ~> @onClick val, text }, text
  onClick: (val, text) -> try
    syn = window.speechSynthesis
    utt = window.SpeechSynthesisUtterance
    u = new utt(text - /\([A-Z]\)/g - /[^\u0000-\u00FF]/g)
    u.lang = switch val
      | \英 => \en-US
      | \法 => \fr-FR
      | \德 => \de-DE
    u.volume = 1.0
    u.rate = 1.0
    syn.speak u
```

### 2. 核心 TTS 邏輯分析

**關鍵功能：**
- 使用 `window.speechSynthesis` API
- 創建 `SpeechSynthesisUtterance` 物件
- 根據語言設定 `lang` 屬性
- 清理文字內容（移除標記和特殊字符）
- 設定音量和語速

**語言對應：**
- 英文 (`\英`) → `en-US`
- 法文 (`\法`) → `fr-FR`
- 德文 (`\德`) → `de-DE`

**文字處理：**
- `text - /\([A-Z]\)/g` - 移除如 `(A)` 的標記
- `text - /[^\u0000-\u00FF]/g` - 只保留 ASCII 字符
- `untag(translation[key] * ', ')` - 移除 HTML 標籤並用逗號連接
- `- /, CL:.*/g` - 移除 `, CL:` 開頭的內容
- `- /\|[^[,.()]+/g` - 移除 `|` 後的非標點內容

## 當前專案狀態

### 已實現部分
- ✅ 翻譯文字顯示功能 (`src/preact-components.tsx` 第173-194行)
- ✅ 英文、德文、法文翻譯的顯示
- ✅ 基本的 HTML 結構和 CSS 類名

### 需要添加部分
- ❌ 點擊事件處理器
- ❌ TTS API 整合
- ❌ 文字清理邏輯
- ❌ 錯誤處理機制

## TODO 實現步驟

### Phase 1: 基礎 TTS 功能實現

#### 1.1 創建 TTS 工具函數
- [ ] **創建 `src/tts-utils.ts` 檔案**
  - [ ] 實現 `speakText(lang: string, text: string)` 函數
  - [ ] 實現文字清理函數 `cleanTextForTTS(text: string)`
  - [ ] 實現語言代碼對應函數 `getLanguageCode(lang: string)`
  - [ ] 添加錯誤處理和瀏覽器相容性檢查

#### 1.2 文字清理邏輯實現
- [ ] **實現文字清理函數**
  ```typescript
  function cleanTextForTTS(text: string): string {
    return text
      .replace(/\([A-Z]\)/g, '')           // 移除 (A) 標記
      .replace(/[^\u0000-\u00FF]/g, '')     // 只保留 ASCII 字符
      .replace(/, CL:.*/g, '')             // 移除 , CL: 開頭內容
      .replace(/\|[^[,.()]+/g, '')         // 移除 | 後的非標點內容
      .trim();
  }
  ```

#### 1.3 語言代碼對應
- [ ] **實現語言代碼對應**
  ```typescript
  function getLanguageCode(lang: string): string {
    switch (lang) {
      case '英': return 'en-US';
      case '法': return 'fr-FR';
      case '德': return 'de-DE';
      default: return 'en-US';
    }
  }
  ```

### Phase 2: 整合到現有組件

#### 2.1 修改 preact-components.tsx
- [ ] **添加點擊事件處理器**
  - [ ] 為每個翻譯文字添加 `onClick` 事件
  - [ ] 傳遞語言和文字內容到 TTS 函數
  - [ ] 確保事件處理器正確綁定

#### 2.2 更新翻譯顯示邏輯
- [ ] **修改現有翻譯顯示代碼**
  - [ ] 將靜態文字改為可點擊元素
  - [ ] 添加適當的 CSS 類名 (`fw_def`)
  - [ ] 確保文字清理邏輯正確應用

### Phase 3: 錯誤處理和相容性

#### 3.1 瀏覽器相容性檢查
- [ ] **實現相容性檢查**
  - [ ] 檢查 `window.speechSynthesis` 是否存在
  - [ ] 檢查 `SpeechSynthesisUtterance` 是否支援
  - [ ] 提供降級方案（顯示錯誤訊息）

#### 3.2 錯誤處理機制
- [ ] **添加錯誤處理**
  - [ ] 捕獲 TTS API 錯誤
  - [ ] 處理語音合成失敗情況
  - [ ] 添加使用者友善的錯誤訊息

### Phase 4: 測試和優化

#### 4.1 功能測試
- [ ] **測試不同語言**
  - [ ] 測試英文翻譯的 TTS
  - [ ] 測試法文翻譯的 TTS
  - [ ] 測試德文翻譯的 TTS
  - [ ] 驗證語言代碼正確性

#### 4.2 文字處理測試
- [ ] **測試文字清理**
  - [ ] 測試包含標記的文字
  - [ ] 測試包含特殊字符的文字
  - [ ] 測試空文字和無效文字
  - [ ] 驗證清理後的文字可讀性

#### 4.3 使用者體驗測試
- [ ] **測試點擊響應**
  - [ ] 測試快速連續點擊
  - [ ] 測試同時播放多個語音
  - [ ] 測試語音播放中的狀態管理
  - [ ] 測試停止語音功能

### Phase 5: 進階功能

#### 5.1 語音控制
- [ ] **實現語音控制功能**
  - [ ] 添加停止當前語音的功能
  - [ ] 實現語音播放狀態指示
  - [ ] 添加音量控制選項

#### 5.2 效能優化
- [ ] **優化效能**
  - [ ] 實現語音合成快取
  - [ ] 優化文字處理效能
  - [ ] 減少不必要的 API 調用

## 實現細節

### 1. 檔案結構
```
src/
├── tts-utils.ts          # TTS 工具函數
├── preact-components.tsx  # 修改現有組件
└── types.ts              # 可能需要添加 TTS 相關類型
```

### 2. CSS 樣式
- 確保 `.fw_def` 類名有適當的游標樣式 (`cursor: pointer`)
- 添加 hover 效果提示可點擊
- 考慮添加播放狀態的視覺回饋

### 3. 錯誤處理策略
- 靜默失敗：如果 TTS 不支援，不顯示錯誤
- 使用者通知：在控制台記錄錯誤訊息
- 降級方案：提供文字複製功能作為替代

## 測試計畫

### 1. 單元測試
- [ ] 測試文字清理函數
- [ ] 測試語言代碼對應
- [ ] 測試 TTS API 整合

### 2. 整合測試
- [ ] 測試完整的翻譯點擊流程
- [ ] 測試多語言切換
- [ ] 測試錯誤處理機制

### 3. 使用者測試
- [ ] 測試不同瀏覽器的相容性
- [ ] 測試不同作業系統的語音引擎
- [ ] 測試無障礙功能

## 注意事項

### 1. 瀏覽器限制
- 某些瀏覽器需要使用者互動才能播放語音
- 移動裝置可能有不同的語音引擎
- 語音品質可能因瀏覽器和作業系統而異

### 2. 效能考量
- 語音合成可能消耗較多資源
- 避免同時播放多個語音
- 考慮實現語音佇列機制

### 3. 使用者體驗
- 提供清楚的視覺回饋
- 避免過度使用 TTS 功能
- 確保功能不會干擾主要內容閱讀

---

**創建日期**: 2025-10-14
**預計完成時間**: 2-3 個工作天
**優先級**: 中等（朗讀按鈕的補充功能）
