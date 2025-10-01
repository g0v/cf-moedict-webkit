# JSON API 測試

## 測試路由

### 1. 基本字典查詢
- URL: `/萌.json`
- 預期: 返回萌字的完整字典資料

### 2. 語言前綴測試
- URL: `/'萌.json` (台語)
- URL: `/:萌.json` (客語)
- URL: `/~萌.json` (兩岸)

### 3. 模糊搜尋測試
- URL: `/不存在.json`
- 預期: 返回 404 狀態碼和搜尋建議

## 預期輸出格式

```json
{
  "id": "萌",
  "type": "term",
  "title": "萌",
  "english": "to sprout",
  "heteronyms": [
    {
      "audio_id": "0676",
      "bopomofo": "ㄇㄥˊ",
      "definitions": [
        {
          "def": "<a href=\"#草木\">草木<a href=\"#初\">初<a href=\"#生\">生<a href=\"#的\">的<span class=\"punct\"><a href=\"#芽\">芽。",
          "quote": [
            "<span class=\"punct\">《<a href=\"#說文解字\">說文解字．<a href=\"#艸\">艸<span class=\"punct\"><a href=\"#部\">部》：<span class=\"punct\">「<a href=\"#萌\">萌，<a href=\"#艸\">艸<a href=\"#芽\">芽<span class=\"punct\"><a href=\"#也\">也。」"
          ],
          "type": "<a href=\"#名\">名"
        }
      ],
      "pinyin": "méng"
    }
  ],
  "non_radical_stroke_count": 8,
  "radical": "<a href=\"#艸\">艸",
  "stroke_count": 12,
  "translation": {
    "Deutsch": [
      "Leute, Menschen (S)​",
      "Meng (Eig, Fam)​",
      "keimen, sprießen, knospen, ausschlagen "
    ],
    "English": [
      "to sprout",
      "to bud",
      "to have a strong affection for (slang)​",
      "adorable (loanword from Japanese <a href=\"#萌\">萌え moe, slang describing affection for a cute character)​"
    ],
    "francais": [
      "germer",
      "bourgeonner",
      "mignon",
      "adorable"
    ]
  },
  "xrefs": [
    {
      "lang": "t",
      "words": [
        "發穎"
      ]
    },
    {
      "lang": "h",
      "words": [
        "發芽"
      ]
    }
  ]
}
```

## 測試步驟

1. 啟動 CloudFlare Worker 開發環境
2. 測試各種路由
3. 驗證輸出格式
4. 檢查錯誤處理

## 注意事項

- 需要正確的 KV Storage 資料
- 需要 `lenToRegex.json` 和 `xref.json` 檔案
- 需要對應語言的字典資料檔案
