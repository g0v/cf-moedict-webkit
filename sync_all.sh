#!/bin/bash

	folders=(
		"./large_fonts/cwTeXQMing"
		"./large_fonts/cwTeXQHei"
		"./large_fonts/cwTeXQKai"
		"./large_fonts/cwTeXQYuan"
		"./large_fonts/cwTeXQFangsong"


		# "./large_fonts/HanWangShinSuMedium"
		# "./large_HanWangFangSongMedium"
		# "./large_fonts/HanWangLiSuMedium"
		# "./large_fonts/HanWangMingLight"
		# "./large_fonts/HanWangMingMedium"
		# "./large_fonts/HanWangMingBold"
		# "./large_fonts/HanWangMingBlack"
		# "./large_fonts/HanWangMingHeavy"
		# "./large_fonts/HanWangYenLight"
		# "./large_fonts/HanWangYenHeavy"
		# "./large_fonts/HanWangHeiLight"
		# "./large_fonts/HanWangHeiHeavy"
		# "./large_fonts/HanWangYanKai"
		# "./large_fonts/HanWangKanDaYan"
		# "./large_fonts/HanWangKanTan"
		# "./large_fonts/HanWangZonYi"
		# "./large_fonts/HanWangCC02"
		# "./large_fonts/HanWangCC15"
		# "./large_fonts/HanWangGB06"
	)

for f in "${folders[@]}"; do
  echo "同步中: $f"
  rclone sync "$f" "r2:moedict-fonts/$(basename "$f")" \
    --progress \
    --transfers 32 \
    --checkers 64 \
    --buffer-size 1M \
    --fast-list \
    --retries 3 --low-level-retries 10 --retries-sleep 2s
done
