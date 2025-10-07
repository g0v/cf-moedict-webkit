import { Env } from './types';

export function bucketOf(it: string, url: string): string {
	console.log(it)
	var code
	if (/^[=@]/.exec(it)) {
		return it[0]
	}
	code = it.charCodeAt(0)
	if (code >= 0xD800 && code <= 0xDBFF) {
		code = it.charCodeAt(1) - 0xDC00
	}
	return (code % (url === 'a' ? 1024 : 128)).toString()
}

export async function fillBucket(id: string, bucket: string, url: string, env: Env): Promise<{ data: any; bs: string[]; err: boolean }> {
	try {
		// 從 R2 DICTIONARY binding 獲取資料
		const bucketObject = await env.DICTIONARY.get(`p${url}ck/${bucket}.txt`);

		if (!bucketObject) {
			return { data: null, bs: [], err: true };
		}

		const bucketData = await bucketObject.text();
		const responseData = JSON.parse(bucketData);

		// 處理資料邏輯
		var key = escape(id);
		var part = responseData[key];

		if (!part) {
			return { data: null, bs: [], err: true };
		}

		// 處理異體字資料
		let bs: string[] = [];
		if (part.h && Array.isArray(part.h)) {
			bs = part.h.map((o: any) => { return o.b || '' });
		}

		return {
			data: part,
			bs: bs,
			err: false
		};

	} catch (err) {
		console.log(err);
		return { data: null, bs: [], err: true };
	}
}
