#!/usr/bin/env node

/**
 * 生成 ASCII 相容碼位（0-255）的可顯示字元以及對應的全形碼位
 */

const fs = require('fs');
const path = require('path');

// 讀取現有的 word_list.json
const wordListPath = path.join(__dirname, '../word_list/word_list.json');
const existingWords = JSON.parse(fs.readFileSync(wordListPath, 'utf8'));

// 生成 ASCII 相容碼位（0-255）的可顯示字元
const asciiChars = [];
const fullwidthChars = [];

// 0-9 數字
for (let i = 0; i <= 9; i++) {
    const asciiChar = String.fromCharCode(48 + i); // '0'-'9'
    const fullwidthChar = String.fromCharCode(0xFF10 + i); // '０'-'９'

    asciiChars.push(asciiChar);
    fullwidthChars.push(fullwidthChar);
}

// A-Z 大寫字母
for (let i = 0; i < 26; i++) {
    const asciiChar = String.fromCharCode(65 + i); // 'A'-'Z'
    const fullwidthChar = String.fromCharCode(0xFF21 + i); // 'Ａ'-'Ｚ'

    asciiChars.push(asciiChar);
    fullwidthChars.push(fullwidthChar);
}

// a-z 小寫字母
for (let i = 0; i < 26; i++) {
    const asciiChar = String.fromCharCode(97 + i); // 'a'-'z'
    const fullwidthChar = String.fromCharCode(0xFF41 + i); // 'ａ'-'ｚ'

    asciiChars.push(asciiChar);
    fullwidthChars.push(fullwidthChar);
}

// 其他可顯示的 ASCII 字元（32-126）
const otherAsciiChars = [
    ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
    ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'
];

const otherFullwidthChars = [
    '　', '！', '"', '＃', '＄', '％', '＆', "'", '（', '）', '＊', '＋', '，', '－', '．', '／',
    '：', '；', '＜', '＝', '＞', '？', '＠', '［', '＼', '］', '＾', '＿', '｀', '｛', '｜', '｝', '～'
];

// 添加其他 ASCII 字元
asciiChars.push(...otherAsciiChars);
fullwidthChars.push(...otherFullwidthChars);

// 合併所有字元
const allNewChars = [...asciiChars, ...fullwidthChars];

// 去重並排序
const uniqueNewChars = [...new Set(allNewChars)].sort();

// 與現有字元合併
const allWords = [...new Set([...existingWords, ...uniqueNewChars])].sort();

// 寫入檔案
fs.writeFileSync(wordListPath, JSON.stringify(allWords, null, 2));

console.log(`已添加 ${uniqueNewChars.length} 個新字元`);
console.log(`總字元數: ${allWords.length}`);
console.log('ASCII 字元範例:', asciiChars.slice(0, 10));
console.log('全形字元範例:', fullwidthChars.slice(0, 10));
