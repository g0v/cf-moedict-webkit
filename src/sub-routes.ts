import { Env, DictionaryLang, ErrorResponse } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { bucketOf, fillBucket } from './dictionary_tools';
import { PUA_TO_IDS_MAP } from './pua-to-ids-mapping';

/**
 * 處理子路由 API 請求
 * 支援 /a/, /t/, /h/, /c/, /raw/, /uni/, /pua/ 等子路由
 */
export async function handleSubRouteAPI(url: URL, env: Env): Promise<Response> {
	console.log('🔍 [SubRouteAPI] 開始處理子路由請求');
	console.log('🔍 [SubRouteAPI] URL:', url.href);
	console.log('🔍 [SubRouteAPI] Pathname:', url.pathname);

	// 解析子路由
	const pathMatch = url.pathname.match(/^\/(a|t|h|c|raw|uni|pua)\/(.+?)\.json$/);
	if (!pathMatch) {
		const errorResponse: ErrorResponse = {
			error: 'Bad Request',
			message: 'Invalid sub-route format'
		};
		return new Response(JSON.stringify(errorResponse), {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});
	}

	const [, routeType, encodedText] = pathMatch;
	const text = decodeURIComponent(encodedText);
	const fixedText = fixMojibake(text);

	console.log('🔍 [SubRouteAPI] 解析結果 - routeType:', routeType, 'text:', text, 'fixedText:', fixedText);

	try {
		switch (routeType) {
			case 'a':
			case 't':
			case 'h':
			case 'c':
				return await handleLanguageRoute(routeType as DictionaryLang, fixedText, env);
			case 'raw':
				return await handleRawRoute(fixedText, env);
			case 'uni':
				return await handleUniRoute(fixedText, env);
			case 'pua':
				return await handlePuaRoute(fixedText, env);
			default:
				const errorResponse: ErrorResponse = {
					error: 'Bad Request',
					message: `Unsupported route type: ${routeType}`
				};
				return new Response(JSON.stringify(errorResponse), {
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						...getCORSHeaders(),
					},
				});
		}
	} catch (error) {
		console.error('🔍 [SubRouteAPI] 處理過程中發生錯誤:', error);
		console.error('🔍 [SubRouteAPI] 錯誤堆疊:', error instanceof Error ? error.stack : 'No stack trace');

		const errorResponse: ErrorResponse = {
			error: 'Internal Server Error',
			message: error instanceof Error ? error.message : 'Failed to process sub-route request'
		};

		return new Response(JSON.stringify(errorResponse), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});
	}
}

/**
 * 處理語言路由 (/a/, /t/, /h/, /c/)
 * 返回壓縮格式的字典資料，類似原專案的格式
 */
