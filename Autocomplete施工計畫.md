# Autocomplete 施工計畫

## 目標
復刻原專案 `moedict-webkit` 的 autocomplete 功能，完整實現側欄搜尋框的自動完成建議功能。

## 參考來源
- 原專案檔案：`moedict-webkit/main.ls`
- 核心函數：`init-autocomplete` (第 730-817 行)
- 相關函數：`trs_lookup`, `pinyin_lookup`, `xref-of`, `b2g`

---

## TODO LIST

### 階段一：核心 Autocomplete 初始化

- [ ] **1. 實現 autocomplete widget 自訂擴展**
  - [ ] 位置：`src/hooks/useAutocomplete.ts` 或新增檔案
  - [ ] 參考：`main.ls:730-743`
  - [ ] 功能：
    - `_close`: 關閉時添加 `invisible` class（而非移除元素）
    - `_resizeMenu`: 動態調整選單寬度，確保不窄於輸入框寬度
    - `_value`: 當有值時自動填充查詢框

- [ ] **2. 實現 autocomplete 配置**
  - [ ] 位置：`src/components/sidebar/SearchBox.tsx`
  - [ ] 參考：`main.ls:744-817`
  - [ ] 配置項目：
    - `position`: `{ my: "left bottom", at: "left top" }`
    - `select`: 處理選擇事件的回調
    - `change`: 處理變更事件的回調
    - `source`: 生成建議陣列的核心函數

---

### 階段二：Source 函數核心邏輯

- [ ] **3. 實現特殊輸入處理**
  - [ ] 位置：`source` 函數開頭
  - [ ] 參考：`main.ls:767-768`
  - [ ] 功能：
    - `=諺語` + 台語 (`LANG === 't'`) → 轉換為 `"。"`
    - `=諺語` + 客語 (`LANG === 'h'`) → 轉換為 `"，"`
    - 隱藏 iframe（Google 搜尋框）
    - 空字串直接返回空陣列

- [ ] **4. 實現 TRS（台語羅馬字）查找**
  - [ ] 位置：新增 `src/utils/trsLookup.ts`
  - [ ] 參考：`main.ls:828-831`
  - [ ] 條件觸發：
    - 語言為台語 (`LANG === 't'`)
    - 且輸入為純 ASCII（`/[^\u0000-\u00FF]/` 不匹配）
    - 且不包含 `,`, `;`, `0-9`
  - [ ] 功能：
    - GET 請求：`https://www.moedict.tw/lookup/trs/{term}` (需依原專案創建該路由)
    - 處理 PUA（Private Use Area）字元轉換
    - 參考：`PUA2UNI` 映射表（`main.ls:819-827`）
    - 以 `|` 分割結果並去重

- [ ] **5. 實現拼音查找**
  - [ ] 位置：新增 `src/utils/pinyinLookup.ts`
  - [ ] 參考：`main.ls:833-855`
  - [ ] 條件觸發：
    - 輸入符合正則：`/^[a-zA-Z1-4 ']+$/`
  - [ ] 功能：
    - 從 localStorage 讀取拼音類型：`localStorage.getItem("pinyin_#{LANG}")` 預設 `HanYu`
    - 處理漢語拼音空格：使用複雜正則將拼音音節間插入空格（僅華語/兩岸 + 漢語拼音）
    - 分割查詢字串：`split(/[\s']+/)`
    - 對每個音節發送 GET 請求：`lookup/pinyin/#{LANG}/#{pinyin_type}/#{term}.json`  (需依原專案創建該路由)
    - 找出所有音節都匹配的字詞（交集）
    - 如果找不到：返回 `["無符合之詞"]`

- [ ] **6. 實現行動裝置特殊提示**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:773`
  - [ ] 條件觸發：
    - 螢幕寬度 < 768px（`width-is-xs!()`）
    - 且輸入不包含特殊符號：`/[「」。，?.*_% ]/`
  - [ ] 功能：
    - 返回：`["→列出含有「#{term}」的詞"]`

- [ ] **7. 實現特殊前綴處理**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:774`
  - [ ] 條件觸發：
    - 輸入以 `@` 或 `=` 開頭：`/^[@=]/`
  - [ ] 功能：
    - 直接調用 `do-lookup(term)` 進行查詢

---

### 階段三：正則表達式匹配邏輯

