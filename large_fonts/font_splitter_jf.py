from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
import json

# 讀取萌典單字列表
with open("../word_list/word_list.json", "r", encoding="utf-8") as f:
    moedict_words = set(json.load(f))

print(f"載入了 {len(moedict_words)} 個萌典單字")

font = TTFont("jf-openhuninn-2.1.ttf")
glyph_set = font.getGlyphSet()
cmap = {cp:gn for table in font["cmap"].tables for cp,gn in table.cmap.items()}

UPM = font["head"].unitsPerEm
ASC = font["hhea"].ascent
DESC = font["hhea"].descent

print(f"UPM={UPM}, ASC={ASC}, DESC={DESC}")

# Output folder 設定
output_folder = "jf-openhuninn-2.1"
os.makedirs(output_folder, exist_ok=True)

# 只處理萌典中有的字
target_cps = [cp for cp in cmap.keys() if chr(cp) in moedict_words]

print(f"字體中總共有 {len(cmap)} 個字符")
print(f"其中 {len(target_cps)} 個字符在萌典中")

# 計算縮放比例和偏移量
total_height = ASC - DESC  # DESC 是負值，所以相減得到總高度

# 縮放比例：讓字形高度適應 UPM
# 使用稍小的縮放（75%），既能避免裁切又不會太小
scale = UPM / total_height * 0.75  # 縮小到 75%，留 25% 安全邊距

# Y 軸偏移：將基線放在正確位置
# 翻轉後，基線應該在距離頂部 ASC * scale 的位置
# 再加上一點邊距，讓字形垂直置中
margin_top = (UPM - total_height * scale) / 2
y_offset = ASC * scale + margin_top

processed_count = 0
for cp in target_cps:
    gname = cmap[cp]
    spen = SVGPathPen(glyph_set)
    # TransformPen: (scale_x, skew_x, skew_y, scale_y, translate_x, translate_y)
    # scale_x = scale, scale_y = -scale (翻轉 Y 軸並縮放)
    pen = TransformPen(spen, (scale, 0, 0, -scale, 0, 0))
    glyph_set[gname].draw(pen)
    d = spen.getCommands()

    # 計算字形寬度並水平置中
    # 取得字形的邊界框
    try:
        bounds = glyph_set[gname].width * scale
        x_offset = (UPM - bounds) / 2
    except:
        x_offset = 0

    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{UPM}" height="{UPM}" viewBox="0 0 {UPM} {UPM}"><g transform="translate({x_offset},{y_offset})"><path d="{d}"/></g></svg>'
    with open(os.path.join(output_folder, f"U+{cp:04X}.svg"), "w", encoding="utf-8") as f: f.write(svg)
    processed_count += 1
    if processed_count % 100 == 0:
        print(f"已處理 {processed_count}/{len(target_cps)} 個字符")

print(f"完成！總共生成了 {processed_count} 個 SVG 檔案")
