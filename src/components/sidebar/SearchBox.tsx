/**
 * 左側欄搜尋框組件
 * 復刻原專案 moedict-webkit 的 query-box 功能
 */

import { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useRouter } from '../../layouts';
import { DictionaryLang } from '../../types';
import { getLangPrefix } from '../../router/state';
import { useAutocomplete } from '../../hooks/useAutocomplete';

interface SearchBoxProps {
	currentLang?: DictionaryLang;
}

/**
 * 從字詞提取語言前綴和清理後的字詞
 */
function parseSearchTerm(term: string): { lang: DictionaryLang; cleanTerm: string } {
	const trimmed = term.trim();
	if (trimmed.startsWith("'") || trimmed.startsWith('!')) {
		return { lang: 't', cleanTerm: trimmed.slice(1) };
	}
	if (trimmed.startsWith(':')) {
		return { lang: 'h', cleanTerm: trimmed.slice(1) };
	}
	if (trimmed.startsWith('~')) {
		return { lang: 'c', cleanTerm: trimmed.slice(1) };
	}
	return { lang: 'a', cleanTerm: trimmed };
}

/**
 * 格式化字詞為完整路由 token（包含語言前綴）
 */
function formatSearchTerm(term: string, lang: DictionaryLang): string {
	if (!term || !term.trim()) {
		return '';
	}
	const prefix = getLangPrefix(lang);
	return `${prefix}${term.trim()}`;
}

/**
 * 搜尋框組件
 */
export function SearchBox(props: SearchBoxProps) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [searchValue, setSearchValue] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [suggestions, setSuggestions] = useState<Array<{ label: string; value: string }>>([]);
	const resolvedLang = (props.currentLang ?? router.route.lang) as DictionaryLang;
	const { search: searchAutocomplete } = useAutocomplete(resolvedLang);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// 從路由更新輸入框值
	useEffect(() => {
		const currentRoute = router.route;
		if (currentRoute.view === 'dictionary' && currentRoute.payload?.term) {
			const term = currentRoute.payload.term;
			setSearchValue(term);
		} else if (currentRoute.view === 'home' || currentRoute.view === 'unknown') {
			setSearchValue('');
		}
	}, [router.route]);

	// 處理輸入變化
	const handleInputChange = useCallback((e: JSX.TargetedEvent<HTMLInputElement>) => {
		const value = e.currentTarget.value;
		setSearchValue(value);

		// 搜尋建議
		if (value.trim()) {
			const results = searchAutocomplete(value);
			setSuggestions(results);
			setShowSuggestions(results.length > 0);
		} else {
			setSuggestions([]);
			setShowSuggestions(false);
		}
	}, [searchAutocomplete]);

	// 處理選擇建議
	const handleSelectSuggestion = useCallback((suggestion: { label: string; value: string }) => {
		setSearchValue(suggestion.value);
		setShowSuggestions(false);

		// 解析輸入值（可能包含語言前綴）
		const { lang: inputLang, cleanTerm } = parseSearchTerm(suggestion.value);
		// 如果有語言前綴，使用輸入的語言；否則使用當前語言
		const finalLang = cleanTerm !== suggestion.value ? inputLang : resolvedLang;
		const finalTerm = cleanTerm || suggestion.value;

		// 構建路由 intent
		const intent = {
			view: 'dictionary' as const,
			lang: finalLang,
			source: 'path' as const,
			raw: formatSearchTerm(finalTerm, finalLang),
			payload: {
				term: finalTerm,
				mode: (finalTerm.startsWith('=') ? 'search' : 'entry') as 'search' | 'entry'
			}
		};

		router.navigate(intent);
	}, [resolvedLang, router]);

	// 處理提交
	const handleSubmit = useCallback((e: JSX.TargetedEvent<HTMLFormElement>) => {
		e.preventDefault();
		const trimmed = searchValue.trim();
		if (!trimmed) {
			return;
		}

		// 解析輸入值（可能包含語言前綴）
		const { lang: inputLang, cleanTerm } = parseSearchTerm(trimmed);
		// 如果有語言前綴，使用輸入的語言；否則使用當前語言
		const finalLang = cleanTerm !== trimmed ? inputLang : resolvedLang;
		const finalTerm = cleanTerm || trimmed;

		// 構建路由 intent
		const intent = {
			view: 'dictionary' as const,
			lang: finalLang,
			source: 'path' as const,
			raw: formatSearchTerm(finalTerm, finalLang),
			payload: {
				term: finalTerm,
				mode: (finalTerm.startsWith('=') ? 'search' : 'entry') as 'search' | 'entry'
			}
		};

		router.navigate(intent);
	}, [searchValue, resolvedLang, router]);

	// 處理點擊外部關閉建議選單
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				suggestionsRef.current &&
				!suggestionsRef.current.contains(e.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(e.target as Node)
			) {
				setShowSuggestions(false);
			}
		};

		if (showSuggestions) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	}, [showSuggestions]);

	// 處理 Enter 鍵
	const handleKeyDown = useCallback((e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// 如果有建議且第一個建議被選中，使用第一個建議
			if (showSuggestions && suggestions.length > 0) {
				handleSelectSuggestion(suggestions[0]);
			} else {
				const form = e.currentTarget.closest('form');
				if (form) {
					form.requestSubmit();
				}
			}
		} else if (e.key === 'Escape') {
			setShowSuggestions(false);
		}
	}, [showSuggestions, suggestions, handleSelectSuggestion]);

	return (
		<div className="search-container" style={{ position: 'relative' }}>
			<form onSubmit={handleSubmit} className="search-form">
				<input
					ref={inputRef}
					id="query"
					type="search"
					className="query"
					autocomplete="off"
					placeholder="請輸入欲查詢的字詞"
					value={searchValue}
					onInput={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={() => {
						if (suggestions.length > 0) {
							setShowSuggestions(true);
						}
					}}
				/>
			</form>
			{showSuggestions && suggestions.length > 0 && (
				<div
					ref={suggestionsRef}
					className="ui-autocomplete"
				>
					<ul>
						{suggestions.slice(0, 50).map((suggestion, idx) => (
							<li
								key={idx}
								className="ui-menu-item"
								onClick={() => handleSelectSuggestion(suggestion)}
							>
								{suggestion.label}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