- [ ] **8. 實現輸入文字清理**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:775-781`
  - [ ] 功能：
    - 移除 `→列出含有「` 前綴
    - 移除 `」的詞` 後綴
    - `*` → `%`
    - `-`、`—` → `－`
    - `,`、`﹐` → `，`
    - `;`、`﹔` → `；`
    - `．`、`﹒` → `。`

- [ ] **9. 實現正則表達式構建（開頭匹配）**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:782-786`
  - [ ] 邏輯：
    - 如果結尾是空白或包含 `^`：
      - 移除 `^`
      - 移除結尾空白
      - 正則 = `"` + term
    - 否則（且不包含 `[?._%]`）：
      - 正則 = `[^"]*` + term

- [ ] **10. 實現正則表達式構建（結尾匹配）**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:789-794`
  - [ ] 邏輯：
    - 如果開頭是空白或包含 `$`：
      - 移除 `$`
      - 移除開頭空白
      - 正則 = term + `"`
    - 否則（且不包含 `[?._%]`）：
      - 正則 = term + `[^"]*`

- [ ] **11. 實現萬用字元處理**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:795-799`
  - [ ] 功能：
    - 移除所有空白字元
    - 如果包含 `[%?._]`：
      - `?`、`.`、`_` → `[^"]`
      - `%` → `[^"]*`
      - 正則 = `"` + regex + `"`
    - 移除空的括號 `()`

- [ ] **12. 實現簡繁轉換（b2g）**
  - [ ] 位置：新增 `src/utils/b2g.ts`
  - [ ] 參考：`main.ls:859-866`
  - [ ] 功能：
    - 需要 `SIMP-TRAD` 映射表（`js/simp-trad.js`）
    - 特殊處理：
      - 語言為華語/兩岸且不是 `@` 開頭：`台([北中南東灣語])` → `臺$1`
      - 例外字列表：`叁 勅 疎 効 嘷 凥 凟 擧 彛 煅 厮 勠 叶 湼 袴 飱 顋 呪 蟮 眦 幷 滙 庄 鼗 厠 彠 覩 歺 唣 廵 榘 幞 郄 峯 恒 迹 麽 羣 讁 攵 緜 浜 彡 夊 夂 厶 广 廴 丶 台`
      - 遍歷每個字元，在 `SIMP-TRAD` 中查找，如果索引是偶數則轉換為下一個（繁體），奇數則保持
      - 最後再次處理 `台` → `臺` 的轉換

- [ ] **13. 實現 INDEX 匹配**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:801`
  - [ ] 功能：
    - `INDEX[LANG]` 是一個字串（從 `{LANG}/index.json` 載入）
    - 使用正則：`new RegExp(b2g(regex), 'g')` 進行匹配
    - 使用 `try-catch` 包裹，避免正則錯誤

---

### 階段四：交叉引用和結果處理

- [ ] **14. 實現交叉引用查找（xref-of）**
  - [ ] 位置：新增 `src/utils/xrefOf.ts`
  - [ ] 參考：`main.ls:76-93`
  - [ ] 功能：
    - 如果 `XREF[src-lang]` 是字串，需要解析為物件
    - 解析格式：`{tgt-lang}:{words}}` 的結構
    - 在 `words` 字串中查找 `"#{id}":`
    - 提取對應的值（逗號分隔的字詞列表）
    - 返回格式：`{ [tgt-lang]: [word1, word2, ...] }`
  - [ ] 觸發條件：
    - 當 INDEX 匹配失敗時作為備選（`main.ls:802`）
    - 語言互換：華語查台語，台語查華語

- [ ] **15. 實現客語特殊處理**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:803-804`
  - [ ] 功能：
    - 如果語言為客語且輸入為 `我`：
      - 在結果陣列開頭插入 `𠊎`

- [ ] **16. 實現台語變體查找**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:805-806`
  - [ ] 功能：
    - 如果語言為台語：
      - 調用 `xref-of(term, 'tv', 't')` 查找變體
      - 反轉結果順序並插入到陣列開頭
      - 去除重複項

- [ ] **17. 實現無結果處理**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:807-809`
  - [ ] 功能：
    - 兩岸詞典：返回 `["▶找不到。建議收錄？"]`
    - 其他語言：返回 `["▶找不到。分享這些字？"]`
    - 如果結果陣列為空：返回 `['']`

