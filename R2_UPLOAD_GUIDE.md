# R2 字典資料上傳指南

## 概述

已將字典資料從 KV Storage 改為 R2 Storage，這樣更適合大量靜態檔案的管理。

### 檔案命名規則

- **單字**: 以 `@` 開頭，例如 `@龜.json`, `@龠.json`
- **複合詞**: 以 `=` 開頭，例如 `=諺語.json`, `=人名.json`
- **索引檔案**: `index.json` - 包含所有字詞的索引
- **跨語言對照**: `xref.json` - 包含不同語言間的對照資料

### 重要變更

- 移除了 `lenToRegex.json` 相關邏輯，因為原專案中沒有此檔案
- 模糊搜尋改為簡單的字符分割搜尋
- 支援同時搜尋單字和複合詞格式

## 修改的檔案

### 1. wrangler.jsonc
- 移除 DICTIONARY KV namespace
- 新增 DICTIONARY R2 bucket
- 保留 KV_FONTS 用於字體快取

### 2. src/types.ts
- 將 `DICTIONARY: KVNamespace` 改為 `DICTIONARY: R2Bucket`
- 新增 `KV_FONTS: KVNamespace`

### 3. src/dictionary.ts
- 所有 `env.DICTIONARY.get()` 改為 R2 格式
- 使用 `dictionaryObject.text()` 取得文字內容

### 4. src/page-rendering.ts
- 同步更新為 R2 格式

## R2 Bucket 設定

### 建立 R2 Bucket

```bash
# 建立 production bucket
wrangler r2 bucket create moedict-dictionary

# 建立 preview bucket
wrangler r2 bucket create moedict-dictionary-preview
```

### 資料夾結構

```
moedict-dictionary/
├── a/                    # 華語字典
│   ├── @龜.json          # 單字 (以 @ 開頭)
│   ├── @龠.json
│   ├── =諺語.json        # 複合詞 (以 = 開頭)
│   ├── =人名.json
│   ├── index.json        # 索引檔案
│   └── xref.json         # 跨語言對照
├── t/                    # 台語字典
│   ├── @字.json
│   ├── =詞.json
│   ├── index.json
│   └── xref.json
├── h/                    # 客語字典
│   ├── @字.json
│   ├── =詞.json
│   ├── index.json
│   └── xref.json
└── c/                    # 兩岸字典
    ├── @字.json
    ├── =詞.json
    ├── index.json
    └── xref.json
```

## 上傳方式

### 方法 1: 使用 rclone

```bash
# 1. 配置 rclone
rclone config

# 2. 選擇 CloudFlare R2
# 3. 輸入 Access Key ID 和 Secret Access Key
# 4. 設定 endpoint: https://<account-id>.r2.cloudflarestorage.com

# 5. 上傳字典資料
# 假設原專案資料在 dictionary 資料夾

rclone copy ./dictionary/a/ r2:moedict-dictionary-preview/a/
rclone copy ./dictionary/t/ r2:moedict-dictionary-preview/t/
rclone copy ./dictionary/h/ r2:moedict-dictionary-preview/h/
rclone copy ./dictionary/c/ r2:moedict-dictionary-preview/c/


rclone copy ./dictionary/a/ r2:moedict-dictionary/a/
rclone copy ./dictionary/t/ r2:moedict-dictionary/t/
rclone copy ./dictionary/h/ r2:moedict-dictionary/h/
rclone copy ./dictionary/c/ r2:moedict-dictionary/c/

# 6. 檢查上傳結果
rclone ls r2:moedict-dictionary/
```


## 測試

### 1. 本地測試

```bash
# 啟動開發環境
wrangler dev

# 測試 API
curl http://localhost:8787/龜.json
curl http://localhost:8787/諺語.json
```

### 2. 部署測試

```bash
# 部署到 CloudFlare
wrangler deploy

# 測試 production API
curl https://cf-moedict-webkit.your-subdomain.workers.dev/龜.json
curl https://cf-moedict-webkit.your-subdomain.workers.dev/諺語.json
```

## 注意事項

1. **檔案大小限制**: R2 單一檔案最大 5TB
2. **請求限制**: 每分鐘 1000 次請求
3. **成本**: R2 比 KV 更便宜，適合大量靜態檔案
4. **快取**: R2 檔案會自動快取，提升讀取速度
5. **備份**: 建議定期備份字典資料

## 故障排除

### 常見問題

1. **權限錯誤**: 檢查 R2 bucket 權限設定
2. **檔案不存在**: 確認檔案路徑正確
3. **編碼問題**: 確保 JSON 檔案使用 UTF-8 編碼

### 除錯命令

```bash
# 列出 bucket 內容
wrangler r2 object list moedict-dictionary

# 檢查特定檔案
wrangler r2 object get moedict-dictionary/a/@龜.json

# 刪除測試檔案
wrangler r2 object delete moedict-dictionary/a/test.json
```

## 效能優化

1. **壓縮**: 可以考慮壓縮 JSON 檔案
2. **CDN**: R2 檔案會自動透過 CloudFlare CDN 分發
3. **快取**: 在 Worker 中實作快取機制
4. **並行**: 多個檔案讀取可以並行處理
