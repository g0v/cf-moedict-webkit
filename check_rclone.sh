#!/bin/bash

# 檢查 rclone 配置和連接狀態

echo "🔍 檢查 rclone 配置..."

# 檢查 rclone 是否安裝
if ! command -v rclone &> /dev/null; then
    echo "❌ rclone 未安裝"
    exit 1
fi

echo "✅ rclone 已安裝: $(rclone version | head -1)"

# 檢查配置的 remotes
echo ""
echo "📋 配置的 remotes:"
rclone listremotes

# 檢查 r2 remote 是否存在
if rclone listremotes | grep -q "^r2:"; then
    echo "✅ r2 remote 已配置"
else
    echo "❌ r2 remote 未配置"
    echo "請運行: rclone config"
    exit 1
fi

# 測試連接（針對特定 bucket）
echo ""
echo "🔗 測試 r2 連接..."
echo "測試 moedict-assets-preview bucket..."
rclone lsd r2:moedict-assets-preview 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ moedict-assets-preview bucket 連接成功"
else
    echo "❌ moedict-assets-preview bucket 連接失敗"
    echo "請檢查 access key 和 secret key，或 bucket 名稱"
fi

echo "測試 moedict-dictionary-preview bucket..."
rclone lsd r2:moedict-dictionary-preview 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ moedict-dictionary-preview bucket 連接成功"
else
    echo "❌ moedict-dictionary-preview bucket 連接失敗"
    echo "請檢查 access key 和 secret key，或 bucket 名稱"
fi

# 測試上傳權限
echo ""
echo "🧪 測試上傳權限..."
echo "測試上傳到 moedict-assets-preview..."
echo "test" | rclone rcat r2:moedict-assets-preview/test.txt 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ moedict-assets-preview 上傳權限正常"
    # 清理測試文件
    rclone delete r2:moedict-assets-preview/test.txt 2>/dev/null
    echo "✅ 測試文件已清理"
else
    echo "❌ moedict-assets-preview 上傳權限失敗"
    echo "請檢查 bucket 權限設置或 bucket 名稱"
fi

echo ""
echo "🎯 建議的解決方案:"
echo "1. 如果連接失敗，重新配置 rclone: rclone config"
echo "2. 如果權限失敗，檢查 Cloudflare R2 的 API token 權限"
echo "3. 確保 bucket 名稱正確（注意：token 可能只限特定 bucket）"
echo "4. 嘗試使用較小的並發數: --transfers=1 --checkers=2"
echo "5. 如果 token 權限有限，確保 bucket 名稱與 token 權限匹配"
echo ""
echo "📝 注意：如果 R2 token 權限僅限特定 bucket，"
echo "   那麼 'rclone lsd r2:' 會失敗，這是正常的。"
echo "   請直接測試具體的 bucket 連接。"
