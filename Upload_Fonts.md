# 上傳字體資料夾連同所有其中的SVG的指令(以HanWangLiSuMedium為例)

正確的指令應該是這樣：

---

## **Dry-run 測試（模擬，不實際上傳）**

```bash
rclone copy ./large_fonts/HanWangLiSuMedium r2:moedict-fonts-preview/HanWangLiSuMedium \
  --dry-run --progress --transfers 32 --checkers 64 --buffer-size 1M --no-traverse --fast-list
```

```bash
rclone copy ./large_fonts/HanWangLiSuMedium r2:moedict-fonts/HanWangLiSuMedium \
  --dry-run --progress --transfers 32 --checkers 64 --buffer-size 1M --no-traverse --fast-list
```

### **參數說明**

* `./large_fonts/HanWangLiSuMedium` → 本地來源資料夾
* `r2:moedict-fonts-preview/HanWangLiSuMedium` → R2 目標路徑
* `--dry-run` → 只模擬動作，不真正上傳，用來檢查檔案列表
* `--progress` → 顯示即時模擬進度

---

## **確認路徑無誤後，實際上傳**

當 dry-run 顯示正確後，移除 `--dry-run` 正式執行：

```bash
rclone copy ./large_fonts/HanWangLiSuMedium r2:moedict-fonts-preview/HanWangLiSuMedium \
  --progress \
  --transfers 32 \
  --checkers 64 \
  --buffer-size 1M \
  --no-traverse \
  --fast-list \
  --retries 3 --low-level-retries 10 --retries-sleep 2s
```

(note: 若無法rclone copy, 可改用rclone sync替代)

```bash
rclone copy ./large_fonts/HanWangLiSuMedium r2:moedict-fonts/HanWangLiSuMedium \
  --progress \
  --transfers 32 \
  --checkers 64 \
  --buffer-size 1M \
  --no-traverse \
  --fast-list \
  --retries 3 --low-level-retries 10 --retries-sleep 2s
```
(note: 若無法rclone copy, 可改用rclone sync替代)


> **小提醒**
>
> * `--s3-upload-concurrency 8`：同時開 8 條上傳管道，適合大檔案。
> * `--s3-chunk-size 64M`：每個分段大小 64MB，加快速度但需要更多記憶體。

---

## **上傳後確認**

上傳完成後，檢查遠端是否有檔案：

```bash
rclone ls r2:moedict-fonts-preview/HanWangLiSuMedium | head -20
```


```bash
rclone ls r2:moedict-fonts/HanWangLiSuMedium | head -20
```

或只看檔案結構：

```bash
rclone lsf r2:moedict-fonts-preview/HanWangLiSuMedium
```


```bash
rclone lsf r2:moedict-fonts/HanWangLiSuMedium
```

如果看到正確的檔案列表，就表示成功複製！


---

## **確認後刪除本地檔案**

```bash
# 刪除 large_fonts/HanWangLiSuMedium 目錄連同其中所有檔案
rm -rf ./large_fonts/HanWangLiSuMedium

# 或者使用更安全的方式，先確認目錄存在再刪除
if [ -d "./large_fonts/HanWangLiSuMedium" ]; then
    rm -rf ./large_fonts/HanWangLiSuMedium
    echo "已刪除 HanWangLiSuMedium 目錄"
else
    echo "HanWangLiSuMedium 目錄不存在"
fi
```
