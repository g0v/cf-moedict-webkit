from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
import json

# 讀取萌典單字列表
with open("../word_list/word_list.json", "r", encoding="utf-8") as f:
    moedict_words = set(json.load(f))

print(f"載入了 {len(moedict_words)} 個萌典單字")

foldername = "cwTeXQFangsong-Medium"
font = TTFont(foldername + ".ttf")
glyph_set = font.getGlyphSet()
cmap = {cp:gn for table in font["cmap"].tables for cp,gn in table.cmap.items()}

UPM = font["head"].unitsPerEm
ASC = font["hhea"].ascent

# Output folder 設定
fontname = "cwTeXQFangsong"
output_folder = fontname
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

    if foldername == "cwTeXQHeiZH-Bold":
        OFFSET = 100
    elif foldername == "cwTeXQHei-Bold":
        OFFSET = 170
    elif foldername == "cwTeXQYuan-Medium" and cp in [0xFF59, 0xFF47, 0xFF50, 0xFF51]:  # 全形 y, g, p, q
        OFFSET = 240
        print(f"特殊處理字符 {chr(cp)} (U+{cp:04X}): OFFSET = {OFFSET}")
    elif foldername == "cwTeXQKai-Medium" and cp in [0xFF59, 0xFF47, 0xFF50, 0xFF51, 0x002C, 0x003B]:  # 全形 y, g, p, q, ",", ";"
        OFFSET = 240
        print(f"特殊處理字符 {chr(cp)} (U+{cp:04X}): OFFSET = {OFFSET}")
    elif foldername == "cwTeXQFangsong-Medium" and cp in [0xFF59, 0xFF47, 0xFF50, 0xFF51, 0x002C, 0x003B]:  # 全形 y, g, p, q, ",", ";"
        OFFSET = 240
        print(f"特殊處理字符 {chr(cp)} (U+{cp:04X}): OFFSET = {OFFSET}")
    else:
        OFFSET = 110
        print(f"普通處理字符 {chr(cp)} (U+{cp:04X}): OFFSET = {OFFSET}")

    # 向上移動 OFFSET 個單位（可根據需要調整）
    y_offset = OFFSET
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{UPM}" height="{UPM}" viewBox="0 0 {UPM} {UPM}"><g transform="translate(0,{ASC - y_offset})"><path d="{d}"/></g></svg>'

    with open(os.path.join(output_folder, f"U+{cp:04X}.svg"), "w", encoding="utf-8") as f: f.write(svg)
    processed_count += 1
    if processed_count % 100 == 0:
        print(f"已處理 {processed_count}/{len(target_cps)} 個字符")

print(f"完成！總共生成了 {processed_count} 個 SVG 檔案")
