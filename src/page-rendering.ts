import { Env, DictionaryLang, DictionaryEntry, TITLE_OF, HASH_OF } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { getDefinition } from './dictionary';
// 暫時不使用 React SSR，使用簡單的 HTML 模板

/**
 * 處理頁面渲染請求
 * 對應原本的 @get '/:text' 路由
 */
export async function handlePageRequest(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);
	const fontParam = url.searchParams.get('font') || 'kai';

	try {
		// 檢查是否為機器人或 CLI 請求
		const userAgent = url.searchParams.get('user-agent') || '';
		const isBot = url.searchParams.get('bot') === 'true' ||
			/\b(?:Google|Twitterbot)\b/.test(userAgent);

		// 嘗試讀取字典資料
		const dictionaryData = await env.DICTIONARY.get(`${lang}/${fixedText}.json`);
		const isWord = !!dictionaryData;

		let payload: any = {};
		let segments: Array<{ def: string; part: string; href: string }> = [];

		if (dictionaryData) {
			// 有字典資料，解析並處理
			const entry: DictionaryEntry = JSON.parse(dictionaryData);
			payload = {
				layout: 'layout',
				text: text,
				isBot,
				isCLI: false,
				pngSuffix: fontParam ? `.png?font=${fontParam}` : '.png',
				isWord: true,
				...entry,
			};
		} else {
			// 沒有字典資料，進行模糊搜尋
			const searchTerms = await performFuzzySearch(fixedText, lang, env);

			// 為每個搜尋結果生成定義
			for (const term of searchTerms) {
				const def = await getDefinition(lang, term, env);
				if (def) {
					const href = `https://www.moedict.tw/${HASH_OF[lang]}${term}`;
					segments.push({ def, part: term, href });
				}
			}

			payload = {
				layout: 'layout',
				text: text,
				isBot,
				isCLI: false,
				pngSuffix: fontParam ? `.png?font=${fontParam}` : '.png',
				isWord: false,
				segments,
			};
		}

		// 生成 HTML
		const html = await generateHTML(payload, lang, env);

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('Page rendering error:', error);

		// 返回錯誤頁面
		const errorHTML = generateErrorHTML(text, error);

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
 */
async function performFuzzySearch(text: string, lang: DictionaryLang, env: Env): Promise<string[]> {
	try {
		const lenToRegexData = await env.DICTIONARY.get(`${lang}/lenToRegex.json`);

		if (!lenToRegexData) {
			return [];
		}

		const { lenToRegex } = JSON.parse(lenToRegexData);
		const lens = Object.keys(lenToRegex).map(Number).sort((a, b) => b - a);

		let chunk = text.replace(/[`~]/g, '');

		for (const len of lens) {
			const regex = new RegExp(lenToRegex[len], 'g');
			chunk = chunk.replace(regex, (match) => `\`${match}~`);
		}

		return chunk.split(/[`~]+/).filter(part => part.length > 0);

	} catch (error) {
		console.error('Fuzzy search error:', error);
		return [];
	}
}

/**
 * 生成 HTML 頁面
 */
async function generateHTML(payload: any, lang: DictionaryLang, env: Env): Promise<string> {
	const { text, isBot, pngSuffix, segments, isWord } = payload;
	const cleanText = text.replace(/^['!~:]/, '');
	const title = TITLE_OF[lang];

	// 生成頁面標題
	const pageTitle = `${cleanText} - ${title}萌典`;

	// 生成描述
	let description = '';
	if (segments && segments.length > 0) {
		description = segments.map((s: { def: string; part: string; href: string }) => s.def).join('；');
	} else if (payload.h && Array.isArray(payload.h)) {
		// 從字典資料生成描述
		for (const h of payload.h) {
			if (h.d && Array.isArray(h.d)) {
				for (const d of h.d) {
					description += (d.f || d.l || '');
				}
			}
		}
	}

	// 生成 OG 圖片 URL
	const ogImage = `https://www.moedict.tw/${encodeURIComponent(cleanText)}${pngSuffix}`;

	// 計算圖片尺寸
	const len = Math.min(cleanText.length, 50);
	let w = len;
	if (w > 4) {
		w = Math.ceil(len / Math.sqrt(len * 0.5));
	}

	const html = `<!DOCTYPE html>
<html lang="zh-Hant" xml:lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>${escapeHtml(pageTitle)}</title>
	<meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1">
	<meta name="description" content="${escapeHtml(description)}">

	<!-- Open Graph -->
	<meta property="og:url" content="https://www.moedict.tw/${encodeURIComponent(text)}">
	<meta property="og:image" content="${ogImage}">
	<meta property="og:image:type" content="image/png">
	<meta property="og:image:width" content="${w * 375}">
	<meta property="og:image:height" content="${w * 375}">
	<meta property="og:title" content="${escapeHtml(pageTitle)}">
	<meta property="og:description" content="${escapeHtml(description)}">

	<!-- Twitter -->
	<meta name="twitter:card" content="summary">
	<meta name="twitter:site" content="@moedict">
	<meta name="twitter:creator" content="@audreyt">
	<meta name="twitter:title" content="${escapeHtml(pageTitle)}">

	<link rel="stylesheet" href="/styles.css">
	<link rel="stylesheet" href="/css/cupertino/jquery-ui-1.10.4.custom.css">
</head>
<body>
	${generateBodyContent(payload, lang)}
</body>
</html>`;

	return html;
}

/**
 * 生成頁面主體內容
 */
function generateBodyContent(payload: any, lang: DictionaryLang): string {
	const { text, segments, isWord, pngSuffix } = payload;
	const cleanText = text.replace(/^['!~:]/, '');

	if (segments && segments.length > 0) {
		// 搜尋結果頁面
		return generateSearchResultsPage(cleanText, segments, pngSuffix);
	} else if (isWord) {
		// 字典條目頁面
		return generateDictionaryPage(payload, lang);
	} else {
		// 預設頁面
		return generateDefaultPage(cleanText, pngSuffix);
	}
}

/**
 * 生成搜尋結果頁面
 */
function generateSearchResultsPage(text: string, segments: Array<{ def: string; part: string; href: string }>, pngSuffix: string): string {
	return `
	<div class="results">
		<div class="moedict-container">
			<img class="moedict" src="${text}${pngSuffix}" width="240" height="240" alt="${text}" title="${text}">

			<div class="share" style="margin: 15px">
				<a class="share-f btn btn-default" title="Facebook 分享" style="margin-right: 10px; background: #3B579D; color: white"
				   href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.moedict.tw%2F${encodeURIComponent(text)}">
					<i class="icon-share"></i> <i class="icon-facebook"></i> 臉書
				</a>
				<a class="share-t btn btn-default" title="Twitter 分享" style="background: #00ACED; color: white"
				   href="https://twitter.com/share?url=https%3A%2F%2Fwww.moedict.tw%2F${encodeURIComponent(text)}&text=${encodeURIComponent(text)}">
					<i class="icon-share"></i> <i class="icon-twitter"></i> 推特
				</a>
			</div>

			<table class="moetext" style="max-width: 90%; background: #eee; border: 24px #f9f9f9 solid !important; box-shadow: #d4d4d4 0 3px 3px;">
				${segments.map((s: { def: string; part: string; href: string }) => `
					<tr>
						<td>
							<a href="${s.href}">
								<img style="vertical-align: top; background: white; border-radius: 10px; border: 1px solid #999; box-shadow: #d4d4d4 0 3px 3px; margin: 10px;"
								     class="btn btn-default" src="${s.part}${pngSuffix}" width="160" height="160" alt="${s.part}" title="${s.part}">
							</a>
						</td>
						<td>
							<a style="color: #006" href="${s.href}">${escapeHtml(s.def)}</a>
						</td>
					</tr>
				`).join('')}
			</table>
		</div>
	</div>`;
}

/**
 * 生成字典條目頁面
 */
function generateDictionaryPage(payload: any, lang: DictionaryLang): string {
	// 這裡需要實現完整的字典條目頁面
	// 暫時返回簡單版本
	return `
	<div class="results">
		<div class="dictionary-entry">
			<h1>${escapeHtml(payload.t || '')}</h1>
			<p>字典條目內容將在這裡顯示</p>
		</div>
	</div>`;
}

/**
 * 生成預設頁面
 */
function generateDefaultPage(text: string, pngSuffix: string): string {
	return `
	<div class="results">
		<div class="moedict-container">
			<img class="moedict" src="${text}${pngSuffix}" width="240" height="240" alt="${text}" title="${text}">
			<p>找不到相關詞彙</p>
		</div>
	</div>`;
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
