import { Env } from './types';

export function bucketOf(it: string, url: string): string {
	console.log('🔍 [BucketOf] 輸入參數 - it:', it, 'url:', url);

	var code
	if (/^[=@]/.exec(it)) {
		console.log('🔍 [BucketOf] 特殊前綴匹配，返回:', it[0]);
		return it[0]
	}
	code = it.charCodeAt(0)
	console.log('🔍 [BucketOf] 第一個字符的 Unicode 碼:', code);

	if (code >= 0xD800 && code <= 0xDBFF) {
		code = it.charCodeAt(1) - 0xDC00
		console.log('🔍 [BucketOf] 處理代理對，調整後的碼:', code);
	}

	const bucketSize = url === 'a' ? 1024 : 128;
	const bucket = (code % bucketSize).toString();
	console.log('🔍 [BucketOf] 計算結果 - bucketSize:', bucketSize, 'bucket:', bucket);

	return bucket;
}

export async function fillBucket(id: string, bucket: string, url: string, env: Env): Promise<{ data: any; bs: string[]; err: boolean }> {
	console.log('🔍 [FillBucket] 開始處理 - id:', id, 'bucket:', bucket, 'url:', url);

	try {
		// 從 R2 DICTIONARY binding 獲取資料
		const bucketPath = `p${url}ck/${bucket}.txt`;
		console.log('🔍 [FillBucket] 嘗試從 R2 獲取資料，路徑:', bucketPath);

		const bucketObject = await env.DICTIONARY.get(bucketPath);

		if (!bucketObject) {
			console.log('🔍 [FillBucket] R2 中找不到 bucket 檔案');
			return { data: null, bs: [], err: true };
		}

		console.log('🔍 [FillBucket] 成功獲取 bucket 檔案');
		const bucketData = await bucketObject.text();
		console.log('🔍 [FillBucket] Bucket 資料長度:', bucketData.length);

		const responseData = JSON.parse(bucketData);
		console.log('🔍 [FillBucket] JSON 解析成功，資料鍵數量:', Object.keys(responseData).length);

		// 處理資料邏輯
		var key = escape(id);
		console.log('🔍 [FillBucket] 查詢鍵:', key);
		var part = responseData[key];

		if (!part) {
			console.log('🔍 [FillBucket] 在 bucket 中找不到對應的資料');
			return { data: null, bs: [], err: true };
		}

		console.log('🔍 [FillBucket] 找到資料，開始處理異體字');
		// 處理異體字資料
		let bs: string[] = [];
		if (part.h && Array.isArray(part.h)) {
			bs = part.h.map((o: any) => { return o.b || '' });
			console.log('🔍 [FillBucket] 異體字數量:', bs.length);
		}

		console.log('🔍 [FillBucket] 處理完成，返回資料');
		return {
			data: part,
			bs: bs,
			err: false
		};

	} catch (err) {
		console.error('🔍 [FillBucket] 處理過程中發生錯誤:', err);
		return { data: null, bs: [], err: true };
	}
}
