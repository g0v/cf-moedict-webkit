from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
import json

# 讀取萌典單字列表
with open("../word_list/word_list.json", "r", encoding="utf-8") as f:
    moedict_words = set(json.load(f))

print(f"載入了 {len(moedict_words)} 個萌典單字")

font = TTFont("cwTeXQMingZH-Medium.ttf")
glyph_set = font.getGlyphSet()
cmap = {cp:gn for table in font["cmap"].tables for cp,gn in table.cmap.items()}

UPM = font["head"].unitsPerEm
ASC = font["hhea"].ascent

# Output folder 設定
output_folder = "cwTeXQMing"
os.makedirs(output_folder, exist_ok=True)

# 只處理萌典中有的字
target_cps = [cp for cp in cmap.keys() if chr(cp) in moedict_words]

print(f"字體中總共有 {len(cmap)} 個字符")
print(f"其中 {len(target_cps)} 個字符在萌典中")

processed_count = 0
for cp in target_cps:
    gname = cmap[cp]
    spen = SVGPathPen(glyph_set)
    pen = TransformPen(spen, (1,0,0,-1,0,0))   # flip Y for SVG
    glyph_set[gname].draw(pen)
    d = spen.getCommands()
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{UPM}" height="{UPM}" viewBox="0 0 {UPM} {UPM}"><g transform="translate(0,{ASC})"><path d="{d}"/></g></svg>'
    with open(os.path.join(output_folder, f"U+{cp:04X}.svg"), "w", encoding="utf-8") as f: f.write(svg)
    processed_count += 1
    if processed_count % 100 == 0:
        print(f"已處理 {processed_count}/{len(target_cps)} 個字符")

print(f"完成！總共生成了 {processed_count} 個 SVG 檔案")
