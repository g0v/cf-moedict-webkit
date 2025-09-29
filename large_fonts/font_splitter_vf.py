from fontTools.ttLib import TTFont
from fontTools.varLib.mutator import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
import json

# 讀取萌典單字列表
with open("../word_list/word_list.json", "r", encoding="utf-8") as f:
    moedict_words = set(json.load(f))

print(f"載入了 {len(moedict_words)} 個萌典單字")

# 思源宋體變體對應表（字重名稱和對應的 wght 值）
source_han_serif_variants = {
    "SourceHanSerifTCExtraLight": 200,  # ExtraLight
    "SourceHanSerifTCLight": 300,       # Light
    "SourceHanSerifTCRegular": 400,     # Regular
    "SourceHanSerifTCMedium": 500,      # Medium
    "SourceHanSerifTCSemiBold": 600,    # SemiBold
    "SourceHanSerifTCBold": 700,        # Bold
    "SourceHanSerifTCHeavy": 800        # Heavy
}

# 載入可變字體
variable_font_file = "SourceHanSerifTC-VF.ttf"
if not os.path.exists(variable_font_file):
    print(f"錯誤：找不到可變字體檔案 {variable_font_file}")
    exit(1)

print(f"正在載入可變字體 {variable_font_file}...")
variable_font = TTFont(variable_font_file)

# 檢查是否為可變字體
if 'fvar' not in variable_font:
    print("錯誤：字體檔案不是可變字體（缺少 fvar 表）")
    exit(1)

# 獲取 wght 軸
fvar = variable_font['fvar']
wght_axis = None
for axis in fvar.axes:
    if axis.axisTag == 'wght':
        wght_axis = axis
        break

if not wght_axis:
    print("錯誤：字體檔案中沒有 wght 軸")
    exit(1)

print(f"找到 wght 軸，範圍：{wght_axis.minValue} - {wght_axis.maxValue}")

# 處理每個思源宋體變體
for variant_name, weight_value in source_han_serif_variants.items():
    print(f"\n正在處理 {variant_name} (wght={weight_value})...")

    # 從可變字體中提取靜態字體
    instance_coords = {wght_axis.axisTag: weight_value}
    static_font = instantiateVariableFont(variable_font, instance_coords)

    glyph_set = static_font.getGlyphSet()
    cmap = {cp:gn for table in static_font["cmap"].tables for cp,gn in table.cmap.items()}

    UPM = static_font["head"].unitsPerEm
    ASC = static_font["hhea"].ascent
    DESC = static_font["hhea"].descent

    print("UPM, ASC, DESC")
    print(UPM)
    print(ASC)
    print(DESC)

    # 建立輸出資料夾
    output_folder = variant_name
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
        # 調整座標轉換，將字體正確放置在視窗內
        # 使用 UPM 作為高度，並將字體置中
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{UPM}" height="{UPM}" viewBox="0 0 {UPM} {UPM}"><g transform="translate(0,{UPM + UPM + UPM + UPM - ASC - ASC - ASC - DESC})"><path d="{d}"/></g></svg>'
        with open(os.path.join(output_folder, f"U+{cp:04X}.svg"), "w", encoding="utf-8") as f: f.write(svg)
        processed_count += 1
        if processed_count % 100 == 0:
            print(f"已處理 {processed_count}/{len(target_cps)} 個字符")

    print(f"完成！{variant_name} 總共生成了 {processed_count} 個 SVG 檔案")

print(f"\n所有思源宋體變體處理完成！")
