import { Env, DictionaryLang, TITLE_OF } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { lookupDictionaryEntry, getDefinition } from './dictionary';
import { renderToString } from 'preact-render-to-string';
import { DictionaryPage, SearchResultsPage, NotFoundPage } from './preact-components';

/**
 * 處理頁面渲染請求
 * 對應原本的 @get '/:text' 路由
 */
export async function handlePageRequest(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);

	console.log('🔍 [HandlePageRequest] 查詢:', fixedText, 'lang:', lang);

	try {
		// 1. 嘗試查詢完整詞條
		const entry = await lookupDictionaryEntry(fixedText, lang, env);

		if (entry) {
			// 找到完整詞條，渲染字典頁面
			console.log('✅ [HandlePageRequest] 找到詞條:', entry.title);
			const bodyHTML = renderToString(DictionaryPage({ entry, text: fixedText, lang }));
			const html = generateHTMLWrapper(fixedText, bodyHTML, lang);

			return new Response(html, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					...getCORSHeaders(),
				},
			});
		}

		// 2. 沒找到完整詞條，嘗試分字查詢
		console.log('⚠️ [HandlePageRequest] 未找到完整詞條，開始分字查詢');
		const searchTerms = await performFuzzySearch(fixedText, lang, env);
		const segments: Array<{ part: string; def: string }> = [];

		for (const term of searchTerms) {
			const def = await getDefinition(lang, term, env);
			if (def) {
				segments.push({ part: term, def });
			}
		}

		if (segments.length > 0) {
			// 找到部分結果
			console.log('✅ [HandlePageRequest] 找到', segments.length, '個分字結果');
			const bodyHTML = renderToString(SearchResultsPage({ text: fixedText, segments }));
			const html = generateHTMLWrapper(fixedText, bodyHTML, lang);

			return new Response(html, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					...getCORSHeaders(),
				},
			});
		}

		// 3. 完全找不到
		console.log('❌ [HandlePageRequest] 完全找不到結果');
		const bodyHTML = renderToString(NotFoundPage({ text: fixedText }));
		const html = generateHTMLWrapper(fixedText, bodyHTML, lang);

		return new Response(html, {
			status: 404,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('❌ [HandlePageRequest] 錯誤:', error);
		const errorHTML = generateErrorHTML(fixedText, error);

		return new Response(errorHTML, {
			status: 500,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				...getCORSHeaders(),
			},
		});
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
 * 生成 HTML 包裝
 */
function generateHTMLWrapper(text: string, bodyHTML: string, lang: DictionaryLang): string {
	const title = TITLE_OF[lang];
	const pageTitle = `${text} - ${title}萌典`;

	return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>${escapeHtml(pageTitle)}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		body {
			font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
			max-width: 800px;
			margin: 0 auto;
			padding: 20px;
			line-height: 1.8;
			color: #333;
		}
		h1 {
			color: #2c3e50;
			border-bottom: 3px solid #3498db;
			padding-bottom: 15px;
			margin-bottom: 25px;
			font-size: 2em;
		}
		h1 a {
			color: inherit;
			text-decoration: none;
		}
		h3 {
			color: #2c3e50;
			margin-top: 25px;
			margin-bottom: 15px;
			border-bottom: 1px solid #ddd;
			padding-bottom: 8px;
		}
		.heteronym {
			margin: 25px 0;
			padding: 20px;
			background: #f8f9fa;
			border-left: 5px solid #3498db;
			border-radius: 4px;
		}
		.phonetic {
			margin-bottom: 15px;
			font-size: 1.1em;
		}
		.bopomofo {
			color: #e74c3c;
			margin-right: 15px;
			font-weight: bold;
		}
		.pinyin {
			color: #16a085;
			font-style: italic;
		}
		.definitions {
			margin-top: 15px;
			padding-left: 25px;
		}
		.definitions li {
			margin: 15px 0;
		}
		.def {
			margin-bottom: 10px;
		}
		.def a {
			color: #3498db;
			text-decoration: none;
		}
		.def a:hover {
			text-decoration: underline;
		}
		.example, .quote {
			margin: 8px 0;
			padding: 10px;
			background: #fff;
			border-left: 3px solid #95a5a6;
			font-size: 0.95em;
			color: #555;
		}
		.synonyms, .antonyms {
			margin-top: 10px;
			padding: 8px;
			background: #ecf0f1;
			border-radius: 3px;
			font-size: 0.9em;
		}
		.synonyms strong, .antonyms strong {
			color: #2c3e50;
		}
		.translations, .xrefs {
			margin: 25px 0;
			padding: 15px;
			background: #fff;
			border: 1px solid #ddd;
			border-radius: 4px;
		}
		.translation-item, .xref-item {
			margin: 10px 0;
			padding: 8px;
			background: #f8f9fa;
			border-radius: 3px;
		}
		.translation-item strong, .xref-item strong {
			color: #2c3e50;
			margin-right: 8px;
		}
		.search-results ul {
			list-style: none;
			padding: 0;
		}
		.search-results li {
			margin: 15px 0;
			padding: 15px;
			background: #f8f9fa;
			border-radius: 5px;
			border-left: 4px solid #3498db;
		}
		.search-results strong {
			color: #2c3e50;
			font-size: 1.1em;
		}
		.not-found {
			text-align: center;
			padding: 60px 20px;
			color: #7f8c8d;
		}
		.not-found h1 {
			border: none;
		}
	</style>
</head>
<body>
	${bodyHTML}
</body>
</html>`;
}

/**
 * 生成錯誤頁面
 */
function generateErrorHTML(text: string, error: any): string {
	return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>錯誤 - 萌典</title>
</head>
<body>
	<div class="error-page">
		<h1>發生錯誤</h1>
		<p>查詢詞彙: ${escapeHtml(text)}</p>
		<p>錯誤訊息: ${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p>
	</div>
</body>
</html>`;
}

/**
 * HTML 轉義函數
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
