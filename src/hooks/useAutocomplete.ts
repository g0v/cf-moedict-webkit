/**
 * Autocomplete 相關功能
 * 復刻原專案 moedict-webkit 的 autocomplete 功能
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { DictionaryLang } from '../types';

interface AutocompleteOption {
	label: string;
	value: string;
}

/**
 * 使用 Autocomplete 的 Hook
 */
export function useAutocomplete(lang: DictionaryLang) {
	const [suggestions, setSuggestions] = useState<AutocompleteOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const indexRef = useRef<string | null>(null);

	// 載入 index.json
	useEffect(() => {
		let cancelled = false;
		async function loadIndex() {
			try {
				setIsLoading(true);
				const response = await fetch(`/${lang}/index.json`);
				if (!response.ok) {
					throw new Error('Failed to load index');
				}
				const indexText = await response.text();
				if (!cancelled) {
					indexRef.current = indexText;
					setIsLoading(false);
				}
			} catch (error) {
				console.error('Failed to load autocomplete index:', error);
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		}
		loadIndex();
		return () => {
			cancelled = true;
		};
	}, [lang]);

	/**
	 * 搜尋建議
	 */
	const search = useCallback((term: string): AutocompleteOption[] => {
		if (!term || !term.trim() || !indexRef.current) {
			return [];
		}

		const trimmed = term.trim();

		// 特殊處理：=諺語
		if (trimmed === '=諺語' && lang === 't') {
			return [{ label: '。', value: '。' }];
		}
		if (trimmed === '=諺語' && lang === 'h') {
			return [{ label: '，', value: '，' }];
		}

		// 如果輸入是 @ 或 = 開頭，直接返回
		if (trimmed.match(/^[@=]/)) {
			return [];
		}

		// 處理輸入文字
		let processedTerm = trimmed
			.replace(/^→列出含有「/, '')
			.replace(/」的詞$/, '')
			.replace(/\*/g, '%')
			.replace(/[-—]/g, '－')
			.replace(/[,﹐]/g, '，')
			.replace(/[;﹔]/g, '；')
			.replace(/[﹒．]/g, '。');

		// 構建正則表達式
		let regex = processedTerm;

		// 開頭匹配
		if (processedTerm.match(/\s$/) || processedTerm.match(/\^/)) {
			regex = regex.replace(/\^/g, '').replace(/\s*$/g, '');
			regex = '"' + regex;
		} else {
			if (!processedTerm.match(/[?._%]/)) {
				regex = '[^"]*' + regex;
			}
		}

		// 結尾匹配
		if (processedTerm.match(/^\s/) || processedTerm.match(/\$/)) {
			regex = regex.replace(/\$/g, '').replace(/^\s*/g, '');
			regex = regex + '"';
		} else {
			if (!processedTerm.match(/[?._%]/)) {
				regex = regex + '[^"]*';
			}
		}

		regex = regex.replace(/\s/g, '');

		// 處理萬用字元
		if (processedTerm.match(/[%?._]/)) {
			regex = regex.replace(/[?._]/g, '[^"]');
			regex = regex.replace(/%/g, '[^"]*');
			regex = '"' + regex + '"';
		}

		regex = regex.replace(/\(\)/g, '');

		// 簡化版：使用 b2g 轉換（繁體轉換）
		// 這裡簡化處理，實際原專案有更複雜的轉換邏輯
		let searchRegex: RegExp;
		try {
			searchRegex = new RegExp(regex, 'g');
		} catch (e) {
			return [];
		}

		// 從 index 中匹配
		const matches = indexRef.current.match(searchRegex);
		if (!matches) {
			return [];
		}

		// 清理結果並限制數量
		const results = matches
			.map(m => m.replace(/"/g, ''))
			.filter((v, i, arr) => arr.indexOf(v) === i) // 去重
			.slice(0, 1024)
			.map(v => ({ label: v, value: v }));

		return results;
	}, [lang]);

	return {
		search,
		isLoading,
		hasIndex: indexRef.current !== null
	};
}

