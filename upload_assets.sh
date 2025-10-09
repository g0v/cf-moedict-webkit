#!/bin/bash

# 安全上傳前端資產到 R2 Storage
# 使用更保守的設置，避免 403 錯誤

set -e  # 遇到錯誤時退出

BUCKET="r2:moedict-assets-preview"
ASSETS_DIR="./assets"

echo "🚀 開始安全上傳前端資產到 R2..."

# 檢查 rclone 是否已配置
if ! rclone listremotes | grep -q "^r2:"; then
    echo "❌ 錯誤: rclone 未配置 r2 remote"
    echo "請先運行: rclone config"
    exit 1
fi

# 檢查資產目錄是否存在
if [ ! -d "$ASSETS_DIR" ]; then
    echo "❌ 錯誤: 資產目錄不存在: $ASSETS_DIR"
    exit 1
fi

echo "📁 準備上傳資產目錄: $ASSETS_DIR"

# 保守的 rclone 設置
RCLONE_OPTS="--progress --transfers=1 --checkers=2 --buffer-size=512K --retries=5 --low-level-retries=20 --retries-sleep=5s --timeout=300s"

# 上傳 CSS 文件
echo ""
echo "📤 上傳 CSS 文件..."
if [ -d "$ASSETS_DIR/css" ]; then
    for css_file in "$ASSETS_DIR/css"/*.css; do
        if [ -f "$css_file" ]; then
            filename=$(basename "$css_file")
            echo "  上傳: $filename"
            rclone copy "$css_file" "$BUCKET/css/" $RCLONE_OPTS
        fi
    done
    echo "✅ CSS 文件上傳完成"
else
    echo "⚠️  CSS 目錄不存在，跳過"
fi

# 上傳主要 CSS
if [ -f "$ASSETS_DIR/styles.css" ]; then
    echo "📤 上傳 styles.css..."
    rclone copy "$ASSETS_DIR/styles.css" "$BUCKET/" $RCLONE_OPTS
    echo "✅ styles.css 上傳完成"
else
    echo "⚠️  styles.css 不存在，跳過"
fi

# 上傳 JavaScript 文件（逐個上傳）
echo ""
echo "📤 上傳 JavaScript 文件..."
if [ -d "$ASSETS_DIR/js" ]; then
    js_files=$(find "$ASSETS_DIR/js" -name "*.js" | wc -l)
    echo "發現 $js_files 個 JS 文件"

    for js_file in "$ASSETS_DIR/js"/*.js; do
        if [ -f "$js_file" ]; then
            filename=$(basename "$js_file")
            echo "  上傳: $filename"
            rclone copy "$js_file" "$BUCKET/js/" $RCLONE_OPTS
        fi
    done
    echo "✅ JavaScript 文件上傳完成"
else
    echo "⚠️  JS 目錄不存在，跳過"
fi

# 上傳圖片文件
echo ""
echo "📤 上傳圖片文件..."
if [ -d "$ASSETS_DIR/images" ]; then
    for img_file in "$ASSETS_DIR/images"/*; do
        if [ -f "$img_file" ]; then
            filename=$(basename "$img_file")
            echo "  上傳: $filename"
            rclone copy "$img_file" "$BUCKET/images/" $RCLONE_OPTS
        fi
    done
    echo "✅ 圖片文件上傳完成"
else
    echo "⚠️  圖片目錄不存在，跳過"
fi

# 上傳字體文件（如果有的話）
if [ -d "$ASSETS_DIR/fonts" ]; then
    echo ""
    echo "📤 上傳字體文件..."
    for font_file in "$ASSETS_DIR/fonts"/*; do
        if [ -f "$font_file" ]; then
            filename=$(basename "$font_file")
            echo "  上傳: $filename"
            rclone copy "$font_file" "$BUCKET/fonts/" $RCLONE_OPTS
        fi
    done
    echo "✅ 字體文件上傳完成"
else
    echo "⚠️  字體目錄不存在，跳過"
fi

echo ""
echo "🎉 資產上傳完成！"
echo ""
echo "📊 上傳摘要:"
echo "查看上傳的文件："
rclone ls "$BUCKET" | head -20

echo ""
echo "🔗 R2 Storage 路徑: $BUCKET"
