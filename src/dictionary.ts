import { Env, DictionaryLang, DictionaryAPIResponse, ErrorResponse, DictionaryEntry, XRefData } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { bucketOf, fillBucket } from './dictionary_tools';

/**
 * 處理字典查詢 API 請求
 * 對應原本的 @get '/:text.json' 路由
 */
export async function handleDictionaryAPI(url: URL, env: Env): Promise<Response> {
	// 過濾瀏覽器自動請求（Chrome DevTools 等）
	if (url.pathname.includes('com.chrome.devtools') ||
	    url.pathname.includes('.well-known')) {
		return new Response('Not Found', { status: 404 });
	}

	console.log('🔍 [DictionaryAPI] 開始處理字典查詢請求');
	console.log('🔍 [DictionaryAPI] Pathname:', url.pathname);

	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);

	try {
		// 檢查是否為部首查詢（@開頭）
		if (fixedText.startsWith('@')) {
			console.log('🔍 [DictionaryAPI] 部首查詢:', fixedText);
			return await handleRadicalLookup(fixedText, lang, env);
		}

		// 檢查是否為列表查詢（=開頭）
		if (fixedText.startsWith('=')) {
			console.log('🔍 [DictionaryAPI] 列表查詢:', fixedText);
			return await handleListLookup(fixedText, lang, env);
		}

		// 使用統一的查詢函數
		const processedEntry = await lookupDictionaryEntry(fixedText, lang, env);

		if (!processedEntry) {
			console.log('🔍 [DictionaryAPI] 查詢失敗，開始模糊搜尋');
			// 如果找不到確切匹配，嘗試模糊搜尋
			const searchResult = await performFuzzySearch(fixedText, lang, env);
			console.log('🔍 [DictionaryAPI] 模糊搜尋結果:', searchResult);

			if (searchResult.length === 0) {
				console.log('🔍 [DictionaryAPI] 模糊搜尋也無結果，返回 404');
				const errorResponse: ErrorResponse = {
					error: 'Not Found',
					message: `找不到詞彙: ${fixedText}`,
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

			console.log('🔍 [DictionaryAPI] 返回模糊搜尋結果');
			// 返回搜尋結果
			return new Response(JSON.stringify({ terms: searchResult }), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		console.log('🔍 [DictionaryAPI] 成功返回字典資料');
		return new Response(JSON.stringify(processedEntry, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [DictionaryAPI] 處理過程中發生錯誤:', error);
		console.error('🔍 [DictionaryAPI] 錯誤堆疊:', error instanceof Error ? error.stack : 'No stack trace');

		const errorResponse: ErrorResponse = {
			error: 'Internal Server Error',
			message: error instanceof Error ? error.message : 'Failed to process dictionary request'
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
 * 處理部首查詢
 * @開頭的查詢會直接從 R2 讀取部首資料
 */
async function handleRadicalLookup(text: string, lang: DictionaryLang, env: Env): Promise<Response> {
	console.log('🔍 [HandleRadicalLookup] 開始處理部首查詢:', text, 'lang:', lang);

	try {
		// 部首檔案路徑：lang/@字.json
		const radicalPath = `${lang}/${text}.json`;
		console.log('🔍 [HandleRadicalLookup] 嘗試讀取部首檔案:', radicalPath);

		const radicalObject = await env.DICTIONARY.get(radicalPath);

		if (!radicalObject) {
			console.log('🔍 [HandleRadicalLookup] 找不到部首檔案');
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到部首: ${text}`,
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

		console.log('🔍 [HandleRadicalLookup] 成功讀取部首檔案');
		const radicalData = await radicalObject.text();

		// 直接返回部首資料，格式化輸出
		console.log('🔍 [HandleRadicalLookup] 返回部首資料');
		return new Response(JSON.stringify(JSON.parse(radicalData), null, 2), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [HandleRadicalLookup] 處理過程中發生錯誤:', error);
		const errorResponse: ErrorResponse = {
			error: 'Internal Server Error',
			message: error instanceof Error ? error.message : 'Failed to process radical lookup'
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
 * 處理列表查詢
 * =開頭的查詢會直接從 R2 讀取列表資料（一維數組）
 */
async function handleListLookup(text: string, lang: DictionaryLang, env: Env): Promise<Response> {
	console.log('🔍 [HandleListLookup] 開始處理列表查詢:', text, 'lang:', lang);

	try {
		// 列表檔案路徑：lang/=名稱.json
		const listPath = `${lang}/${text}.json`;
		console.log('🔍 [HandleListLookup] 嘗試讀取列表檔案:', listPath);

		const listObject = await env.DICTIONARY.get(listPath);

		if (!listObject) {
			console.log('🔍 [HandleListLookup] 找不到列表檔案');
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到列表: ${text}`,
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

		console.log('🔍 [HandleListLookup] 成功讀取列表檔案');
		const listData = await listObject.text();

		// 直接返回列表資料，格式化輸出
		console.log('🔍 [HandleListLookup] 返回列表資料');
		return new Response(JSON.stringify(JSON.parse(listData), null, 2), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [HandleListLookup] 處理過程中發生錯誤:', error);
		const errorResponse: ErrorResponse = {
			error: 'Internal Server Error',
			message: error instanceof Error ? error.message : 'Failed to process list lookup'
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
 * 查詢字典條目（核心邏輯）
 * 供內部和頁面渲染使用
 */
export async function lookupDictionaryEntry(text: string, lang: DictionaryLang, env: Env): Promise<DictionaryAPIResponse | null> {
	console.log('🔍 [LookupDictionaryEntry] 開始查詢，text:', text, 'lang:', lang);

	try {
		// 檢查是否為部首或列表查詢
		if (text.startsWith('@') || text.startsWith('=')) {
			console.log('🔍 [LookupDictionaryEntry] 特殊查詢類型，不處理');
			return null;
		}

		// 使用 bucket 機制查詢字典資料
		const bucket = bucketOf(text, lang);
		console.log('🔍 [LookupDictionaryEntry] 計算出的 bucket:', bucket);

		const bucketResult = await fillBucket(text, bucket, lang, env);
		console.log('🔍 [LookupDictionaryEntry] Bucket 查詢結果:', {
			hasData: !!bucketResult.data,
			hasError: bucketResult.err
		});

		if (bucketResult.err || !bucketResult.data) {
			console.log('🔍 [LookupDictionaryEntry] Bucket 查詢失敗，返回 null');
			return null;
		}

		// 使用從 bucket 獲取的資料
		const entry: DictionaryEntry = bucketResult.data;
		console.log('🔍 [LookupDictionaryEntry] 開始處理字典條目資料');

		// 處理字典資料
		const processedEntry = await processDictionaryEntry(entry, lang, env);
		console.log('🔍 [LookupDictionaryEntry] 字典條目處理完成');

		// 添加跨語言對照
		const xrefs = await getCrossReferences(text, lang, env);
		processedEntry.xrefs = xrefs;

		console.log('🔍 [LookupDictionaryEntry] 成功返回處理後的資料');
		return processedEntry;

	} catch (error) {
		console.error('🔍 [LookupDictionaryEntry] 處理過程中發生錯誤:', error);
		return null;
	}
}

/**
 * 處理字典條目資料
 */
async function processDictionaryEntry(entry: DictionaryEntry, lang: DictionaryLang, env: Env): Promise<DictionaryAPIResponse> {
	console.log('🔍 [ProcessDictionaryEntry] 開始處理字典條目，lang:', lang);

	// 使用 decodeLangPart 處理字典資料
	let processedEntry = decodeLangPart(lang, JSON.stringify(entry));

	// 添加 JSON 解析前的檢查
	try {
		// 檢查 JSON 語法
		const testParse = JSON.parse(processedEntry);
		console.log('🔍 [ProcessDictionaryEntry] JSON 解析成功');
	} catch (jsonError) {
		console.error('🔍 [ProcessDictionaryEntry] JSON 解析失敗:', jsonError);
		console.error('🔍 [ProcessDictionaryEntry] 問題 JSON 片段:', processedEntry.substring(170, 190));
		// 嘗試修復常見的 JSON 問題
		let fixedEntry = processedEntry;
		// 修復可能的引號問題
		fixedEntry = fixedEntry.replace(/\\"/g, '"');
		// 修復可能的未轉義引號
		fixedEntry = fixedEntry.replace(/([^\\])"/g, '$1\\"');
		console.log('🔍 [ProcessDictionaryEntry] 嘗試修復後的 JSON');
		try {
			const testParse2 = JSON.parse(fixedEntry);
			console.log('🔍 [ProcessDictionaryEntry] 修復後 JSON 解析成功');
			processedEntry = fixedEntry;
		} catch (jsonError2) {
			console.error('🔍 [ProcessDictionaryEntry] 修復後仍然失敗:', jsonError2);
			throw jsonError;
		}
	}

	const parsedEntry = JSON.parse(processedEntry);

	// 只包含實際存在的欄位
	const result: any = {};

	if (parsedEntry.Deutsch) result.Deutsch = parsedEntry.Deutsch;
	if (parsedEntry.English || parsedEntry.english) result.English = parsedEntry.English || parsedEntry.english;
	if (parsedEntry.francais) result.francais = parsedEntry.francais;
	if (parsedEntry.heteronyms) result.heteronyms = parsedEntry.heteronyms;
	if (parsedEntry.radical) result.radical = parsedEntry.radical;
	if (parsedEntry.stroke_count) result.stroke_count = parsedEntry.stroke_count;
	if (parsedEntry.non_radical_stroke_count) result.non_radical_stroke_count = parsedEntry.non_radical_stroke_count;
	if (parsedEntry.title) result.title = parsedEntry.title;
	if (parsedEntry.translation) result.translation = parsedEntry.translation;

	return result;
}

/**
 * 解碼語言特定的字典資料
 * 複製原本 moedict-webkit 的 decodeLangPart 函數邏輯
 */
function decodeLangPart(langOrH: DictionaryLang | string, part: string = ''): string {
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

	// 處理語言特定的 hash - 修正為正確的格式
	const HASH_OF: Record<string, string> = { a: '#', t: "#'", h: '#:', c: '#~' };
	const H = `./#${HASH_OF[langOrH] || '#'}`;
	console.log('🔍 [DecodeLangPart] 語言 hash:', H);

	// 處理連結和標點符號 - 修正引號轉義問題
	part = part.replace(/([「【『（《])`([^~]+)~([。，、；：？！─…．·－」』》〉]+)/g, (match, pre, word, post) =>
		`<span class=\\"punct\\">${pre}<a href=\\"${H}${word}\\">${word}</a>${post}</span>`
	);

	part = part.replace(/([「【『（《])`([^~]+)~/g, (match, pre, word) =>
		`<span class=\\"punct\\">${pre}<a href=\\"${H}${word}\\">${word}</a></span>`
	);

	part = part.replace(/`([^~]+)~([。，、；：？！─…．·－」』》〉]+)/g, (match, word, post) =>
		`<span class=\\"punct\\"><a href=\\"${H}${word}\\">${word}</a>${post}</span>`
	);

	part = part.replace(/`([^~]+)~/g, (match, word) =>
		`<a href=\\"${H}${word}\\">${word}</a>`
	);

	// 處理右括號
	part = part.replace(/([)）])/g, '$1\u200B');

	// 修正雙重 hash 問題 - 在最後修正
	part = part.replace(/\.\/##/g, './#');

	console.log('🔍 [DecodeLangPart] 處理完成，最終長度:', part.length);

	return part;
}

/**
 * 獲取跨語言對照資料
 * 複製原本 moedict-webkit 的 xref-of 函數邏輯
 */
async function getCrossReferences(text: string, lang: DictionaryLang, env: Env): Promise<Array<{ lang: DictionaryLang; words: string[] }>> {
	console.log('🔍 [GetCrossReferences] 開始獲取跨語言對照，text:', text, 'lang:', lang);

	try {
		const xrefPath = `${lang}/xref.json`;
		console.log('🔍 [GetCrossReferences] 嘗試獲取 xref 檔案:', xrefPath);

		const xrefObject = await env.DICTIONARY.get(xrefPath);

		if (!xrefObject) {
			console.log('🔍 [GetCrossReferences] 找不到 xref 檔案');
			return [];
		}

		console.log('🔍 [GetCrossReferences] 成功獲取 xref 檔案');
		const xrefData = await xrefObject.text();
		const xref: XRefData = JSON.parse(xrefData);
		console.log('🔍 [GetCrossReferences] xref 資料解析完成，語言數量:', Object.keys(xref).length);

		const result: Array<{ lang: DictionaryLang; words: string[] }> = [];

		// 檢查是否有跨語言對照
		for (const [targetLang, words] of Object.entries(xref)) {
			if (words[text]) {
				// 處理逗號分隔的詞彙列表
				const wordData = words[text];
				let wordList: string[] = [];

				if (typeof wordData === 'string') {
					wordList = wordData.split(',').map((w: string) => w.trim()).filter((w: string) => w.length > 0);
				} else if (Array.isArray(wordData)) {
					wordList = wordData;
				}

				if (wordList.length > 0) {
					result.push({
						lang: targetLang as DictionaryLang,
						words: wordList
					});
				}
			}
		}

		console.log('🔍 [GetCrossReferences] 最終結果數量:', result.length);
		return result;

	} catch (error) {
		console.error('🔍 [GetCrossReferences] 處理過程中發生錯誤:', error);
		return [];
	}
}

/**
 * 執行模糊搜尋
 * 由於原專案沒有 lenToRegex.json，改為簡單的字符分割搜尋
 */
async function performFuzzySearch(text: string, lang: DictionaryLang, env: Env): Promise<string[]> {
	console.log('🔍 [PerformFuzzySearch] 開始模糊搜尋，text:', text, 'lang:', lang);

	try {
		// 簡單的字符分割搜尋
		// 將輸入文字分割成單個字符，作為搜尋候選
		const terms: string[] = [];

		// 清理文字，移除特殊字符
		const cleanText = text.replace(/[`~]/g, '');
		console.log('🔍 [PerformFuzzySearch] 清理後文字:', cleanText);

		// 將每個字符作為搜尋候選
		for (let i = 0; i < cleanText.length; i++) {
			const char = cleanText[i];
			if (char && char.trim()) {
				terms.push(char);
			}
		}

		// 如果沒有找到任何字符，返回原始文字
		if (terms.length === 0) {
			terms.push(cleanText);
		}

		console.log('🔍 [PerformFuzzySearch] 搜尋候選詞:', terms);
		return terms;

	} catch (error) {
		console.error('🔍 [PerformFuzzySearch] 處理過程中發生錯誤:', error);
		return [];
	}
}

/**
 * 獲取字典定義
 * 對應原本的 def-of 函數
 */
export async function getDefinition(lang: DictionaryLang, title: string, env: Env): Promise<string> {
	console.log('🔍 [GetDefinition] 開始獲取定義，lang:', lang, 'title:', title);

	try {
		// 先嘗試單字格式 (@字.json)
		const singleCharPath = `${lang}/@${title}.json`;
		console.log('🔍 [GetDefinition] 嘗試單字格式:', singleCharPath);
		let dataObject = await env.DICTIONARY.get(singleCharPath);

		// 如果找不到單字，嘗試複合詞格式 (=詞.json)
		if (!dataObject) {
			const compoundPath = `${lang}/=${title}.json`;
			console.log('🔍 [GetDefinition] 嘗試複合詞格式:', compoundPath);
			dataObject = await env.DICTIONARY.get(compoundPath);
		}

		if (!dataObject) {
			console.log('🔍 [GetDefinition] 找不到對應的字典檔案');
			return '';
		}

		console.log('🔍 [GetDefinition] 成功獲取字典檔案');
		const data = await dataObject.text();
		const payload = JSON.parse(data);
		let def = '';

		// 處理定義資料
		if (payload.h && Array.isArray(payload.h)) {
			console.log('🔍 [GetDefinition] 處理異體字資料，數量:', payload.h.length);
			for (const h of payload.h) {
				if (h.d && Array.isArray(h.d)) {
					for (const d of h.d) {
						def += (d.f || d.l || '');
					}
				}
			}
		}

		// 清理定義文字
		const cleanedDef = def.replace(/[`~]/g, '');
		console.log('🔍 [GetDefinition] 最終定義長度:', cleanedDef.length);
		return cleanedDef;

	} catch (error) {
		console.error('🔍 [GetDefinition] 處理過程中發生錯誤:', error);
		return '';
	}
}