- [ ] **18. 實現單一結果自動查詢**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:810`
  - [ ] 功能：
    - 如果結果只有一筆：
      - 自動調用 `do-lookup(results[0].replace(/"/g, ''))`

- [ ] **19. 實現結果數量限制**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:811-815`
  - [ ] 功能：
    - 行動裝置：最多 400 筆
    - 桌面裝置：最多 1024 筆
    - 如果超過限制：
      - 截取前 N 筆
      - 追加提示：`"(僅顯示前 {MaxResults} 筆)"`

- [ ] **20. 實現結果清理和回傳**
  - [ ] 位置：`source` 函數
  - [ ] 參考：`main.ls:816`
  - [ ] 功能：
    - 移除所有結果中的 `"` 引號
    - 使用 `map` 函數處理
    - 回傳給 callback：`cb(cleanedResults)`

---

### 階段五：Select 和 Change 事件處理

- [ ] **21. 實現 select 事件處理**
  - [ ] 位置：`SearchBox.tsx` 的 autocomplete 配置
  - [ ] 參考：`main.ls:748-758`
  - [ ] 功能：
    - 如果選項值以 `▶` 開頭：
      - 提取字詞（移除 `→列出含有「` 和 `」的詞`）
      - 兩岸詞典：打開 mailto 連結
      - 其他語言：打開新視窗到 `https://www.moedict.tw/#{HASH-OF[LANG]}#{val}`
      - 返回 `false`
    - 如果選項值以 `(` 開頭：返回 `false`（不處理）
    - 否則：調用 `fill-query(item.value)`

- [ ] **22. 實現 change 事件處理**
  - [ ] 位置：`SearchBox.tsx` 的 autocomplete 配置
  - [ ] 參考：`main.ls:759-765`
  - [ ] 功能：
    - 檢查 `#query` 的 `data.changing` 標記
    - 如果選項值以 `(` 開頭：返回 `false`
    - 設定 `changing` 標記
    - 調用 `fill-query(item.value)`
    - 清除 `changing` 標記
    - 返回 `true`

---

### 階段六：資料載入和初始化

- [ ] **23. 實現 INDEX 載入**
  - [ ] 位置：`useAutocomplete.ts`
  - [ ] 參考：`main.ls:687-696`
  - [ ] 功能：
    - Cordova 環境：載入 `{lang}/index.1.json` 和 `{lang}/index.2.json`，合併
    - Web 環境：載入 `{lang}/index.json`
    - 完成後調用 `init-autocomplete()`

- [ ] **24. 實現 XREF 載入**
  - [ ] 位置：`useAutocomplete.ts` 或新增 hook
  - [ ] 參考：`main.ls:687-699`
  - [ ] 功能：
    - 載入所有語言的 `{lang}/xref.json`
    - 載入兩岸詞典變體：`t/variants.json` → `XREF.tv`
    - 儲存到全域或 context 中

- [ ] **25. 實現分類索引載入**
  - [ ] 位置：導航列相關組件
  - [ ] 參考：`main.ls:703-710`
  - [ ] 功能：
    - 載入 `{lang}/=.json`（分類索引）
    - 調用 `render-taxonomy` 渲染下拉選單
    - 排除客語（`lang !== 'h'`）

---

### 階段七：後端路由實現

- [ ] **37. 實現 `/lookup/trs/{term}` 路由**
  - [ ] 位置：`src/index.ts` 或新增 `src/routes/lookup.ts`
  - [ ] 參考：`main.ls:828-831`, `build-pinyin-lookup.pl`
  - [ ] 路由格式：`GET /lookup/trs/{term}`
  - [ ] 功能：
    - 接收台語羅馬字（TRS）輸入
    - 在台語字典中查找所有包含該 TRS 的字詞
    - 返回格式：管道分隔的字串（`word1|word2|word3`）
    - 處理 PUA（Private Use Area）字元轉換
    - 參考：`PUA2UNI` 映射表（`main.ls:819-827`）
    - 去重處理
  - [ ] 實作邏輯：
    - 遍歷台語字典（`t/` 目錄下所有 JSON 檔案）
    - 檢查每個詞條的 `heteronyms` 中的 `trs` 欄位
    - 如果 TRS 包含查詢字串（不區分大小寫），加入結果
    - 處理組合字（如 `⿰𧾷百` → `𬦰`）的轉換
    - 返回管道分隔的字串

- [ ] **38. 實現 `/lookup/pinyin/{LANG}/{pinyin_type}/{term}.json` 路由**
  - [ ] 位置：`src/index.ts` 或新增 `src/routes/lookup.ts`
  - [ ] 參考：`main.ls:833-855`, `build-pinyin-lookup.pl`（完整腳本）
  - [ ] 路由格式：`GET /lookup/pinyin/{LANG}/{pinyin_type}/{term}.json`
  - [ ] 參數說明：
    - `LANG`: `a`（華語）、`t`（台語）、`h`（客語）、`c`（兩岸）
    - `pinyin_type`: `HanYu`、`HanYu-TongYong`、`TongYong`、`WadeGiles`、`GuoYin`、`TL`、`TL-DT`、`DT`、`POJ`
    - `term`: 拼音音節（如 `meng`、`dian`）
  - [ ] 返回格式：JSON 陣列 `["詞1", "詞2", "詞3", ...]`
  - [ ] 功能：
    - 在指定語言的字典中查找所有包含該拼音的字詞
    - 支援多種拼音系統
    - 結果按字詞長度、出現位置、頻率排序
  - [ ] 實作邏輯：
    - 讀取對應語言的字典檔案
    - 遍歷所有詞條的 `heteronyms`
    - 提取 `pinyin` 或 `trs` 欄位（根據語言和拼音類型）
    - 使用 `analyze_pinyin_field` 邏輯分析拼音欄位
    - 找出所有包含查詢音節的字詞
    - 建立索引：`{ [term]: { [title]: [position, frequency] } }`
    - 排序：按字詞長度 → 出現位置 → 頻率（降序）
    - 返回排序後的字詞陣列

- [ ] **39. 實現拼音分析函數**
  - [ ] 位置：`src/utils/pinyinAnalysis.ts`
  - [ ] 參考：`build-pinyin-lookup.pl:26-38`
  - [ ] 功能：
    - 分析拼音欄位，提取所有拼音音節
    - 處理 Unicode 正規化（NFD）
    - 移除所有標記（Mark）
    - `ɑ` → `a` 轉換
    - 提取所有符合拼音格式的音節（`/[a-z]+/i`）
    - 使用已知拼音正則過濾（僅兩岸詞典需要）

- [ ] **40. 實現拼音索引建立**
  - [ ] 位置：`src/utils/pinyinIndex.ts`
  - [ ] 參考：`build-pinyin-lookup.pl:40-54`
  - [ ] 功能：
    - 為每個拼音音節建立反向索引
    - 記錄字詞標題、出現位置、頻率
    - 格式：`{ [pinyin_term]: { [title]: [position, frequency] } }`

- [ ] **41. 實現拼音索引排序**
  - [ ] 位置：`src/utils/pinyinIndex.ts`
  - [ ] 參考：`build-pinyin-lookup.pl:56-73`
  - [ ] 功能：
    - 對每個拼音音節的結果進行排序
    - 排序規則：
      1. 字詞長度（短的在前）
      2. 出現位置（位置小的在前）
      3. 頻率（高的在前）
    - 轉換為陣列格式：`[[title, position, frequency], ...]`

- [ ] **42. 在路由層整合 lookup 路由**
  - [ ] 位置：`src/index.ts`
  - [ ] 功能：
    - 在主要路由處理函數中新增對 `/lookup/` 開頭路由的處理
    - 路由匹配：
      - `/lookup/trs/{term}` → 調用 TRS 查找處理函數
      - `/lookup/pinyin/{LANG}/{pinyin_type}/{term}.json` → 調用拼音查找處理函數
    - 返回適當的 Content-Type：
      - TRS: `text/plain; charset=utf-8`
      - Pinyin: `application/json; charset=utf-8`
    - 包含 CORS 標頭

- [ ] **43. 實作 TRS 查找的資料結構**
  - [ ] 位置：`src/utils/trsLookup.ts`
  - [ ] 功能：
    - 建立 TRS 到字詞的映射
    - 可以預先建立索引（類似拼音索引）
    - 或動態查詢（較慢但記憶體占用少）
    - 處理大小寫不敏感匹配
    - 處理部分匹配（包含關係）

- [ ] **44. 實作拼音查找的資料預處理**
  - [ ] 位置：`src/utils/pinyinPreprocess.ts` 或建置腳本
  - [ ] 參考：`build-pinyin-lookup.pl`（完整流程）
  - [ ] 功能：
    - 可以選擇：
      - **方案 A**：預先建立所有拼音索引檔案（靜態檔案）
      - **方案 B**：動態建立索引（首次查詢時建立，後續快取）
      - **方案 C**：每次查詢都動態查找（最慢但最簡單）
    - 建議採用方案 B（動態建立 + 快取）
    - 建立索引時需要處理所有拼音類型

- [ ] **45. 處理 PUA 字元轉換**
  - [ ] 位置：`src/utils/puaMapping.ts`
  - [ ] 參考：`main.ls:819-827`
  - [ ] 功能：
    - 定義 `PUA2UNI` 映射表
    - 處理組合字轉換：
      - `⿰𧾷百` → `𬦰`
      - `⿸疒哥` → `𰣻`
      - `⿰亻恩` → `𫣆`
      - `⿰虫念` → `𬠖`
      - `⿺皮卜` → `󿕅`
    - 在 TRS 查找結果中應用轉換

---

### 階段八：輔助函數和工具

- [ ] **26. 實現 fill-query 函數**
  - [ ] 位置：`src/utils/fillQuery.ts` 或 `SearchBox.tsx`
  - [ ] 參考：`main.ls:423-442`
  - [ ] 功能：
    - 從輸入值提取標題（移除 `[（(].*`）
    - 移除語言前綴（`'`, `:`, `!`, `~`）
    - 如果以 `<` 開頭：返回
    - 如果以 `→` 開頭：模糊搜尋模式
    - 設定 `#query` 的值
    - 設定 `form[id=lookback] input[id=cond]` 的值（除非是 Cordova）
    - 行動裝置：關閉 autocomplete 並 blur
    - 桌面：focus 並 select
    - 調用 `lookup(title)`

- [ ] **27. 實現 lookup 函數**
  - [ ] 位置：`src/utils/lookup.ts` 或 `SearchBox.tsx`
  - [ ] 參考：`main.ls:483-488`
  - [ ] 功能：
    - 如果有輸入值：顯示清除按鈕，調用 `do-lookup`
    - 否則：隱藏清除按鈕

- [ ] **28. 實現 do-lookup 函數**
  - [ ] 位置：`src/utils/doLookup.ts` 或路由相關
  - [ ] 參考：`main.ls:489-513`
  - [ ] 功能：
    - 提取標題（移除 `[（(].*`）
    - 檢查是否為特殊前綴（`^[=@]`）
    - 檢查 INDEX 中是否存在（除非是 Cordova）
    - 防止重複查詢（`prevVal` 檢查）
    - 加入歷史記錄（`entryHistory`）
    - 顯示/隱藏返回按鈕
    - 調用 `fetch(title)` 載入詞條

- [ ] **29. 實現 width-is-xs 函數**
  - [ ] 位置：`src/utils/width.ts` 或 hooks
  - [ ] 參考：`main.ls:60`
  - [ ] 功能：
    - 檢查 `$('body').width() < 768`
    - 或使用 `window.innerWidth < 768`

---

### 階段九：測試和優化

- [ ] **30. 測試特殊輸入**
  - [ ] `=諺語` 在台語/客語模式
  - [ ] `@` 和 `=` 開頭的輸入
  - [ ] 空字串和空白字元

- [ ] **31. 測試拼音查找**
  - [ ] 英文輸入（`a-zA-Z1-4 '`）
  - [ ] 多音節拼音
  - [ ] 不同拼音系統（漢語拼音、威妥瑪等）

- [ ] **32. 測試 TRS 查找**
  - [ ] 台語模式下的 ASCII 輸入
  - [ ] PUA 字元轉換

- [ ] **33. 測試正則匹配**
  - [ ] 開頭匹配（空白結尾或 `^`）
  - [ ] 結尾匹配（空白開頭或 `$`）
  - [ ] 萬用字元（`*`, `?`, `_`, `%`）
  - [ ] 簡繁轉換

- [ ] **34. 測試交叉引用**
  - [ ] 華語查台語
  - [ ] 台語查華語
  - [ ] 台語變體查找

- [ ] **35. 測試結果處理**
  - [ ] 單一結果自動查詢
  - [ ] 結果數量限制
  - [ ] 無結果提示

- [ ] **36. 測試 UI 互動**
  - [ ] Select 事件
  - [ ] Change 事件
  - [ ] 鍵盤導航
  - [ ] 行動裝置觸控

- [ ] **46. 測試 TRS 查找路由**
  - [ ] `/lookup/trs/{term}` 路由回應正確
  - [ ] 返回格式為管道分隔字串
  - [ ] PUA 字元轉換正確
  - [ ] 大小寫不敏感匹配
  - [ ] 部分匹配功能

- [ ] **47. 測試拼音查找路由**
  - [ ] `/lookup/pinyin/{LANG}/{pinyin_type}/{term}.json` 路由回應正確
  - [ ] 返回格式為 JSON 陣列
  - [ ] 支援所有拼音類型
  - [ ] 結果排序正確（長度 → 位置 → 頻率）
  - [ ] 多音節拼音查找

- [ ] **48. 測試拼音分析函數**
  - [ ] Unicode 正規化正確
  - [ ] 音節提取正確
  - [ ] 特殊字元處理（`ɑ` → `a`）

- [ ] **49. 效能優化**
  - [ ] TRS 查找索引建立（可選）
  - [ ] 拼音查找索引快取機制
  - [ ] 查詢結果快取
  - [ ] 記憶體使用優化

---

## 程式碼位置參考

### 原專案（moedict-webkit）
- `main.ls:730-817` - `init-autocomplete` 函數
- `main.ls:76-93` - `xref-of` 函數
- `main.ls:423-442` - `fill-query` 函數
- `main.ls:483-513` - `lookup` 和 `do-lookup` 函數
- `main.ls:828-831` - `trs_lookup` 函數
- `main.ls:833-855` - `pinyin_lookup` 函數
- `main.ls:859-866` - `b2g` 函數
- `main.ls:819-827` - `PUA2UNI` 映射表
- `build-pinyin-lookup.pl` - 拼音索引建立腳本（完整邏輯）

### 新專案（cf-moedict-webkit）
- `src/hooks/useAutocomplete.ts` - 現有基礎實現
- `src/components/sidebar/SearchBox.tsx` - 搜尋框組件
- 需要新增的工具函數檔案（見上述 TODO）

---

## 注意事項

1. **語言前綴處理**：
   - `'` 或 `!` → 台語 (`t`)
   - `:` → 客語 (`h`)
   - `~` → 兩岸 (`c`)
   - 無前綴 → 華語 (`a`)

2. **INDEX 格式**：
   - 是一個包含 JSON 字串的大字串
   - 格式：`"詞1""詞2""詞3"...`
   - 需要用正則匹配提取詞條

3. **XREF 格式**：
   - 可能是字串或物件
   - 字串格式：`{tgt-lang}:{words}}`
   - 物件格式：`{ [tgt-lang]: { [id]: "word1,word2,..." } }`

4. **行動裝置差異**：
   - 寬度 < 768px 時行為不同
   - 結果數量限制不同（400 vs 1024）
   - UI 互動方式不同

5. **非同步處理**：
   - `trs_lookup` 和 `pinyin_lookup` 是異步的
   - 需要使用 Promise 或 async/await

6. **錯誤處理**：
   - 正則表達式構建可能失敗
   - INDEX 載入可能失敗
   - 需要適當的錯誤處理和降級方案

7. **後端路由實現**：
   - `/lookup/trs/{term}` 返回管道分隔的字串（非 JSON）
   - `/lookup/pinyin/{LANG}/{pinyin_type}/{term}.json` 返回 JSON 陣列
   - 需要考慮效能：可以預先建立索引或動態查詢
   - TRS 查找需要處理 PUA 字元轉換

---

## 完成標準

- [ ] 所有 TODO 項目完成
- [ ] 通過所有測試項目
- [ ] UI 行為與原專案一致
- [ ] 支援所有語言（華語、台語、客語、兩岸）
- [ ] 支援行動裝置和桌面裝置
- [ ] 效能優化（結果限制、去重等）
- [ ] 後端路由正常運作（TRS 和拼音查找）
- [ ] 路由回應格式與原專案一致

