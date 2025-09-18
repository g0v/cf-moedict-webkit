#!/bin/bash

# CloudFlare Worker 萌典後端測試腳本

echo "🚀 開始測試 CloudFlare Worker 萌典後端..."

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 wrangler 是否安裝
if ! command -v wrangler &> /dev/null; then
    echo "❌ 請先安裝 wrangler: npm install -g wrangler"
    exit 1
fi

echo "📦 安裝相依套件..."
npm install

echo "🔧 檢查 TypeScript 編譯..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
    echo "❌ TypeScript 編譯錯誤"
    exit 1
fi

echo "✅ TypeScript 編譯通過"

echo "🧪 運行測試..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ 測試失敗"
    exit 1
fi

echo "✅ 測試通過"

echo "🔍 檢查 wrangler 配置..."
wrangler whoami

if [ $? -ne 0 ]; then
    echo "❌ 請先登入 CloudFlare: wrangler login"
    exit 1
fi

echo "✅ CloudFlare 認證通過"

echo "🚀 啟動開發伺服器..."
echo "請在另一個終端中執行: npm run dev"
echo "然後訪問: http://localhost:8787"

echo ""
echo "📋 測試 URL 範例:"
echo "  字典 API: http://localhost:8787/萌.json"
echo "  圖片生成: http://localhost:8787/萌.png"
echo "  頁面渲染: http://localhost:8787/萌"
echo "  台語查詢: http://localhost:8787/'台語詞.json"
echo "  客語查詢: http://localhost:8787/:客語詞.json"
echo "  兩岸查詢: http://localhost:8787/~兩岸詞.json"

echo ""
echo "🎉 準備完成！"
echo "💡 提示："
echo "  1. 確保已設置 KV Storage 和 R2 Storage"
echo "  2. 上傳字典資料和字體檔案"
echo "  3. 更新 wrangler.jsonc 中的 namespace ID"
echo "  4. 執行 npm run deploy 部署到生產環境"
