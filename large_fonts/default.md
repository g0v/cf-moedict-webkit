# 預設字體設定

## 原專案預設字體分析

根據 `moedict-webkit/server.ls` 中的 `font-of` 函數分析：

### 預設字體
- **預設字體**: `TW-Kai` (楷書)
- **邏輯**: 當沒有字體參數或字體參數不匹配時，回傳 `wt2font[it] || 'TW-Kai'`

### 字體參數對應表

#### 全字庫字體
- `kai` → `TW-Kai` (楷書) - **預設**
- `sung` → `TW-Sung` (宋體)
- `ebas` → `EBAS` (篆文)

#### 源雲明體
- `gwmel` → `GenWanMin TW EL` (特細)
- `gwml` → `GenWanMin TW L` (細體)
- `gwmr` → `GenWanMin TW R` (標準)
- `gwmm` → `GenWanMin TW M` (正明)
- `gwmsb` → `GenWanMin TW SB` (中明)

#### Justfont
- `openhuninn` → `jf-openhuninn-1.1` (Open 粉圓)

#### 逢甲大學
- `shuowen` → `ShuoWen` (說文標篆)

#### cwTeX Q
- `cwming` → `cwTeXQMing` (明體)
- `cwhei` → `cwTeXQHei` (黑體)
- `cwyuan` → `cwTeXQYuan` (圓體)
- `cwkai` → `cwTeXQKai` (楷書)
- `cwfangsong` → `cwTeXQFangsong` (仿宋)

#### 思源宋體
- `shsx` → `SourceHanSerifTCExtraLight` (特細)
- `shsl` → `SourceHanSerifTCLight` (細體)
- `shsr` → `SourceHanSerifTCRegular` (標準)
- `shsm` → `SourceHanSerifTCMedium` (正宋)
- `shss` → `SourceHanSerifTCSemiBold` (中宋)
- `shsb` → `SourceHanSerifTCBold` (粗體)
- `shsh` → `SourceHanSerifTCHeavy` (特粗)

#### 思源黑體
- `srcx` → `SourceHanSansTCExtraLight` (特細)
- `srcl` → `SourceHanSansTCLight` (細體)
- `srcn` → `SourceHanSansTCNormal` (標準)
- `srcr` → `SourceHanSansTCRegular` (正黑)
- `srcm` → `SourceHanSansTCMedium` (中黑)
- `srcb` → `SourceHanSansTCBold` (粗體)
- `srch` → `SourceHanSansTCHeavy` (特粗)

#### 其他
- `rxkt` → `Typography` (特殊字體)

#### 王漢宗字體 (wt2font 映射)
- `wt071` → `HanWangShinSuMedium` (中行書)
- `wt024` → `HanWangFangSongMedium` (中仿宋)
- `wt021` → `HanWangLiSuMedium` (中隸書)
- `wt001` → `HanWangMingLight` (細明體)
- `wt002` → `HanWangMingMedium` (中明體)
- `wt003` → `HanWangMingBold` (粗明體)
- `wt005` → `HanWangMingBlack` (超明體)
- `wt004` → `HanWangMingHeavy` (特明體)
- `wt006` → `HanWangYenLight` (細圓體)
- `wt009` → `HanWangYenHeavy` (特圓體)
- `wt011` → `HanWangHeiLight` (細黑體)
- `wt014` → `HanWangHeiHeavy` (特黑體)
- `wt064` → `HanWangYanKai` (顏楷體)
- `wt028` → `HanWangKanDaYan` (空疊圓)
- `wt034` → `HanWangKanTan` (勘亭流)
- `wt040` → `HanWangZonYi` (綜藝體)
- `wtcc02` → `HanWangCC02` (酷儷海報)
- `wtcc15` → `HanWangCC15` (酷正海報)
- `wthc06` → `HanWangGB06` (鋼筆行楷)

## 新專案實作需求

1. **預設字體**: 使用 `TW-Kai` 作為預設字體
2. **字體參數**: 支援 `?font=kai` 等查詢參數
3. **R2 檢查**: 檢查 R2 中是否有對應字體的 SVG 檔案
4. **錯誤處理**: 如果 R2 中沒有該字體，顯示錯誤訊息

## 需要下載的預設字體

**TW-Kai** - 這是預設字體，必須優先下載並上傳到 R2
