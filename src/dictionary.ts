import { Env, DictionaryLang, DictionaryAPIResponse, ErrorResponse, DictionaryEntry, XRefData } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';

/**
 * 處理字典查詢 API 請求
 * 對應原本的 @get '/:text.json' 路由
 */
export async function handleDictionaryAPI(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);

	try {
		// 嘗試從 R2 Storage 讀取字典資料
		// 先嘗試單字格式 (@字.json)
		let dictionaryObject = await env.DICTIONARY.get(`${lang}/@${fixedText}.json`);
		let dictionaryData = dictionaryObject ? await dictionaryObject.text() : null;

		// 如果找不到單字，嘗試複合詞格式 (=詞.json)
		if (!dictionaryData) {
			dictionaryObject = await env.DICTIONARY.get(`${lang}/=${fixedText}.json`);
			dictionaryData = dictionaryObject ? await dictionaryObject.text() : null;
		}

		if (!dictionaryData) {
			// 如果找不到確切匹配，嘗試模糊搜尋
			const searchResult = await performFuzzySearch(fixedText, lang, env);

			if (searchResult.length === 0) {
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

			// 返回搜尋結果
			return new Response(JSON.stringify({ terms: searchResult }), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 解析字典資料
		const entry: DictionaryEntry = JSON.parse(dictionaryData);

		// 處理字典資料
		const processedEntry = await processDictionaryEntry(entry, lang, env);

		// 添加跨語言對照
		const xrefs = await getCrossReferences(fixedText, lang, env);
		processedEntry.xrefs = xrefs;

		return new Response(JSON.stringify(processedEntry), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('Dictionary API error:', error);

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
 * 處理字典條目資料
 */
async function processDictionaryEntry(entry: DictionaryEntry, lang: DictionaryLang, env: Env): Promise<DictionaryAPIResponse> {
	// 使用 decodeLangPart 處理字典資料
	const processedEntry = decodeLangPart(lang, JSON.stringify(entry));
	const parsedEntry = JSON.parse(processedEntry);

	return {
		id: parsedEntry.title,
		type: 'term',
		title: parsedEntry.title,
		english: parsedEntry.english,
		heteronyms: parsedEntry.heteronyms,
		radical: parsedEntry.radical,
		stroke_count: parsedEntry.stroke_count,
		non_radical_stroke_count: parsedEntry.non_radical_stroke_count,
		pinyin: parsedEntry.pinyin,
		translation: parsedEntry.translation,
	};
}

/**
 * 解碼語言特定的字典資料
 * 複製原本 moedict-webkit 的 decodeLangPart 函數邏輯
 */
function decodeLangPart(langOrH: DictionaryLang | string, part: string = ''): string {
	// 處理特殊字符替換
	while (part.match(/"`辨~\u20DE&nbsp`似~\u20DE"[^}]*},{"f":"([^（]+)[^"]*"/)) {
		part = part.replace(/"`辨~\u20DE&nbsp`似~\u20DE"[^}]*},{"f":"([^（]+)[^"]*"/, '"辨\u20DE 似\u20DE $1"');
	}

	part = part.replace(/"`(.)~\u20DE"[^}]*},{"f":"([^（]+)[^"]*"/g, '"$1\u20DE $2"');

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

	// 處理語言特定的 hash
	const HASH_OF: Record<string, string> = { a: '#', t: "#'", h: '#:', c: '#~' };
	const H = `#DotSlash${HASH_OF[langOrH] || langOrH}`;

	// 處理連結和標點符號
	part = part.replace(/([「【『（《])`([^~]+)~([。，、；：？！─…．·－」』》〉]+)/g, (match, pre, word, post) =>
		`<span class="punct">${pre}<a href="${H}${word}">${word}</a>${post}</span>`
	);

	part = part.replace(/([「【『（《])`([^~]+)~/g, (match, pre, word) =>
		`<span class="punct">${pre}<a href="${H}${word}">${word}</a></span>`
	);

	part = part.replace(/`([^~]+)~([。，、；：？！─…．·－」』》〉]+)/g, (match, word, post) =>
		`<span class="punct"><a href="${H}${word}">${word}</a>${post}</span>`
	);

	part = part.replace(/`([^~]+)~/g, (match, word) =>
		`<a href="${H}${word}">${word}</a>`
	);

	// 處理右括號
	part = part.replace(/([)）])/g, '$1\u200B');

	return part;
}

/**
 * 獲取跨語言對照資料
 * 複製原本 moedict-webkit 的 xref-of 函數邏輯
 */
async function getCrossReferences(text: string, lang: DictionaryLang, env: Env): Promise<Array<{ lang: DictionaryLang; words: string[] }>> {
	try {
		const xrefObject = await env.DICTIONARY.get(`${lang}/xref.json`);

		if (!xrefObject) {
			return [];
		}

		const xrefData = await xrefObject.text();
		const xref: XRefData = JSON.parse(xrefData);
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

		return result;

	} catch (error) {
		console.error('Cross reference error:', error);
		return [];
	}
}

/**
 * 執行模糊搜尋
 * 由於原專案沒有 lenToRegex.json，改為簡單的字符分割搜尋
 */
async function performFuzzySearch(text: string, lang: DictionaryLang, env: Env): Promise<string[]> {
	try {
		// 簡單的字符分割搜尋
		// 將輸入文字分割成單個字符，作為搜尋候選
		const terms: string[] = [];

		// 清理文字，移除特殊字符
		const cleanText = text.replace(/[`~]/g, '');

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

		return terms;

	} catch (error) {
		console.error('Fuzzy search error:', error);
		return [];
	}
}

/**
 * 獲取字典定義
 * 對應原本的 def-of 函數
 */
export async function getDefinition(lang: DictionaryLang, title: string, env: Env): Promise<string> {
	try {
		// 先嘗試單字格式 (@字.json)
		let dataObject = await env.DICTIONARY.get(`${lang}/@${title}.json`);

		// 如果找不到單字，嘗試複合詞格式 (=詞.json)
		if (!dataObject) {
			dataObject = await env.DICTIONARY.get(`${lang}/=${title}.json`);
		}

		if (!dataObject) {
			return '';
		}

		const data = await dataObject.text();
		const payload = JSON.parse(data);
		let def = '';

		// 處理定義資料
		if (payload.h && Array.isArray(payload.h)) {
			for (const h of payload.h) {
				if (h.d && Array.isArray(h.d)) {
					for (const d of h.d) {
						def += (d.f || d.l || '');
					}
				}
			}
		}

		// 清理定義文字
		return def.replace(/[`~]/g, '');

	} catch (error) {
		console.error('Get definition error:', error);
		return '';
	}
}
