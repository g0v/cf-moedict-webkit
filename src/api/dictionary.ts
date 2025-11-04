/**
 * 前端字典資料 API 客戶端
 * 提供瀏覽器端可呼叫的 fetch helpers，對應後端的 dictionary.ts 功能
 */

import { DictionaryLang, DictionaryAPIResponse, ErrorResponse } from '../types';
import { getLangPrefix } from '../router/state';

function buildDictionaryPath(text: string, lang: DictionaryLang): string {
	const prefix = getLangPrefix(lang);
	return `/${encodeURIComponent(`${prefix}${text}`)}.json`;
}

/**
 * 字典查詢 API 端點
 * 對應後端的 handleDictionaryAPI
 */
export async function fetchDictionaryEntry(
	text: string,
	lang: DictionaryLang
): Promise<DictionaryAPIResponse | null> {
	try {
		const url = buildDictionaryPath(text, lang);
		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				return null;
			}
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json() as DictionaryAPIResponse | ErrorResponse;

		// 檢查是否為錯誤回應
		if (data && typeof data === 'object' && 'error' in data) {
			const errorData = data as ErrorResponse;
			if (errorData.error === 'Not Found') {
				return null;
			}
			throw new Error(errorData.message || errorData.error);
		}

		return data as DictionaryAPIResponse;
	} catch (error) {
		console.error('[fetchDictionaryEntry] 錯誤:', error);
		return null;
	}
}

/**
 * 執行模糊搜尋
 * 對應後端的 performFuzzySearch
 */
export async function fetchFuzzySearch(
	text: string,
	lang: DictionaryLang
): Promise<string[]> {
	try {
		const url = buildDictionaryPath(text, lang);
		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				const errorData = await response.json() as ErrorResponse;
				if (errorData.terms && Array.isArray(errorData.terms)) {
					return errorData.terms;
				}
			}
			return [];
		}

		// 如果有完整詞條，返回空陣列（不需要模糊搜尋）
		return [];
	} catch (error) {
		console.error('[fetchFuzzySearch] 錯誤:', error);
		return [];
	}
}

/**
 * 獲取字典定義
 * 直接呼叫 `/:text.json` 並萃取定義文字
 */
export async function fetchDefinition(
	lang: DictionaryLang,
	title: string
): Promise<string> {
	try {
		const path = buildDictionaryPath(title, lang);
		const response = await fetch(path, {
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			return '';
		}

		const entry = await response.json() as any;
		const pieces: string[] = [];

		if (entry && Array.isArray(entry.heteronyms)) {
			for (const heteronym of entry.heteronyms) {
				if (heteronym && Array.isArray(heteronym.definitions)) {
					for (const definition of heteronym.definitions) {
						if (definition) {
							if (typeof definition.def === 'string') {
								pieces.push(definition.def);
							}
							if (typeof definition.quote === 'string') {
								pieces.push(definition.quote);
							}
							if (Array.isArray(definition.quote)) {
								for (const quote of definition.quote) {
									if (typeof quote === 'string') {
										pieces.push(quote);
									}
								}
							}
						}
					}
				}
			}
		}

		return pieces.join('')
			.replace(/[`~]/g, '')
			.trim();
	} catch (error) {
		console.error('[fetchDefinition] 錯誤:', error);
		return '';
	}
}

/**
 * 載入部首資料
 * 對應後端的 handleRadicalLookup
 */
export async function fetchRadicalData(
	radical: string,
	lang: DictionaryLang
): Promise<string[][] | null> {
	try {
		const encodedRadical = encodeURIComponent(radical);
		const url = `/${lang}/${encodedRadical}.json`;
		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				return null;
			}
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const raw = await response.json() as any;

		// 正規化資料格式：允許 object 或一維陣列
		return normalizeRadicalRows(raw);
	} catch (error) {
		console.error('[fetchRadicalData] 錯誤:', error);
		return null;
	}
}

/**
 * 正規化部首資料格式
 * 將 object 或一維陣列轉換為二維陣列
 */
function normalizeRadicalRows(raw: any): string[][] {
	try {
		if (!raw) return [];

		// 如果是 object（key 為數字）
		if (typeof raw === 'object' && !Array.isArray(raw)) {
			const keys = Object.keys(raw)
				.filter(k => /^\d+$/.test(k))
				.map(k => parseInt(k, 10));
			const max = keys.length ? Math.max(...keys) : -1;
			const rows: string[][] = [];
			for (let i = 0; i <= max; i++) {
				const row = raw[String(i)] || raw[i] || [];
				rows[i] = Array.isArray(row) ? row.filter(Boolean) : [];
			}
			return rows;
		}

		// 如果是二維陣列
		if (Array.isArray(raw) && raw.every((r: any) => Array.isArray(r) || r == null)) {
			return raw.map((r: any) => Array.isArray(r) ? r.filter(Boolean) : []);
		}

		// 如果是一維陣列
		if (Array.isArray(raw)) {
			return [raw.filter(Boolean)];
		}

		return [];
	} catch (_e) {
		return [];
	}
}

/**
 * 載入部首列表（部首表）
 */
export async function fetchRadicalTable(
	lang: DictionaryLang,
	isCrossStrait: boolean = false
): Promise<string[][] | null> {
	const radical = isCrossStrait ? '~@' : '@';
	return fetchRadicalData(radical, lang);
}

