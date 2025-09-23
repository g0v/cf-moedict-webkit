const fs = require('fs');
const path = require('path');

// 讀取 index.json
const indexPath = path.join(__dirname, 'index.json');
const outputPath = path.join(__dirname, 'word_list.json');

console.log('正在讀取 index.json...');
const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

console.log(`總共讀取到 ${data.length} 個項目`);

// 過濾出只有單一字符的項目
const singleWords = data.filter(word => {
  // 檢查是否為單一字符（不包含空格、標點符號等）
  return typeof word === 'string' &&
         word.length === 1 &&
         word.trim() !== '' &&
         // 排除一些特殊符號（可根據需要調整）
         !/[\s\p{P}\p{S}]/u.test(word);
});

console.log(`找到 ${singleWords.length} 個單一字符`);

// 寫入 word_list.json
fs.writeFileSync(outputPath, JSON.stringify(singleWords, null, 2), 'utf8');

console.log(`已成功寫入 ${singleWords.length} 個單一字符到 word_list.json`);
console.log('完成！');
