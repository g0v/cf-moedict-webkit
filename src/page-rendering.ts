import { Env, DictionaryLang, TITLE_OF } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { lookupDictionaryEntry, getDefinition } from './dictionary';
import { renderToString } from 'preact-render-to-string';
import { DictionaryPage, SearchResultsPage, NotFoundPage } from './preact-components';
import { NavbarComponent } from './navbar-component';
import { AboutPage } from './about-page';
import { StarredPageSSR } from './starred-page';

/**
 * 處理頁面渲染請求
 * 對應原本的 @get '/:text' 路由
 */
export async function handlePageRequest(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);

	console.log('🔍 [HandlePageRequest] 查詢:', fixedText, 'lang:', lang);

	// 處理字詞紀錄簿路由
	if (text === '=*' || url.pathname === '/=*') {
		console.log('🔍 [HandlePageRequest] 處理字詞紀錄簿頁面');
		const bodyHTML = renderToString(StarredPageSSR());
		const html = generateHTMLWrapper('字詞紀錄簿', bodyHTML, lang);

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				...getCORSHeaders(),
			},
		});
	}

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
 * 生成關於頁面 HTML 包裝
 */
function generateAboutHTMLWrapper(bodyHTML: string): string {
	// R2 公開端點
	const R2_ENDPOINT = 'https://pub-1808868ac1e14b13abe9e2800cace884.r2.dev';

	return `<!DOCTYPE html>
<html lang="zh-Hant" xml:lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>萌典 – 關於本站</title>
	<meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1">
	<meta content="IE=edge,chrome=IE9" http-equiv="X-UA-Compatible">
	<meta name="keywords" content="詞典,辭典,國語,臺語,台語,客語,兩岸,g0v">
	<meta name="description" content="共收錄十六萬筆國語、兩萬筆臺語、一萬四千筆客語條目，每個字詞都可以輕按連到說明，並提供 Android 及 iOS 離線 App。來源為教育部「重編國語辭典修訂本」、「臺灣閩南語常用詞辭典」、「臺灣客家語常用詞辭典」，辭典本文的著作權仍為教育部所有。">

	<!-- 圖標和樣式 -->
	<link rel="apple-touch-icon" href="${R2_ENDPOINT}/images/icon.png">
	<link rel="shortcut icon" type="image/x-icon" href="${R2_ENDPOINT}/favicon.ico">
	<link href="${R2_ENDPOINT}/styles.css" rel="stylesheet">
</head>
<body id="moedict" class="about web">
	${bodyHTML}
</body>
</html>`;
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
 * 處理 about.html 頁面請求
 */
export async function handleAboutPageRequest(url: URL, env: Env): Promise<Response> {
	console.log('🔍 [HandleAboutPageRequest] 處理關於頁面請求');

	try {
		const bodyHTML = renderToString(AboutPage());
		const html = generateAboutHTMLWrapper(bodyHTML);

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				...getCORSHeaders(),
			},
		});
	} catch (error) {
		console.error('❌ [HandleAboutPageRequest] 錯誤:', error);
		const errorHTML = generateErrorHTML('關於頁面', error);

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
 * 生成 HTML 包裝
 */
function generateHTMLWrapper(text: string, bodyHTML: string, lang: DictionaryLang): string {
	const title = TITLE_OF[lang];
	const pageTitle = `${text} - ${title}萌典`;

	// R2 公開端點
	const R2_ENDPOINT = 'https://pub-1808868ac1e14b13abe9e2800cace884.r2.dev';

	return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>${escapeHtml(pageTitle)}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=IE9">


	<!-- 處理 # 路由和首頁重定向的前端腳本 -->
	<script>
		// 統一處理 hash 路由和首頁重定向
		(function() {
			if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
				// 優先處理 hash 路由
				if (window.location.hash && window.location.hash !== '#') {
					var hash = window.location.hash.substring(1); // 移除 # 符號
					if (hash) {
						// 更新 URL，移除 hash
						var newUrl = window.location.pathname.replace(/\\/$/, '') + '/' + hash;
						// 重新載入頁面以取得正確內容
						window.location.href = newUrl;
						return;
					}
				}

				// 沒有 hash 時，檢查 localStorage 中的瀏覽歷史
				var lruKey = 'lru-a'; // 預設華語
				var lruData = localStorage.getItem(lruKey);

				if (lruData) {
					try {
						var words = JSON.parse(lruData);
						if (words && words.length > 0) {
							// 取得最新的字詞
							var latestWord = words[0];
							if (latestWord) {
								// 重定向到最新瀏覽的字詞
								window.location.href = '/' + latestWord;
								return;
							}
						}
					} catch (e) {
						console.log('解析瀏覽歷史失敗:', e);
					}
				}

				// 如果沒有瀏覽歷史，重定向到預設字詞
				window.location.href = '/萌';
			}
		})();

		// 字詞紀錄簿功能
		(function() {
			// 儲存瀏覽歷史到 localStorage
			function addToLRU(word, lang) {
				if (!word || word === '=*') return;

				var lruKey = 'lru-' + lang;
				var lruData = localStorage.getItem(lruKey);
				var words = [];

				try {
					if (lruData) {
						words = JSON.parse(lruData);
					}
				} catch (e) {
					console.log('解析瀏覽歷史失敗:', e);
					words = [];
				}

				// 移除重複項目
				words = words.filter(function(w) { return w !== word; });

				// 將新字詞加到開頭
				words.unshift(word);

				// 限制歷史記錄數量（最多 50 個）
				if (words.length > 50) {
					words = words.slice(0, 50);
				}

				// 儲存回 localStorage
				localStorage.setItem(lruKey, JSON.stringify(words));
			}

			// 載入字詞紀錄簿內容
			function loadStarredPage() {
				if (window.location.pathname === '/=*' || window.location.pathname === '/#=*') {
					var lruKey = 'lru-a'; // 預設華語
					var lruData = localStorage.getItem(lruKey);
					var words = [];

					try {
						if (lruData) {
							words = JSON.parse(lruData);
						}
					} catch (e) {
						console.log('解析瀏覽歷史失敗:', e);
					}

					// 更新頁面內容
					var wordListContainer = document.querySelector('.word-list');
					if (wordListContainer && words.length > 0) {
						var html = '';
						words.forEach(function(word) {
							html += '<div style="clear: both; display: block;"><span>·</span><a href="/' + word + '">' + word + '</a></div>';
						});
						wordListContainer.innerHTML = html;
					}
				}
			}

			// 監聽頁面載入
			document.addEventListener('DOMContentLoaded', function() {
				// 載入字詞紀錄簿內容
				loadStarredPage();

				// 監聽導航變化
				window.addEventListener('popstate', function() {
					loadStarredPage();
				});
			});

			// 監聽所有內部連結點擊
			document.addEventListener('click', function(e) {
				var link = e.target.closest('a');
				if (link && link.href) {
					var url = new URL(link.href);
					if (url.pathname !== window.location.pathname) {
						// 提取字詞名稱
						var word = url.pathname.replace(/^\\//, '');
						if (word && word !== '=*' && word !== 'about.html') {
							// 儲存到瀏覽歷史
							addToLRU(word, 'a'); // 預設華語
						}
					}
				}
			});
		})();
	</script>

	<!-- 原專案 CSS -->
	<link rel="stylesheet" href="${R2_ENDPOINT}/styles.css">
	<link rel="stylesheet" href="${R2_ENDPOINT}/css/cupertino/jquery-ui-1.10.4.custom.css">

	<!-- 圖標和搜尋 -->
	<link rel="apple-touch-icon" href="${R2_ENDPOINT}/images/icon.png">
	<link rel="shortcut icon" type="image/x-icon" href="${R2_ENDPOINT}/favicon.ico">
	<link rel="search" type="application/opensearchdescription+xml" href="${R2_ENDPOINT}/opensearch/moedict.xml" title="萌典華語">

	<!-- 字體預載入 (直接從 R2 端點載入) -->
	<link rel="preload" href="${R2_ENDPOINT}/fonts/fontawesome-webfont.woff" as="font" type="font/woff" crossorigin>
	<link rel="preload" href="${R2_ENDPOINT}/fonts/MOEDICT.woff" as="font" type="font/woff" crossorigin>
	<link rel="preload" href="${R2_ENDPOINT}/fonts/han.woff" as="font" type="font/woff" crossorigin>
	<link rel="preload" href="${R2_ENDPOINT}/fonts/EBAS-Subset.woff" as="font" type="font/woff" crossorigin>
	<link rel="preload" href="${R2_ENDPOINT}/fonts/FiraSansOT-Regular.woff" as="font" type="font/woff" crossorigin>

	<!-- 使用原專案樣式，移除自訂樣式 -->
	<style>
		/* 修正導航列壓版問題 */
		body {
			padding-top: 50px; /* 為固定導航列留出空間 */
		}

		/* 確保導航列背景正確顯示 */
		.nav-bg {
			height: 50px;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			z-index: 1029;
		}

		/* 確保導航列在背景之上 */
		.navbar-fixed-top {
			z-index: 1030;
		}

		/* 為內容區域添加適當的 padding */
		.result {
			padding: 20px;
			max-width: 1200px;
			margin: 0 auto;
		}

		/* 手機版調整 */
		@media (max-width: 767px) {
			body {
				padding-top: 0; /* 手機版不需要 padding-top */
			}

			.nav-bg {
				position: static; /* 手機版導航列不固定 */
			}

			.navbar-fixed-top {
				position: static; /* 手機版導航列不固定 */
			}
		}
	</style>
</head>
<body>
	${bodyHTML}

	<!-- 原專案 JavaScript -->
	<script src="${R2_ENDPOINT}/js/es5-shim.js" charset="utf-8"></script>
	<script src="${R2_ENDPOINT}/js/es5-sham.js" charset="utf-8"></script>
	<script src="${R2_ENDPOINT}/js/deps.js" charset="utf-8"></script>

	<!-- Facebook SDK -->
	<div id="fb-root"></div>
	<script>
		(function(d, s, id) {
		var js, fjs = d.getElementsByTagName(s)[0];
		if (d.getElementById(id)) return;
		js = d.createElement(s); js.id = id;
		js.src = "//connect.facebook.net/zh_TW/sdk.js#xfbml=1&version=v2.3&appId=252470654795525";
		fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));
	</script>

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
