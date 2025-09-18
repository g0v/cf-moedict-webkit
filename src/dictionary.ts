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
		// 嘗試從 KV Storage 讀取字典資料
		const dictionaryData = await env.DICTIONARY.get(`${lang}/${fixedText}.json`);
		
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
	// 這裡需要實現原本的 decodeLangPart 功能
	// 暫時返回基本結構
	return {
		id: entry.t,
		type: 'term',
		title: entry.t,
		english: entry.english,
		heteronyms: entry.h,
		radical: entry.radical,
		stroke_count: entry.stroke_count,
		non_radical_stroke_count: entry.non_radical_stroke_count,
		pinyin: entry.pinyin,
		translation: entry.translation,
	};
}

/**
 * 獲取跨語言對照資料
 */
async function getCrossReferences(text: string, lang: DictionaryLang, env: Env): Promise<Array<{ lang: DictionaryLang; words: string[] }>> {
	try {
		const xrefData = await env.DICTIONARY.get(`${lang}/xref.json`);
		
		if (!xrefData) {
			return [];
		}
		
		const xref: XRefData = JSON.parse(xrefData);
		const result: Array<{ lang: DictionaryLang; words: string[] }> = [];
		
		// 檢查是否有跨語言對照
		for (const [targetLang, words] of Object.entries(xref)) {
			if (words[text] && words[text].length > 0) {
				result.push({
					lang: targetLang as DictionaryLang,
					words: words[text]
				});
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
 * 對應原本的 LTM-regexes 功能
 */
async function performFuzzySearch(text: string, lang: DictionaryLang, env: Env): Promise<string[]> {
	try {
		// 讀取長度到正則表達式的映射
		const lenToRegexData = await env.DICTIONARY.get(`${lang}/lenToRegex.json`);
		
		if (!lenToRegexData) {
			return [];
		}
		
		const { lenToRegex } = JSON.parse(lenToRegexData);
		const lens = Object.keys(lenToRegex).map(Number).sort((a, b) => b - a);
		
		// 清理文字，移除特殊字符
		let chunk = text.replace(/[`~]/g, '');
		
		// 應用正則表達式匹配
		for (const len of lens) {
			const regex = new RegExp(lenToRegex[len], 'g');
			chunk = chunk.replace(regex, (match) => `\`${match}~`);
		}
		
		// 分割並過濾結果
		const terms = chunk.split(/[`~]+/).filter(part => part.length > 0);
		
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
		const data = await env.DICTIONARY.get(`${lang}/${title}.json`);
		
		if (!data) {
			return '';
		}
		
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
