# 字體選擇功能實現總結

## 已完成的功能

### 1. 路由設計分析 ✅
- 分析了原專案 `moedict-webkit/server.ls` 中的路由設計
- 確認了 `/:text.png` 路由支援 `?font=` 查詢參數
- 預設字體為 `TW-Kai` (kai)

### 2. 預設字體記錄 ✅
- 創建了 `large_fonts/default.md` 文檔
- 記錄了原專案的預設字體 `TW-Kai`
- 列出了所有支援的字體參數對應表

### 3. 字體參數選擇功能 ✅
- 實現了 `getFontName()` 函數，複製原專案的 `font-of` 邏輯
- 支援所有原專案支援的字體參數：
  - 全字庫: `kai`, `sung`, `ebas`
  - cwTeX Q: `cwming`, `cwhei`, `cwyuan`, `cwkai`, `cwfangsong`
  - 思源黑體: `srcx`, `srcl`, `srcn`, `srcr`, `srcm`, `srcb`, `srch`
  - 思源宋體: `shsx`, `shsl`, `shsm`, `shsr`, `shss`, `shsb`, `shsh`
  - 源雲明體: `gwmel`, `gwml`, `gwmr`, `gwmm`, `gwmsb`
  - Justfont: `openhuninn`
  - 逢甲大學: `shuowen`
  - 其他: `typography`
  - 王漢宗字體: `wt001`-`wthc06` 等

### 4. R2 字體可用性檢查 ✅
- 實現了 `checkFontAvailability()` 函數
- 使用 "萌" 字 (U+840C) 作為測試字符
- 檢查 R2 中是否存在對應字體的 SVG 檔案

### 5. 錯誤處理 ✅
- 當 R2 中沒有指定字體時，返回 404 狀態碼和純文字錯誤訊息
- 錯誤訊息格式: "目前R2中尚無{font}字體，待更新"
- 不生成 PNG 圖片，直接返回純文字說明

## 技術實現細節

### 核心函數
1. **`handleImageGeneration()`** - 主要圖片生成處理函數
2. **`getFontName()`** - 字體參數到字體名稱的映射
3. **`checkFontAvailability()`** - R2 字體可用性檢查
5. **`generateTextSVGWithR2Fonts()`** - 使用 R2 字體生成 SVG

### 字體映射邏輯
```typescript
// 預設字體
return 'TW-Kai';

// 全字庫字體
if (/sung/i.test(fontParam)) return 'TW-Sung';
if (/ebas/i.test(fontParam)) return 'EBAS';

// 王漢宗字體
if (WT2FONT[fontParam]) return WT2FONT[fontParam];
```

### R2 檔案路徑格式
```
{字體名稱}/U+{Unicode編碼}.svg
例如: TW-Kai/U+840C.svg
```

## 使用方式

### 基本用法
- `/萌.png` - 使用預設 TW-Kai 字體
- `/萌.png?font=kai` - 明確指定 TW-Kai 字體

### 其他字體
- `/萌.png?font=sung` - 使用 TW-Sung 宋體
- `/萌.png?font=ebas` - 使用 EBAS 篆文
- `/萌.png?font=shuowen` - 使用 ShuoWen 說文標篆

### 錯誤處理
- `/萌.png?font=nonexistent` - 返回 404 狀態碼，純文字 "目前R2中尚無nonexistent字體，待更新"

## 下一步

1. **下載預設字體**: 需要下載 TW-Kai 字體並上傳到 R2
2. **測試功能**: 部署後測試各種字體參數
3. **擴展字體**: 根據需要下載更多字體到 R2

## 檔案結構

```
cf-moedict-webkit/
├── src/
│   ├── image-generation.ts  # 主要實現檔案
│   ├── types.ts            # 字體映射定義
│   └── index.ts            # 路由處理
├── large_fonts/
│   └── default.md          # 預設字體記錄
└── test-font-selection.md  # 測試用例
```
