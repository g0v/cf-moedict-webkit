# 萌典 CloudFlare Worker

這是 [moedict-webkit](https://github.com/g0v/moedict-webkit) 的 CloudFlare Worker 版本，將原本的 Node.js 後端遷移到無伺服器環境。

## 專案概念

### 技術棧
- **CloudFlare Workers**: 無伺服器運行環境
- **TypeScript**: 主要開發語言
- **KV Storage**: 字典資料儲存
- **R2 Storage**: 字體和靜態資源
- **@cf-wasm/resvg**: SVG 轉 PNG 轉換

### 功能對應
| 原功能 | CloudFlare Worker 實現 |
|--------|----------------------|
| `/:text.json` | 字典查詢 API |
| `/:text.png` | 文字轉圖片生成 |
| `/:text` | HTML 頁面渲染 |
| 靜態資源 | R2 Storage 服務 |

### 核心特色
- ✅ **無伺服器架構**: 使用 CloudFlare Workers
- ✅ **自動擴展**: 根據需求自動調整資源
- ✅ **全球 CDN**: 利用 CloudFlare 的全球網路
- ✅ **成本效益**: 按使用量計費
- ✅ **高可用性**: 99.9% 服務可用性

## 快速開始

### 環境需求
- Node.js 18+
- npm 或 yarn
- CloudFlare 帳號

### 安裝依賴
```bash
npm install
```

### 本地開發
```bash
# 啟動開發伺服器
npm run dev

# 測試功能
curl "http://localhost:8787/萌.json"
curl "http://localhost:8787/萌.png"
curl "http://localhost:8787/萌"
```

### 部署到 CloudFlare

#### 1. 設置 CloudFlare 認證
```bash
wrangler auth login
```

#### 2. 創建必要資源
```bash
# 創建 KV Storage
wrangler kv:namespace create "DICTIONARY"
wrangler kv:namespace create "DICTIONARY" --preview

# 創建 R2 Storage
wrangler r2 bucket create moedict-fonts
wrangler r2 bucket create moedict-assets
```

#### 3. 更新配置
編輯 `wrangler.jsonc`，將 KV namespace ID 替換為實際值：
```jsonc
{
  "kv_namespaces": [
    {
      "binding": "DICTIONARY",
      "id": "your-actual-kv-namespace-id",
      "preview_id": "your-actual-kv-preview-namespace-id"
    }
  ]
}
```

#### 4. 部署 Worker
```bash
# 部署到生產環境
npm run deploy

# 或使用 wrangler 直接部署
wrangler deploy
```

## 專案結構

```
cf-moedict-webkit/
├── src/
│   ├── index.ts              # 主要入口點
│   ├── types.ts              # TypeScript 類型定義
│   ├── dictionary.ts         # 字典查詢邏輯
│   ├── image-generation.ts  # 圖片生成邏輯
│   ├── page-rendering.ts     # 頁面渲染邏輯
│   └── static-assets.ts      # 靜態資源處理
├── wrangler.jsonc            # CloudFlare Worker 配置
├── package.json              # 專案依賴
├── tsconfig.json             # TypeScript 配置
├── 工程計劃.md               # 開發計劃
└── DEPLOYMENT.md             # 詳細部署指南
```

## API 端點

### 字典查詢
```
GET /:text.json
```
- 查詢指定文字的字典定義
- 支援華語、台語、客語、兩岸詞典

### 圖片生成
```
GET /:text.png?font=kai
```
- 將文字轉換為 PNG 圖片
- 支援多種字體 (kai, ming, song, hei)

### 頁面渲染
```
GET /:text
```
- 渲染完整的 HTML 頁面
- 包含字典定義和社交分享功能

## 開發指南

### 本地測試
```bash
# 啟動開發伺服器
npm run dev

# 測試不同功能
curl "http://localhost:8787/萌.json"      # 字典查詢
curl "http://localhost:8787/萌.png"        # 圖片生成
curl "http://localhost:8787/萌"            # 頁面渲染
```

### 除錯
```bash
# 查看 Worker 日誌
wrangler tail

# 查看特定請求
wrangler tail --format=pretty
```

### 性能監控
- 使用 CloudFlare Analytics 監控性能
- 監控 KV Storage 和 R2 Storage 使用量
- 設置告警機制

## 資料遷移

### 字典資料
需要將原始專案的字典資料遷移到 KV Storage：
- `a/` 目錄 (華語詞典)
- `t/` 目錄 (台語詞典)
- `h/` 目錄 (客語詞典)
- `c/` 目錄 (兩岸詞典)

### 靜態資源
需要將字體和靜態資源上傳到 R2 Storage：
- `fonts/` 目錄 (字體檔案)
- `css/` 目錄 (樣式表)
- `js/` 目錄 (JavaScript 檔案)
- `images/` 目錄 (圖片資源)

## 故障排除

### 常見問題

1. **認證失敗**
   ```bash
   wrangler auth login
   ```

2. **KV namespace 不存在**
   ```bash
   wrangler kv:namespace create "DICTIONARY"
   ```

3. **R2 bucket 不存在**
   ```bash
   wrangler r2 bucket create moedict-fonts
   wrangler r2 bucket create moedict-assets
   ```

4. **圖片生成失敗**
   - 檢查字體檔案是否已上傳
   - 檢查 R2 Storage 配置
   - 查看 Worker 日誌

## 貢獻

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 授權

本專案基於原始 [moedict-webkit](https://github.com/g0v/moedict-webkit) 專案，遵循相同的授權條款。

## 相關連結

- [原始 moedict-webkit 專案](https://github.com/g0v/moedict-webkit)
- [CloudFlare Workers 文檔](https://developers.cloudflare.com/workers/)
- [萌典官網](https://www.moedict.tw/)