async function handleLanguageRoute(lang: DictionaryLang, text: string, env: Env): Promise<Response> {
	console.log('🔍 [LanguageRoute] 處理語言路由，lang:', lang, 'text:', text);

	try {
		// 使用 bucket 機制查詢字典資料
		const bucket = bucketOf(text, lang);
		console.log('🔍 [LanguageRoute] 計算出的 bucket:', bucket);

		const bucketResult = await fillBucket(text, bucket, lang, env);
		console.log('🔍 [LanguageRoute] Bucket 查詢結果:', {
			hasData: !!bucketResult.data,
			hasError: bucketResult.err,
			bsCount: bucketResult.bs?.length || 0
		});

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 返回壓縮格式的原始資料（不經過 decodeLangPart 處理）
		const rawData = bucketResult.data;
		console.log('🔍 [LanguageRoute] 返回壓縮格式資料');
		console.log('🔍 [LanguageRoute] 原始資料:', JSON.stringify(rawData, null, 2));

		return new Response(JSON.stringify(rawData), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [LanguageRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 處理 /raw/ 路由
 * 返回經過 decodeLangPart 處理的格式，類似 target_outputs/raw/ 的格式
 */
async function handleRawRoute(text: string, env: Env): Promise<Response> {
	console.log('🔍 [RawRoute] 處理 raw 路由，text:', text);

	try {
		// 嘗試從華語字典獲取原始資料
		const bucket = bucketOf(text, 'a');
		const bucketResult = await fillBucket(text, bucket, 'a', env);

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 使用 decodeLangPart 處理資料，但移除 HTML 標籤
		const rawData = convertToRawFormat(bucketResult.data);
		console.log('🔍 [RawRoute] 返回 raw 格式資料');

		return new Response(JSON.stringify(rawData, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [RawRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 處理 /uni/ 路由
 * 將原始 JSON 檔，Big5 區之外的字轉成相應的 Unicode 字元表示
 */
async function handleUniRoute(text: string, env: Env): Promise<Response> {
	console.log('🔍 [UniRoute] 處理 uni 路由，text:', text);

	try {
		// 嘗試從華語字典獲取原始資料
		const bucket = bucketOf(text, 'a');
		const bucketResult = await fillBucket(text, bucket, 'a', env);

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 轉換為 uni 格式（Unicode 字元表示）
		const uniData = convertToUniFormat(bucketResult.data);
		console.log('🔍 [UniRoute] 返回 uni 格式資料');

		return new Response(JSON.stringify(uniData, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [UniRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 處理 /pua/ 路由
 * 與 /uni/ 相同，已使用 Unicode 字元，但動態組字改用 @medicalwei 的造字替代
 */
async function handlePuaRoute(text: string, env: Env): Promise<Response> {
	console.log('🔍 [PuaRoute] 處理 pua 路由，text:', text);

	try {
		// 嘗試從華語字典獲取原始資料
		const bucket = bucketOf(text, 'a');
		const bucketResult = await fillBucket(text, bucket, 'a', env);

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 轉換為 pua 格式（PUA 造字替代）
		const puaData = convertToPuaFormat(bucketResult.data);
		console.log('🔍 [PuaRoute] 返回 pua 格式資料');

		return new Response(JSON.stringify(puaData), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [PuaRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 轉換為 raw 格式
 * 將資料轉換為類似 target_outputs/raw/ 的格式
 */
function convertToRawFormat(data: any): any {
	console.log('🔍 [ConvertToRawFormat] 轉換為 raw 格式');
	console.log('🔍 [ConvertToRawFormat] 原始資料:', JSON.stringify(data, null, 2));

	// 先進行資料結構轉換，不處理 HTML 標籤
	const convertedData = convertDictionaryStructure(data);
	console.log('🔍 [ConvertToRawFormat] 資料結構轉換完成');

	// 添加 bopomofo2 欄位到異體字資料
	if (convertedData.heteronyms && Array.isArray(convertedData.heteronyms)) {
		convertedData.heteronyms = addBopomofo2(convertedData.heteronyms);
		console.log('🔍 [ConvertToRawFormat] 添加 bopomofo2 完成');
	}

	// 清理特殊字符和 HTML 標籤
	const cleanedData = cleanRawData(convertedData);
	console.log('🔍 [ConvertToRawFormat] 清理完成');

	// 將 PUA 字符轉換回造字碼格式 {[xxxx]}
	const withRawCharCodes = convertPuaToCharCode(cleanedData);
	console.log('🔍 [ConvertToRawFormat] PUA 轉換完成');

	// 只保留需要的欄位，並調整順序
	const result = {
		heteronyms: withRawCharCodes.heteronyms.map((heteronym: any) => {
			// 移除 audio_id 欄位
			const { audio_id, ...heteronymWithoutAudioId } = heteronym;
			return heteronymWithoutAudioId;
		}),
		title: withRawCharCodes.title
	};

	console.log('🔍 [ConvertToRawFormat] 轉換完成');
	return result;
}

/**
 * 轉換字典資料結構
 * 將縮寫鍵名轉換為完整鍵名，但不處理 HTML 標籤
 */
function convertDictionaryStructure(entry: any): any {
	console.log('🔍 [ConvertDictionaryStructure] 開始轉換資料結構');

	// 鍵值映射
	const keyMap: Record<string, string> = {
		'h': 'heteronyms',
		'b': 'bopomofo',
		'p': 'pinyin',
		'd': 'definitions',
		'c': 'stroke_count',
		'n': 'non_radical_stroke_count',
		'f': 'def',
		't': 'title',
		'r': 'radical',
		'e': 'example',
		'l': 'link',
		's': 'synonyms',
		'a': 'antonyms',
		'q': 'quote',
		'_': 'id',
		'=': 'audio_id',
		'E': 'english',
		'T': 'trs',
		'A': 'alt',
		'V': 'vernacular',
		'C': 'combined',
		'D': 'dialects',
		'S': 'specific_to'
	};

	// 遞歸轉換物件
	function convertObject(obj: any): any {
		if (Array.isArray(obj)) {
			return obj.map(convertObject);
		} else if (obj && typeof obj === 'object') {
			const converted: any = {};
			for (const [key, value] of Object.entries(obj)) {
				const newKey = keyMap[key] || key;
				converted[newKey] = convertObject(value);
			}
			return converted;
		}
		return obj;
	}

	const result = convertObject(entry);
	console.log('🔍 [ConvertDictionaryStructure] 轉換完成');
	return result;
}

/**
 * 清理 raw 格式資料
 * 移除 HTML 標籤和特殊字符
 */
function cleanRawData(data: any): any {
	console.log('🔍 [CleanRawData] 開始清理資料');

	// 遞歸清理物件
	function cleanObject(obj: any): any {
		if (Array.isArray(obj)) {
			return obj.map(cleanObject);
		} else if (obj && typeof obj === 'object') {
			const cleaned: any = {};
			for (const [key, value] of Object.entries(obj)) {
				cleaned[key] = cleanObject(value);
			}
			return cleaned;
		} else if (typeof obj === 'string') {
			// 移除 HTML 標籤
			let cleaned = obj.replace(/<[^>]*>/g, '');
			// 移除特殊字符，但保留造字碼格式 {[xxxx]}
			cleaned = cleaned.replace(/[`~]/g, '');
			// 清理多餘的空格
			cleaned = cleaned.replace(/\s+/g, ' ').trim();
			return cleaned;
		}
		return obj;
	}

	const result = cleanObject(data);
	console.log('🔍 [CleanRawData] 清理完成');
	return result;
}

/**
 * 將 PUA 字符轉換為 IDS（表意文字描述序列）
 */
function convertPuaToIDS(data: any): any {
	console.log('🔍 [ConvertPuaToIDS] 開始轉換 PUA 字符為 IDS');

	function convertObject(obj: any): any {
		if (Array.isArray(obj)) {
			return obj.map(convertObject);
		} else if (obj && typeof obj === 'object') {
			const converted: any = {};
			for (const [key, value] of Object.entries(obj)) {
				converted[key] = convertObject(value);
			}
			return converted;
		} else if (typeof obj === 'string') {
			let result = obj;

			// 使用導入的映射表轉換 PUA 字符
			for (const [pua, ids] of Object.entries(PUA_TO_IDS_MAP)) {
				result = result.replace(new RegExp(pua, 'g'), ids);
			}

			return result;
		}
		return obj;
	}

	const result = convertObject(data);
	console.log('🔍 [ConvertPuaToIDS] 轉換完成');
	return result;
}

/**
 * 將 PUA 字符轉換回造字碼格式 {[xxxx]}
 */
function convertPuaToCharCode(data: any): any {
	console.log('🔍 [ConvertPuaToCharCode] 開始轉換 PUA 字符');

	function convertObject(obj: any): any {
		if (Array.isArray(obj)) {
			return obj.map(convertObject);
		} else if (obj && typeof obj === 'object') {
			const converted: any = {};
			for (const [key, value] of Object.entries(obj)) {
				converted[key] = convertObject(value);
			}
			return converted;
		} else if (typeof obj === 'string') {
			// 將 PUA 字符轉換回造字碼格式
			// PUA 區域在 U+F0000 到 U+FFFFF (私用區 Plane 15-16)
			let result = obj;

			// 使用正則表達式找到所有的高位代理對
			// U+F0000-U+FFFFF 對應的代理對範圍：U+DBA0-U+DBFF, U+DC00-U+DFFF
			result = result.replace(/([\uD800-\uDBFF])([\uDC00-\uDFFF])/g, (match, high, low) => {
				// 計算字符碼點
				const highCode = high.charCodeAt(0);
				const lowCode = low.charCodeAt(0);
				const codePoint = ((highCode - 0xD800) * 0x400) + (lowCode - 0xDC00) + 0x10000;

				// 只處理 PUA 區域 (U+F0000-U+FFFFF)
				if (codePoint >= 0xF0000 && codePoint <= 0xFFFFF) {
					// 轉換為造字碼格式：U+F9AD7 -> {[9ad7]}
					const hex = (codePoint - 0xF0000).toString(16).toLowerCase();
					console.log('🔍 [ConvertPuaToCharCode] 轉換字符:', match, '-> {[' + hex + ']}');
					return `{[${hex}]}`;
				}

				// 不在 PUA 範圍內，保持原樣
				return match;
			});

			return result;
		}
		return obj;
	}

	const result = convertObject(data);
	console.log('🔍 [ConvertPuaToCharCode] 轉換完成');
	return result;
}

/**
 * 解碼語言特定的字典資料
 * 複製原本 moedict-webkit 的 decodeLangPart 函數邏輯
 */
function decodeLangPart(langOrH: string, part: string = ''): string {
	console.log('🔍 [DecodeLangPart] 開始處理，langOrH:', langOrH, 'part 長度:', part.length);

	// 處理特殊字符替換
	while (part.match(/"`辨~\u20DE&nbsp`似~\u20DE"[^}]*},{"f":"([^（]+)[^"]*"/)) {
		part = part.replace(/"`辨~\u20DE&nbsp`似~\u20DE"[^}]*},{"f":"([^（]+)[^"]*"/, '"辨\u20DE 似\u20DE $1"');
		console.log('🔍 [DecodeLangPart] 處理辨似字符替換');
	}

	part = part.replace(/"`(.)~\u20DE"[^}]*},{"f":"([^（]+)[^"]*"/g, '"$1\u20DE $2"');
	console.log('🔍 [DecodeLangPart] 處理特殊字符替換後');

	// 鍵值映射
	const keyMap: Record<string, string> = {
		'h': 'heteronyms',
		'b': 'bopomofo',
		'p': 'pinyin',
		'd': 'definitions',
		'c': 'stroke_count',
		'n': 'non_radical_stroke_count',
		'f': 'def',
		't': 'title',
		'r': 'radical',
		'e': 'example',
		'l': 'link',
		's': 'synonyms',
		'a': 'antonyms',
		'q': 'quote',
		'_': 'id',
		'=': 'audio_id',
		'E': 'english',
		'T': 'trs',
		'A': 'alt',
		'V': 'vernacular',
		'C': 'combined',
		'D': 'dialects',
		'S': 'specific_to'
	};

	// 替換縮寫鍵名
	part = part.replace(/"([hbpdcnftrelsaqETAVCDS_=])":/g, (match, k) => `"${keyMap[k]}":`);
	console.log('🔍 [DecodeLangPart] 替換縮寫鍵名後');

	// 處理語言特定的 hash
	const HASH_OF: Record<string, string> = { a: '#', t: "#'", h: '#:', c: '#~' };
	const H = `./#${HASH_OF[langOrH] || '#'}`;
	console.log('🔍 [DecodeLangPart] 語言 hash:', H);

	// 處理連結和標點符號
	console.log('🔍 [DecodeLangPart] 開始處理連結和標點符號，當前長度:', part.length);

	part = part.replace(/([「【『（《])`([^~]+)~([。，、；：？！─…．·－」』》〉]+)/g, (match, pre, word, post) =>
		`<span class=\\"punct\\">${pre}<a href=\\"${H}${word}\\">${word}</a>${post}</span>`
	);
	console.log('🔍 [DecodeLangPart] 處理第一種連結格式後，長度:', part.length);

	part = part.replace(/([「【『（《])`([^~]+)~/g, (match, pre, word) =>
		`<span class=\\"punct\\">${pre}<a href=\\"${H}${word}\\">${word}</a></span>`
	);
	console.log('🔍 [DecodeLangPart] 處理第二種連結格式後，長度:', part.length);

	part = part.replace(/`([^~]+)~([。，、；：？！─…．·－」』》〉]+)/g, (match, word, post) =>
		`<span class=\\"punct\\"><a href=\\"${H}${word}\\">${word}</a>${post}</span>`
	);
	console.log('🔍 [DecodeLangPart] 處理第三種連結格式後，長度:', part.length);

	part = part.replace(/`([^~]+)~/g, (match, word) =>
		`<a href=\\"${H}${word}\\">${word}</a>`
	);
	console.log('🔍 [DecodeLangPart] 處理第四種連結格式後，長度:', part.length);

	// 處理右括號
	part = part.replace(/([)）])/g, '$1\u200B');
	console.log('🔍 [DecodeLangPart] 處理右括號後，長度:', part.length);

	// 修正雙重 hash 問題
	part = part.replace(/\.\/##/g, './#');
	console.log('🔍 [DecodeLangPart] 修正雙重 hash 後，長度:', part.length);

	console.log('🔍 [DecodeLangPart] 處理完成，最終長度:', part.length);
	console.log('🔍 [DecodeLangPart] 最終結果的前 200 字符:', part.substring(0, 200));
	console.log('🔍 [DecodeLangPart] 最終結果的後 200 字符:', part.substring(part.length - 200));

	return part;
}

/**
 * 清理特殊字符
 * 移除 `~` 和 `` ` `` 字符
 */
function cleanSpecialChars(text: string): string {
	if (typeof text !== 'string') return text;
	return text.replace(/[`~]/g, '');
}

/**
 * 添加 bopomofo2 欄位到異體字資料
 * 根據原本 moedict-webkit 的邏輯
 */
function addBopomofo2(heteronyms: any[]): any[] {
	console.log('🔍 [AddBopomofo2] 開始處理異體字資料，數量:', heteronyms.length);

	// 聲調標記函數：將聲調標記加在韻母的主要母音上
	function applyTone(syllable: string, tone: string): string {
		if (!tone || tone === '˙') return syllable;

		// 聲調對應表
		const toneMap: Record<string, Record<string, string>> = {
			'': { 'a': 'ā', 'o': 'ō', 'e': 'ē', 'i': 'ī', 'u': 'ū', 'ü': 'ǖ' },  // 第一聲
			'ˊ': { 'a': 'á', 'o': 'ó', 'e': 'é', 'i': 'í', 'u': 'ú', 'ü': 'ǘ' },  // 第二聲
			'ˇ': { 'a': 'ǎ', 'o': 'ǒ', 'e': 'ě', 'i': 'ǐ', 'u': 'ǔ', 'ü': 'ǚ' },  // 第三聲
			'ˋ': { 'a': 'à', 'o': 'ò', 'e': 'è', 'i': 'ì', 'u': 'ù', 'ü': 'ǜ' }   // 第四聲
		};

		// 找到主要母音的位置並加上聲調
		// 規則：a, o, e 優先；如果有 iu 或 ui，標在後面的母音上
		if (syllable.includes('a')) {
			return syllable.replace('a', toneMap[tone]['a']);
		} else if (syllable.includes('o')) {
			return syllable.replace('o', toneMap[tone]['o']);
		} else if (syllable.includes('e')) {
			return syllable.replace('e', toneMap[tone]['e']);
		} else if (syllable.includes('iu')) {
			return syllable.replace('u', toneMap[tone]['u']);
		} else if (syllable.includes('ui')) {
			return syllable.replace('i', toneMap[tone]['i']);
		} else if (syllable.includes('u')) {
			return syllable.replace('u', toneMap[tone]['u']);
		} else if (syllable.includes('i')) {
			return syllable.replace('i', toneMap[tone]['i']);
		} else if (syllable.includes('ü')) {
			return syllable.replace('ü', toneMap[tone]['ü']);
		}

		return syllable;
	}

	return heteronyms.map(heteronym => {
		if (heteronym.bopomofo) {
			// 將注音符號轉換為通用拼音格式
			// 每個音節分開處理
			const syllables = heteronym.bopomofo.split(/\s+/);
			const converted = syllables.map((syl: string) => {
				if (!syl) return '';

				// 提取聲調
				let tone = '';  // 預設第一聲（無標記）
				if (syl.includes('ˊ')) tone = 'ˊ';
				else if (syl.includes('ˇ')) tone = 'ˇ';
				else if (syl.includes('ˋ')) tone = 'ˋ';
				else if (syl.includes('˙')) tone = '˙';

				// 移除聲調符號
				let base = syl.replace(/[ˊˇˋ˙]/g, '');

				// 聲母轉換
				base = base
					.replace(/ㄅ/g, 'b').replace(/ㄆ/g, 'p').replace(/ㄇ/g, 'm').replace(/ㄈ/g, 'f')
					.replace(/ㄉ/g, 'd').replace(/ㄊ/g, 't').replace(/ㄋ/g, 'n').replace(/ㄌ/g, 'l')
					.replace(/ㄍ/g, 'g').replace(/ㄎ/g, 'k').replace(/ㄏ/g, 'h')
					.replace(/ㄐ/g, 'j').replace(/ㄑ/g, 'q').replace(/ㄒ/g, 'sh')
					.replace(/ㄓ/g, 'zh').replace(/ㄔ/g, 'ch').replace(/ㄕ/g, 'sh').replace(/ㄖ/g, 'r')
					.replace(/ㄗ/g, 'z').replace(/ㄘ/g, 'c').replace(/ㄙ/g, 's');

				// 韻母轉換
				base = base
					.replace(/ㄧㄡ/g, 'iou').replace(/ㄧㄠ/g, 'iao')
					.replace(/ㄧㄢ/g, 'ian').replace(/ㄧㄣ/g, 'in')
					.replace(/ㄧㄤ/g, 'iang').replace(/ㄧㄥ/g, 'ing')
					.replace(/ㄨㄚ/g, 'ua').replace(/ㄨㄛ/g, 'uo').replace(/ㄨㄞ/g, 'uai')
					.replace(/ㄨㄟ/g, 'uei').replace(/ㄨㄢ/g, 'uan').replace(/ㄨㄣ/g, 'un')
					.replace(/ㄨㄤ/g, 'uang').replace(/ㄨㄥ/g, 'ong')
					.replace(/ㄩㄝ/g, 'üe').replace(/ㄩㄢ/g, 'üan').replace(/ㄩㄣ/g, 'ün')
					.replace(/ㄚ/g, 'a').replace(/ㄛ/g, 'o').replace(/ㄜ/g, 'e').replace(/ㄝ/g, 'e')
					.replace(/ㄞ/g, 'ai').replace(/ㄟ/g, 'ei').replace(/ㄠ/g, 'ao').replace(/ㄡ/g, 'ou')
					.replace(/ㄢ/g, 'an').replace(/ㄣ/g, 'en').replace(/ㄤ/g, 'ang').replace(/ㄥ/g, 'eng')
					.replace(/ㄦ/g, 'er')
					.replace(/ㄧ/g, 'i').replace(/ㄨ/g, 'u').replace(/ㄩ/g, 'ü');

				// 處理特殊組合
				// ao -> au (在某些情況下)
				if (base.endsWith('ao')) {
					base = base.replace(/ao$/, 'au');
				}
				// iou -> iōu (在 sh- 開頭時)
				if (base.startsWith('shiou')) {
					base = base.replace('iou', 'iōu');
				}

				// 應用聲調
				return applyTone(base, tone);
			});

			const bopomofo2 = converted.join(' ');
			console.log('🔍 [AddBopomofo2] 轉換:', heteronym.bopomofo, '->', bopomofo2);

			// 確保正確的 key 順序
			return {
				bopomofo: heteronym.bopomofo,
				bopomofo2: bopomofo2,
				definitions: heteronym.definitions,
				pinyin: heteronym.pinyin
			};
		}
		return heteronym;
	});
}

/**
 * 轉換為 uni 格式
 * 將造字碼轉換為 Unicode 字元，使用與 raw 相同的處理邏輯
 */
function convertToUniFormat(data: any): any {
	console.log('🔍 [ConvertToUniFormat] 轉換為 uni 格式');
	console.log('🔍 [ConvertToUniFormat] 原始資料:', JSON.stringify(data, null, 2));

	// 先進行資料結構轉換，不處理 HTML 標籤
	const convertedData = convertDictionaryStructure(data);
	console.log('🔍 [ConvertToUniFormat] 資料結構轉換完成');

	// 添加 bopomofo2 欄位到異體字資料
	if (convertedData.heteronyms && Array.isArray(convertedData.heteronyms)) {
		convertedData.heteronyms = addBopomofo2(convertedData.heteronyms);
		console.log('🔍 [ConvertToUniFormat] 添加 bopomofo2 完成');
	}

	// 清理特殊字符和 HTML 標籤
	const cleanedData = cleanRawData(convertedData);
	console.log('🔍 [ConvertToUniFormat] 清理完成');

	// 將 PUA 字符轉換為 IDS（表意文字描述序列）
	const withIDS = convertPuaToIDS(cleanedData);
	console.log('🔍 [ConvertToUniFormat] PUA 轉 IDS 完成');

	// 只保留需要的欄位，並調整順序
	const finalResult = {
		heteronyms: withIDS.heteronyms.map((heteronym: any) => {
			// 移除 audio_id 欄位
			const { audio_id, ...heteronymWithoutAudioId } = heteronym;
			return heteronymWithoutAudioId;
		}),
		title: withIDS.title
	};

	console.log('🔍 [ConvertToUniFormat] 轉換完成');
	return finalResult;
}

/**
 * 轉換為 pua 格式
 * 使用 PUA 造字替代，使用與 raw 相同的處理邏輯
 */
function convertToPuaFormat(data: any): any {
	console.log('🔍 [ConvertToPuaFormat] 轉換為 pua 格式');
	console.log('🔍 [ConvertToPuaFormat] 原始資料:', JSON.stringify(data, null, 2));

	// 先進行資料結構轉換，不處理 HTML 標籤
	const convertedData = convertDictionaryStructure(data);
	console.log('🔍 [ConvertToPuaFormat] 資料結構轉換完成');

	// 添加 bopomofo2 欄位到異體字資料
	if (convertedData.heteronyms && Array.isArray(convertedData.heteronyms)) {
		convertedData.heteronyms = addBopomofo2(convertedData.heteronyms);
		console.log('🔍 [ConvertToPuaFormat] 添加 bopomofo2 完成');
	}

	// 清理特殊字符和 HTML 標籤
	const cleanedData = cleanRawData(convertedData);
	console.log('🔍 [ConvertToPuaFormat] 清理完成');

	// 處理 PUA 造字轉換
	const jsonString = JSON.stringify(cleanedData);
	let processedString = jsonString;

	// 將造字碼轉換為 PUA 字元
	// 根據原專案文檔，PUA 使用 U+F9AD7 等格式
	processedString = processedString.replace(/\{\[9264\]\}/g, '\uF9264');
	processedString = processedString.replace(/\{\[9064\]\}/g, '\uF9064');

	// 處理其他可能的造字碼轉換
	// 這裡可以根據需要添加更多的轉換規則

	try {
		const result = JSON.parse(processedString);

		// 只保留需要的欄位，並調整順序
		const finalResult = {
			heteronyms: result.heteronyms.map((heteronym: any) => {
				// 移除 audio_id 欄位
				const { audio_id, ...heteronymWithoutAudioId } = heteronym;
				return heteronymWithoutAudioId;
			}),
			title: result.title
		};

		console.log('🔍 [ConvertToPuaFormat] 轉換完成');
		return finalResult;

	} catch (error) {
		console.error('🔍 [ConvertToPuaFormat] JSON 解析失敗，返回原始資料');
		return data;
	}
}
