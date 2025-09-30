# 字體選擇功能測試

## 測試用例

### 1. 預設字體 (TW-Kai)
- URL: `/萌.png`
- 預期: 使用 TW-Kai 字體顯示

### 2. 指定字體參數
- URL: `/萌.png?font=kai`
- 預期: 使用 TW-Kai 字體顯示

### 3. 不存在的字體
- URL: `/萌.png?font=nonexistent`
- 預期: 返回 404 狀態碼，純文字 "目前R2中尚無nonexistent字體，待更新"

### 4. 支援的字體參數

#### 全字庫字體
- `/萌.png?font=kai` → TW-Kai (楷書) - **預設**
- `/萌.png?font=sung` → TW-Sung (宋體)
- `/萌.png?font=ebas` → EBAS (篆文)

#### 源雲明體
- `/萌.png?font=gwmel` → GenWanMinTWEL (特細)
- `/萌.png?font=gwml` → GenWanMinTWL (細體)
- `/萌.png?font=gwmr` → GenWanMinTWR (標準)
- `/萌.png?font=gwmm` → GenWanMinTWM (正明)
- `/萌.png?font=gwmsb` → GenWanMinTWSB (中明)

#### Justfont
- `/萌.png?font=openhuninn` → jf-openhuninn-2.1 (Open 粉圓)

#### 逢甲大學
- `/萌.png?font=shuowen` → ShuoWen (說文標篆)

#### cwTeX Q
- `/萌.png?font=cwming` → cwTeXQMing (明體)
- `/萌.png?font=cwhei` → cwTeXQHei (黑體)
- `/萌.png?font=cwyuan` → cwTeXQYuan (圓體)
- `/萌.png?font=cwkai` → cwTeXQKai (楷書)
- `/萌.png?font=cwfangsong` → cwTeXQFangsong (仿宋)

#### 思源宋體
- `/萌.png?font=shsx` → SourceHanSerifTCExtraLight (特細)
- `/萌.png?font=shsl` → SourceHanSerifTCLight (細體)
- `/萌.png?font=shsr` → SourceHanSerifTCRegular (標準)
- `/萌.png?font=shsm` → SourceHanSerifTCMedium (正宋)
- `/萌.png?font=shss` → SourceHanSerifTCSemiBold (中宋)
- `/萌.png?font=shsb` → SourceHanSerifTCBold (粗體)
- `/萌.png?font=shsh` → SourceHanSerifTCHeavy (特粗)

#### 思源黑體
- `/萌.png?font=srcx` → SourceHanSansTCExtraLight (特細)
- `/萌.png?font=srcl` → SourceHanSansTCLight (細體)
- `/萌.png?font=srcn` → SourceHanSansTCNormal (標準)
- `/萌.png?font=srcr` → SourceHanSansTCRegular (正黑)
- `/萌.png?font=srcm` → SourceHanSansTCMedium (中黑)
- `/萌.png?font=srcb` → SourceHanSansTCBold (粗體)
- `/萌.png?font=srch` → SourceHanSansTCHeavy (特粗)

#### 其他
- `/萌.png?font=rxkt` → Typography (特殊字體)

### 5. 王漢宗字體
- `/萌.png?font=wt071` → HanWangShinSuMedium (中行書)
- `/萌.png?font=wt024` → HanWangFangSongMedium (中仿宋)
- `/萌.png?font=wt021` → HanWangLiSuMedium (中隸書)
- `/萌.png?font=wt001` → HanWangMingLight (細明體)
- `/萌.png?font=wt002` → HanWangMingMedium (中明體)
- `/萌.png?font=wt003` → HanWangMingBold (粗明體)
- `/萌.png?font=wt005` → HanWangMingBlack (超明體)
- `/萌.png?font=wt004` → HanWangMingHeavy (特明體)
- `/萌.png?font=wt006` → HanWangYenLight (細圓體)
- `/萌.png?font=wt009` → HanWangYenHeavy (特圓體)
- `/萌.png?font=wt011` → HanWangHeiLight (細黑體)
- `/萌.png?font=wt014` → HanWangHeiHeavy (特黑體)
- `/萌.png?font=wt064` → HanWangYanKai (顏楷體)
- `/萌.png?font=wt028` → HanWangKanDaYan (空疊圓)
- `/萌.png?font=wt034` → HanWangKanTan (勘亭流)
- `/萌.png?font=wt040` → HanWangZonYi (綜藝體)
- `/萌.png?font=wtcc02` → HanWangCC02 (酷儷海報)
- `/萌.png?font=wtcc15` → HanWangCC15 (酷正海報)
- `/萌.png?font=wthc06` → HanWangGB06 (鋼筆行楷)

## 實現細節

1. **字體參數解析**: 從 URL 查詢參數中獲取 `font` 參數
2. **字體名稱映射**: 使用 `getFontName()` 函數將參數映射到實際字體名稱
3. **R2 可用性檢查**: 使用 `checkFontAvailability()` 檢查字體是否在 R2 中可用
4. **錯誤處理**: 如果字體不可用，返回 404 狀態碼和純文字錯誤訊息

## 路由對應

新專案的路由設計與原專案完全一致：
- `/:text.png` - 圖片生成路由
- 支援 `?font=` 查詢參數
- 預設字體為 `kai` (TW-Kai)
