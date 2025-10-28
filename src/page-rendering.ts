import { Env, DictionaryLang, TITLE_OF } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { lookupDictionaryEntry, getDefinition } from './dictionary';
import { renderToString } from 'preact-render-to-string';
import { DictionaryPage, SearchResultsPage, NotFoundPage } from './preact-components';
import { handleRadicalPageRequest } from './radical-pages.tsx';
import { NavbarComponent } from './navbar-component';
import { AboutPage } from './about-page';
import { StarredPageSSR } from './starred-page';
import { decorateRuby } from './bopomofo-pinyin-utils';
import { rightAngle } from './ruby2hruby';

/**
 * 處理頁面渲染請求
 * 對應原本的 @get '/:text' 路由
 */
export async function handlePageRequest(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);

	console.log('🔍 [HandlePageRequest] 查詢:', fixedText, 'lang:', lang);

	// 提供簡介框（tooltip）資料端點
	try {
		// 部首檢索頁面：/@ 與 /@{部首}
		if (fixedText === '@' || fixedText.startsWith('@')) {
			return await handleRadicalPageRequest(url, env);
		}
		const tooltip = url.searchParams.get('tooltip');
		if (tooltip === '1') {
			const idParam = url.searchParams.get('id') || '';
			const normalizedId = normalizeLinkId(decodeURIComponent(idParam));
			const html = await buildTooltipHTML(normalizedId, lang, env);
			return new Response(html, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					...getCORSHeaders(),
				},
			});
		}
	} catch (_tooltipErr) {}

	// 處理字詞紀錄簿路由
	if (text === '=*' || url.pathname === '/=*') {
		console.log('🔍 [HandlePageRequest] 處理字詞紀錄簿頁面');
		const bodyHTML = renderToString(StarredPageSSR());
		const html = generateHTMLWrapper('字詞紀錄簿', bodyHTML, lang, env);

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
			const html = generateHTMLWrapper(fixedText, bodyHTML, lang, env);

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
			const html = generateHTMLWrapper(fixedText, bodyHTML, lang, env);

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
		const html = generateHTMLWrapper(fixedText, bodyHTML, lang, env);

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
function requireAssetBaseUrl(env: Env): string {
	const base = env.ASSET_BASE_URL;
	if (!base || !base.trim()) {
		throw new Error('未設定 ASSET_BASE_URL，請於 wrangler.jsonc 的 vars.ASSET_BASE_URL 指定公開端點');
	}
	return base.replace(/\/$/, '');
}

function generateAboutHTMLWrapper(bodyHTML: string, env: Env): string {
	// R2 公開端點（由環境變數提供）
	const R2_ENDPOINT = requireAssetBaseUrl(env);

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
	<link rel="shortcut icon" type="image/x-icon" href="${R2_ENDPOINT}/favicon.ico?v=20251016">
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
		const bodyHTML = renderToString(AboutPage({ assetBaseUrl: requireAssetBaseUrl(env) }));
		const html = generateAboutHTMLWrapper(bodyHTML, env);

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
function generateHTMLWrapper(text: string, bodyHTML: string, lang: DictionaryLang, env: Env): string {
	const title = TITLE_OF[lang];
	const pageTitle = `${text} - ${title}萌典`;

	// R2 公開端點（由環境變數提供）
	const R2_ENDPOINT = requireAssetBaseUrl(env);

	return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>${escapeHtml(pageTitle)}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=IE9">


	<!-- 處理 # 路由和首頁重定向的前端腳本 -->
	<script>
		// 全域 LRU 記錄函數（優先定義，供所有腳本使用）
		var addToLRU = (function() {
			// 儲存瀏覽歷史到 localStorage
			return function(word, lang) {
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
			};
		})();

		// 過濾和清理字詞的輔助函數
		function shouldRecordWord(word) {
			// 過濾掉空白
			if (!word || word === '') return false;

			if (word === '#') return false;

			// 過濾掉 about 頁面
			if (word === 'about.html' || word.startsWith('about')) return false;

			// 過濾掉字詞紀錄簿和其他特殊路由（以 = 或 @ 開頭）
			if (word === '=*' || word.startsWith('=') || word.startsWith('@')) return false;

			// 過濾掉包含斜線的路徑（通常是多層路徑，不是字詞）
			if (word.includes('/')) return false;

			// 過濾掉副檔名（.html, .json, .png 等）
			if (/\.(html|json|png|jpg|jpeg|gif|svg|css|js)$/i.test(word)) return false;

			return true;
		}

		// 統一處理 hash 路由和首頁重定向
		(function() {
			// 導向收藏頁的 hash 處理：攔截 #=* 並改為 /=*
			(function(){
				function goStarred(){ if (window.location.pathname !== '/=*') { window.location.href = '/=*'; } }
				function handleHashStar(){ if (window.location.hash === '#=*') { try { history.replaceState(null, '', '/=*'); } catch(_e) {} goStarred(); } }
				document.addEventListener('click', function(e){
					var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
					if (!a) return;
					try {
						var href = a.getAttribute('href');
						var u = new URL(href, window.location.href);
							if (u.hash === '#=*') { e.preventDefault(); goStarred(); return; }
							// 部首表快捷：#@ -> /@，#~@ -> /~@
							if (u.hash === '#@') { e.preventDefault(); window.location.href = '/@'; return; }
							if (u.hash === '#~@') { e.preventDefault(); window.location.href = '/~@'; return; }
					} catch(_url){}
				});
				window.addEventListener('hashchange', handleHashStar);
				if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', handleHashStar, { once: true }); } else { handleHashStar(); }
			})();
			if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
				// 優先處理 hash 路由
				if (window.location.hash && window.location.hash !== '#') {
					var hash = window.location.hash.substring(1); // 移除 # 符號
					if (hash) {
						try {
							// URL 解碼
							var decodedHash = decodeURIComponent(hash);

							// 判斷語言: 開頭是 "'" → 台語 (t)
							//          開頭是 ':' → 客語 (h)
							//          開頭是 '~' → 兩岸 (c)
							//          無前綴      → 華語 (a)
							var lang, cleanWord;
							if (decodedHash.startsWith("'")) {
								lang = 't';
								cleanWord = decodedHash.slice(1);
							} else if (decodedHash.startsWith(':')) {
								lang = 'h';
								cleanWord = decodedHash.slice(1);
							} else if (decodedHash.startsWith('~')) {
								lang = 'c';
								cleanWord = decodedHash.slice(1);
							} else {
								lang = 'a';
								cleanWord = decodedHash;
							}

							// 在重定向之前先記錄到 localStorage，避免重定向後無法記錄
							if (shouldRecordWord(cleanWord)) {
								addToLRU(cleanWord, lang);
							}
						} catch (_err) {}

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
				try {
					var url = new URL(link.href);
					var word = '';

					// 必須是同源連結
					if (url.origin !== window.location.origin) {
						return;
					}

					// 判斷是 pathname 變化還是 hash 變化
					var isHashChange = (url.pathname === window.location.pathname) && url.hash;

					if (isHashChange) {
						// Hash 路由：提取 hash 中的字詞（移除 # 符號）
						word = url.hash.substring(1); // 移除開頭的 #
						word = decodeURIComponent(word); // URL 解碼
					} else if (url.pathname !== window.location.pathname) {
						// Pathname 路由：提取 pathname 中的字詞
						word = url.pathname.replace(/^\\//, '');
					} else {
						// 既沒有 pathname 變化，也沒有 hash，不記錄
						return;
					}

					// 移除語言前綴符號（'、!、:、~）
					var cleanWord = word.replace(/^['!:~]/, '');

					// 使用統一的過濾函數檢查是否應該記錄
					if (shouldRecordWord(cleanWord)) {
						addToLRU(cleanWord, 'a'); // 預設華語
					}
				} catch (_err) {
					// 解析 URL 失敗，忽略
				}
			}
		});
		})();

		// 星號（收藏）功能與 LocalStorage 儲存機制，含詳細 debug log
		(function(){
			var LOG_PREFIX = '[Star]';

			// 輔助函式：統一 log 格式
			function log(){
				try {
					console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
				} catch(_e) {}
			}
			function warn(){
				try {
					console.warn.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
				} catch(_e) {}
			}

			// 從 DOM 的 class 取得當前語言
			function getLang(){
				try {
					var m = document.documentElement.className.match(/lang-([atch])/);
					return (m && m[1]) || 'a';
				} catch(_e){
					return 'a';
				}
			}

			// 移除 HTML 標籤，保留純文字
			function stripHtml(str){
				try {
					var div = document.createElement('div');
					div.innerHTML = str || '';
					return div.textContent || div.innerText || '';
				} catch(_e){
					// fallback: 簡單正則
					return (str || '').replace(/<[^>]*>/g, '');
				}
			}

			// LocalStorage 存取（安全包裹）
			function lsGet(key){
				try {
					return localStorage.getItem(key);
				} catch(_e){
					warn('lsGet error', key, _e);
					return null;
				}
			}
			function lsSet(key, val){
				try {
					localStorage.setItem(key, val);
				} catch(_e){
					warn('lsSet error', key, _e);
				}
			}

			// 請手動修理這裡
			// 統一收藏項目的字串格式："字詞"反斜線n（以文字 反斜線n 作為分隔）
			function buildStarKey(word){
				return ('"' + word + '"' + decodeURIComponent('%5C') + 'n');
			}

			// 確保 starred-{lang} 存在
			function ensureStarred(lang){
				var k = 'starred-' + lang;
				var v = lsGet(k);
				if (v == null) {
					lsSet(k, '');
					v = '';
				}
				return v;
			}

			// 檢查字詞是否已收藏
			function hasStar(lang, word){
				var data = ensureStarred(lang) || '';
				var hit = data.indexOf(buildStarKey(word)) >= 0;
				log('hasStar?', { lang: lang, word: word, hit: hit });
				return hit;
			}

			// 加入收藏
			function addStar(lang, word){
				var k = 'starred-' + lang;
				var cur = ensureStarred(lang) || '';
				if (cur.indexOf(buildStarKey(word)) >= 0) {
					log('addStar skip (already exists)', { lang: lang, word: word });
					return;
				}
				var next = buildStarKey(word) + cur;
				lsSet(k, next);
				log('addStar ok', { lang: lang, word: word, len: next.length });
			}

			// 移除收藏
			function removeStar(lang, word){
				var k = 'starred-' + lang;
				var cur = ensureStarred(lang) || '';
				var next = cur.split(buildStarKey(word)).join('');
				lsSet(k, next);
				log('removeStar ok', { lang: lang, word: word, len: next.length });
			}

			// 更新星號圖示狀態
			function updateStarIcon(el, isStarred){
				try {
					if (isStarred) {
						el.classList.remove('icon-star-empty');
						el.classList.add('icon-star');
						el.setAttribute('title', '已加入記錄簿');
					} else {
						el.classList.remove('icon-star');
						el.classList.add('icon-star-empty');
						el.setAttribute('title', '加入字詞記錄簿');
					}
				} catch(_e) {
					warn('updateStarIcon error', _e);
				}
			}

			// 初始化所有星號圖示
			function initStarIcons(){
				try {
					var lang = getLang();
					var stars = document.querySelectorAll('.result .entry .star');
					log('initStarIcons', { count: stars.length, lang: lang });

					for (var i = 0; i < stars.length; i++) {
						var el = stars[i];
						var rawWord = (el.getAttribute('data-word') || '').trim();
						if (!rawWord) { continue; }

						// 清理 HTML 標籤
						var word = stripHtml(rawWord);
						if (!word) { continue; }

						var starred = hasStar(lang, word);
						updateStarIcon(el, starred);
					}
				} catch(_e) {
					warn('initStarIcons error', _e);
				}
			}

			// 頁面載入後初始化
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', function(){
					log('DOMContentLoaded');
					initStarIcons();
				});
			} else {
				log('DOM already loaded');
				initStarIcons();
			}

			// 監聽星號點擊事件（使用事件委派）
			document.addEventListener('click', function(e){
				var el = e.target && e.target.closest ? e.target.closest('.result .entry .star') : null;
				if (!el) { return; }

				try {
					e.preventDefault();
					var lang = getLang();
					var rawWord = (el.getAttribute('data-word') || '').trim();

					// 清理 HTML 標籤，確保只儲存純文字
					var word = stripHtml(rawWord);
					log('star click', { lang: lang, rawWord: rawWord, cleanWord: word });

					if (!word) {
						warn('empty word on star click (after strip)');
						return;
					}

					// 切換收藏狀態
					var isNowStarred = !el.classList.contains('icon-star');
					if (isNowStarred) {
						addStar(lang, word);
					} else {
						removeStar(lang, word);
					}
					updateStarIcon(el, isNowStarred);

					// 導航列按鈕提示動畫（若存在）
					try {
						var navBtn = document.querySelector('#btn-starred a');
						if (navBtn) {
							var origBg = navBtn.style.background;
							navBtn.style.background = '#ddd';
							setTimeout(function(){
								navBtn.style.background = origBg;
							}, 150);
						}
					} catch(_e) {}

					log('star toggled', { lang: lang, word: word, starred: isNowStarred });
				} catch(err) {
					warn('star click error', err);
				}
			});
		})();
	</script>

	<!-- 原專案 CSS -->
	<link rel="stylesheet" href="${R2_ENDPOINT}/styles.css">
	<link rel="stylesheet" href="${R2_ENDPOINT}/css/cupertino/jquery-ui-1.10.4.custom.css">

	<!-- 圖標和搜尋 -->
	<link rel="apple-touch-icon" href="${R2_ENDPOINT}/images/icon.png">
	<link rel="shortcut icon" type="image/x-icon" href="${R2_ENDPOINT}/favicon.ico?v=20251016">
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

		/* 主字標題樣式 - 基於原專案 */
		h1.title {
			font-family: "Biaodian Pro Serif CNS", "Numeral LF Serif", "MOEDICT", "Fira Sans OT", "Georgia", "Times New Roman", "Zhuyin Kaiti", "TW-Kai-98_1", "教育部標準楷書", "kai-pc", "CMEXc1", "BiauKai", "MOEDICT-IOS-KAI", "DFKaiShu-SB-Estd-BF", "全字庫正楷體", "Kaiti TC", "楷體-繁", "文鼎ＰＬ新中楷", "cwText 楷書", cursive, serif, "HanaMinA", "HanaMinB", "HAN NOM A", "HAN NOM B", "Han Kaiti CNS", cursive, serif;
			font-size: 200%;
			line-height: 2;
			font-weight: 501;
			margin: -0.25em 0 0.5em;
			padding-bottom: 0.3em;
			border-bottom: 1px dotted #ccc;
			visibility: visible !important;
		}

		/* Tooltip 主字樣式修復 - 對齊主頁面樣式 */
		.ui-tooltip .title .h1,
		.ui-tooltip .title h1 {
			font-family: "Biaodian Pro Serif CNS", "Numeral LF Serif", "MOEDICT", "Fira Sans OT", "Georgia", "Times New Roman", "Zhuyin Kaiti", "TW-Kai-98_1", "教育部標準楷書", "kai-pc", "CMEXc1", "BiauKai", "MOEDICT-IOS-KAI", "DFKaiShu-SB-Estd-BF", "全字庫正楷體", "Kaiti TC", "楷體-繁", "文鼎ＰＬ新中楷", "cwText 楷書", cursive, serif, "HanaMinA", "HanaMinB", "HAN NOM A", "HAN NOM B", "Han Kaiti CNS", cursive, serif !important;
			font-size: 30px !important;
			line-height: 2 !important;
			font-weight: 501 !important;
			margin: -0.25em 0 0.5em !important;
			padding-bottom: 0.3em !important;
			border-bottom: none !important;
			visibility: visible !important;
		}

		/* Tooltip 超連結樣式修復 - 對齊主字樣式 */
		.ui-tooltip .title .h1 a,
		.ui-tooltip .title h1 a {
			color: #000 !important;
			text-decoration: none !important;
			font-family: inherit !important;
		}

		.ui-tooltip .title .h1 a:hover,
		.ui-tooltip .title h1 a:hover {
			color: #000 !important;
			text-decoration: none !important;
			background-color: #ddd !important;
			border-radius: 4px !important;
		}

		/* hruby 基礎樣式（對齊原專案 _hruby.sass/_optimise-ruby.sass） */
		hruby { display: inline; line-height: 2; }
		hruby rp { display: none; }
		hruby ru { position: relative; display: inline-block; text-indent: 0; }
		hruby ru[annotation] > rt { display: inline-block; height: 0; width: 0; font: 0/0 hidden-text; }
		hruby ru:before, hruby zhuyin { position: absolute; display: inline-block; transform: scale(.55); }
		hruby ru[annotation] { text-align: center; }
		hruby ru[annotation]:before { left: -265%; top: -.5em; height: 1em; width: 600%; content: attr(annotation); line-height: 1; text-align: center; text-indent: 0; color: #666; font-family: "Noto Sans", Geneva, "Segoe UI", "MOEDICT", "Fira Sans OT", "Helvetica Neue", Helvetica, Arial !important; }
		hruby[rightangle] ru[annotation]:before { left: -250%; }
		hruby ru[zhuyin] { display: inline-block; position: relative; width: 1.8em; text-align: left; }
		hruby ru[zhuyin] zhuyin { right: .2em; top: 0; height: 2.7em; width: .8em; line-height: .9; white-space: pre-wrap; word-break: break-all; color: #666; font-family: MOEDICT, 'Zhuyin Kaiti', cursive, serif !important; }
		hruby ru[zhuyin] diao { position: absolute; right: -.9em; top: 0; display: inline-block; width: 1em; color: #666; font-family: MOEDICT, 'Zhuyin Kaiti', cursive, serif !important; }
		hruby ru[zhuyin][length='1'] zhuyin { margin-top: .125em; }
		hruby ru[zhuyin][length='1'] diao { margin-top: -.35em; }
		hruby ru[zhuyin][length='2'] zhuyin { margin-top: -.175em; }
		hruby ru[zhuyin][length='2'] diao { margin-top: .5em; }
		hruby ru[zhuyin][length='3'] zhuyin { margin-top: -.45em; }
		hruby ru[zhuyin][length='3'] diao { margin-top: 1.3em; }

		/* 注音和拼音樣式 - 基於原專案 */
		.bopomofo {
			display: table;
			margin-top: -14px;
			padding-bottom: 5px;
			margin-right: 24px;
			margin-bottom: 10px;
			color: #666;
			font-size: 90%;
			width: 100%;
			border-bottom: 1px dotted #ccc;
			word-break: normal !important;
			padding-right: 34px;
		}

		/* 部首與筆畫樣式（複刻原專案視覺） */
		.radical {
			display: inline-block;
			margin: 8px 0 6px 0;
			margin-right: 12px;
			vertical-align: middle;
		}
		.radical .glyph {
			display: inline-block;
			background-color: #6B0000; /* 深紅底 */
			color: #ffffff;            /* 白字 */
			border-radius: 4px;
		}
		.radical .glyph a { color: #ffffff; text-decoration: none; }
		.radical .glyph a:hover { text-decoration: none; background-color: #5a0000; border-radius: 4px; }
		.radical .count {
			display: inline-block;
			margin-left: 8px;
			color: #000;               /* 黑字 */
			background: transparent;   /* 無底色 */
			font-weight: 500;
		}
		.radical .sym {
			margin: 0 4px;
		}

		/* 播放按鈕樣式（複刻原專案 _result.scss 和 _font-awesome.scss） */
		.part-of-speech.playAudio {
			/* 原專案：紅色圖示、白色底、無邊框 */
			color: #6B0000;
			background: transparent;
			font-size: 90%;
			padding: 0;
			cursor: pointer;
			line-height: 100%;
			display: inline-block;
		}

		.audioBlock {
			display: inline-block;
			margin-top: 10px;
			font-size: 70% !important;
		}

		.audioBlock.playing {
		/* 無邊框 */
			border: none !important;
			margin-left: 0 !important;
    		padding-left: 0 !important;
    		padding-right: 0 !important;
		}

		.playAudio {
			margin-left: 5px;
			color: #6B0000;
			font-size: 70%;
			padding-left: 5px;
			display: inline-block !important;
		}

		/* Font Awesome 圖示樣式 */
		.icon-play:before {
			content: "\f04b";
		}

		.icon-pause:before {
			content: "\f04c";
		}

		.icon-stop:before {
			content: "\f04d";
		}

		/* 不使用 spinner，直接切換成 stop */

		/* FontAwesome 字體定義 */
		@font-face {
			font-family: 'FontAwesome';
			src: url('${R2_ENDPOINT}/fonts/fontawesome-webfont.eot?v=3.2.1');
			src: url('${R2_ENDPOINT}/fonts/fontawesome-webfont.eot?#iefix&v=3.2.1') format('embedded-opentype'),
				 url('${R2_ENDPOINT}/fonts/fontawesome-webfont.woff?v=3.2.1') format('woff'),
				 url('${R2_ENDPOINT}/fonts/fontawesome-webfont.ttf?v=3.2.1') format('truetype'),
				 url('${R2_ENDPOINT}/fonts/fontawesome-webfont.svg#fontawesomeregular?v=3.2.1') format('svg');
			font-weight: normal;
			font-style: normal;
		}

		/* 基礎圖示樣式 */
		[class^="icon-"]:before,
		[class*=" icon-"]:before {
			font-family: FontAwesome;
			font-weight: normal;
			font-style: normal;
			text-decoration: inherit;
			-webkit-font-smoothing: antialiased;
			*margin-right: .3em;
		}

		/* 旋轉動畫（用於 spinner） */
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}

		.icon-spinner:before {
			animation: spin 1s linear infinite;
		}

		.bopomofo .part-of-speech {
			margin: 0px 5px 0 5px;
		}

		.bopomofo .bopomofo {
			font-family: "MOESongUN", "教育部標準宋體UN", "全字庫正宋體", "TW-Sung-98_1", "教育部標準宋體", "CMEXa1", "新細明體", "PMingLiU", "MingLiU", "全字庫正楷體", "TW-Kai-98_1", "教育部標準楷書", "kai-pc", "CMEXc1", "標楷體", "BiauKai", "DFKaiShu-SB-Estd-BF", sans-serif, "HANNOMmoesubset-Regular", "HAN NOM A", "HAN NOM B";
			font-weight: 501;
			display: inline-block;
			word-break: normal !important;
		}

		.bopomofo .pinyin {
			font-family: "Noto Sans", Geneva, "Segoe UI", "MOEDICT", "Fira Sans OT", "Helvetica Neue", Helvetica, Arial !important;
			display: inline-block;
			word-break: normal !important;
		}

		.bopomofo .tone {
			position: relative;
			float: right;
			left: 10px;
			top: -6px;
			font-size: 120%;
		}

		.bopomofo .main-pronunciation {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.bopomofo .alternative {
			display: block;
			margin-top: 5px;
			font-size: 85%;
			color: #888;
		}

		.bopomofo .alternative .bopomofo,
		.bopomofo .alternative .pinyin {
			margin-right: 10px;
		}

		.bopomofo.cn-specific {
			background: #eeeeff;
			border-radius: 10px;
			padding-top: 3px;
			border-top: 5px solid white;
		}

		.bopomofo.cn-specific .cn-specific {
			border-top: 1px solid #eee;
		}

		/* 又音標記 */
		.youyin {
			font-size: 80%;
			color: #888;
			margin-left: 10px;
		}

		/* 標題區塊 */
		.title-section {
			display: flex;
			align-items: center;
			margin-bottom: 10px;
		}

		/* 手機版調整 */
		@media (max-width: 767px) {
			body {
				padding-top: 0; /* 手機版不需要 padding-top */
			}

			.nav-bg {
				position: static; /* 手機版導航列不固定 */
			}

			.bopomofo {
				margin-right: 0;
				padding-right: 10px;
			}

			.bopomofo .main-pronunciation {
				flex-direction: column;
				align-items: flex-start;
				gap: 5px;
			}
		}
	</style>

		<script>
		// 提前在 <head> 內定義全域播放函式，確保 inline onclick 可用
		(function(){
			var player = null, playing = null, seq = 0;
			function canPlay(type){
				var a = document.createElement('audio');
				try { return !!(a.canPlayType && a.canPlayType(type).replace(/no/, '')); } catch(e) { return false; }
			}
			function canPlayMp3(){ return canPlay('audio/mpeg;'); }
			function getEl(){ return document.getElementById('player-' + seq); }
			window.stopAudio = function(){
				var $el = getEl();
				if ($el) {
					$el.classList.remove('icon-stop');
					$el.classList.remove('icon-spinner');
					$el.classList.add('icon-play');
					var block = $el.closest('.audioBlock');
					if (block) {
						block.classList.remove('playing');
					}
				}
				if (player) {
					try { player.unload && player.unload(); player.stop && player.stop(); } catch(_e) {}
				}
				player = null; playing = null;
			};
			window.playAudio = function(el, url){
				function done(){ window.stopAudio(); }
				function play(){
					var $el = getEl();
					if (playing === url) {
						if ($el && $el.classList.contains('icon-stop')) { window.stopAudio(); done(); }
						return;
					}
					window.stopAudio();
					seq++;
					el.id = 'player-' + seq;
					$el = getEl();
					playing = url;
					var block = $el && $el.closest('.audioBlock');
					if ($el) {
						$el.classList.remove('icon-play');
						$el.classList.add('icon-stop');
					}
					if (block) {
						block.classList.add('playing');
					}
					var urls = [url];
					if (/ogg$/.test(url) && canPlayMp3() && !/Gecko\\//.test(navigator.userAgent)) {
						urls.unshift(url.replace(/ogg$/, 'mp3'));
					}
					function onend(){ done(); }
					function onloaderror(){ done(); }
					function onplay(){ if ($el) { $el.classList.remove('icon-play'); $el.classList.remove('icon-spinner'); $el.classList.add('icon-stop'); } }
					if (window.Howl) {
						player = new window.Howl({ html5: true, src: urls, onend: onend, onloaderror: onloaderror, onplay: onplay });
						player.play();
					} else {
						var s = document.createElement('script'); s.src = '${R2_ENDPOINT}/js/howler.min.js'; s.onload = function(){
							player = new window.Howl({ html5: true, src: urls, onend: onend, onloaderror: onloaderror, onplay: onplay });
							player.play();
						}; document.head.appendChild(s);
					}
				}
				if (document.readyState === 'loading') {
					document.addEventListener('DOMContentLoaded', play, { once: true });
				} else {
					play();
				}
			};

			// 簡單的全域委派（點擊任何 .playAudio）
			document.addEventListener('click', function(e) {
				var elc = e.target && e.target.closest ? e.target.closest('.playAudio') : null;
				if (elc) {
					var meta = elc.querySelector && elc.querySelector('meta[itemprop="contentURL"]');
					if (meta) {
						var url = meta.getAttribute('content');
						window.playAudio(elc, url);
					}
				}
			});
		})();
		</script>

		<!-- 文字簡介框（Tooltip） - 複刻原專案行為，使用本專案端點載入內容 -->
		<script>
		(function(){
		  console.log('[Tooltip] init');
		  var tooltipEl = null;
		  var cache = Object.create(null);
		  var showTimer = null, hideTimer = null;
		  function createTooltip(){
		    if (!tooltipEl) {
		      tooltipEl = document.createElement('div');
		      tooltipEl.className = 'ui-tooltip prefer-pinyin-true';
		      tooltipEl.style.position = 'absolute';
		      tooltipEl.style.display = 'none';
		      tooltipEl.style.zIndex = '9999';
		      document.body.appendChild(tooltipEl);
		      try { console.log('[Tooltip] tooltip element created and appended'); } catch(_l) {}
		      // 防抖：滑入 tooltip 時不要隱藏；滑出時延遲隱藏
		      tooltipEl.addEventListener('mouseenter', function(){
		        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
		        try { console.log('[Tooltip] mouseenter tooltip'); } catch(_l) {}
		      });
		      tooltipEl.addEventListener('mouseleave', function(){
		        if (hideTimer) { clearTimeout(hideTimer); }
		        hideTimer = setTimeout(function(){ if (tooltipEl) { tooltipEl.style.display = 'none'; try { console.log('[Tooltip] hide tooltip (leave tooltip)'); } catch(_l) {} } }, 120);
		        try { console.log('[Tooltip] mouseleave tooltip'); } catch(_l) {}
		      });
		    }
		    return tooltipEl;
		  }
		  function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }
		  function positionNear(x, y){
		    var el = createTooltip();
		    var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
		    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
		    var w = el.offsetWidth || 300;
		    var h = el.offsetHeight || 150;
		    var nx = clamp(x + 12, 8, vw - w - 8);
		    var ny = clamp(y + 12, 8, vh - h - 8);
		    el.style.left = nx + 'px';
		    el.style.top = ny + 'px';
		    try { console.log('[Tooltip] positioned at', nx, ny, 'size', w, h); } catch(_l) {}
		  }
		  function normalizeHref(href){
		    try { href = String(href || ''); } catch(_){ href = ''; }
		    return href.replace(/^(\\\.\\\/)?#?['!:~]?/, '');
		  }
		  function fetchTooltip(id, cb){
		    if (!id) return;
		    if (cache[id]) { try { console.log('[Tooltip] cache hit', id); } catch(_l) {} cb(cache[id]); return; }
		    try {
		      var u = new URL(window.location.href);
		      u.searchParams.set('tooltip', '1');
		      u.searchParams.set('id', id);
		      var url = u.toString();
		      try { console.log('[Tooltip] fetch', id, url); } catch(_l) {}
		      fetch(url, { headers: { 'Accept': 'text/html' } })
		        .then(function(r){ return r.text(); })
		        .then(function(html){ cache[id] = html; try { console.log('[Tooltip] fetched', id, 'len', (html||'').length); } catch(_l) {} cb(html); })
		        .catch(function(err){ try { console.log('[Tooltip] fetch error', err); } catch(_l) {} });
		    } catch(err) { try { console.log('[Tooltip] build url error', err); } catch(_l) {} }
		  }
		  document.addEventListener('mouseover', function(ev){
		    console.log('[Tooltip] mouseover');
		    var a = ev.target && ev.target.closest ? ev.target.closest('.result a[href]:not(.xref)') : null;

		    if (!a) { try { console.log('[Tooltip] no anchor, skip'); } catch(_l) {} return; }
		    try { console.log('[Tooltip] mouseover anchor', a.getAttribute('href')); } catch(_l) {}
		    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
		    if (showTimer) { clearTimeout(showTimer); }
		    var x = ev.pageX, y = ev.pageY;
		    showTimer = setTimeout(function(){
		      var rawHref = a.getAttribute('href');
		      try { console.log('[Tooltip] raw href', rawHref); } catch(_l) {}
		      var id = normalizeHref(rawHref);
		      try { console.log('[Tooltip] normalized id', id); } catch(_l) {}
		      if (!id) { try { console.log('[Tooltip] empty id, skip'); } catch(_l) {} return; }
		      try { console.log('[Tooltip] id ok, proceed'); } catch(_l) {}
		      var el = createTooltip();
		      // 先顯示載入中，讓使用者看到提示框
		      el.innerHTML = '<div class="entry"><div class="entry-item"><div class="def">載入中…</div></div></div>';
		      el.style.display = 'block';
		      try { console.log('[Tooltip] display loading'); } catch(_l) {}
		      positionNear(x, y);
		      fetchTooltip(id, function(html){
		        el.innerHTML = html || '';
		        el.style.display = 'block';
		        try { console.log('[Tooltip] content set and shown'); } catch(_l) {}
		        positionNear(x, y);
		      });
		    }, 100);
		  });
		  document.addEventListener('mouseout', function(ev){
		    console.log('[Tooltip] mouseout');
		    var from = ev.target && ev.target.closest ? ev.target.closest('.result a[href]:not(.xref)') : null;
		    if (!from && ev.target && ev.target.closest) {
		      var anyFrom = ev.target.closest('a[href]');
		      if (anyFrom && anyFrom.closest && anyFrom.closest('.result')) {
		        from = anyFrom;
		        try { console.log('[Tooltip] fallback from anchor', from.getAttribute('href')); } catch(_l) {}
		      }
		    }
		    // 若移入 tooltip，則不要隱藏
		    var toTooltip = ev.relatedTarget && ev.relatedTarget.closest ? ev.relatedTarget.closest('.ui-tooltip') : null;
		    if (toTooltip) { try { console.log('[Tooltip] moving into tooltip, keep shown'); } catch(_l) {} return; }
		    if (!from) return;
		    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
		    if (hideTimer) { clearTimeout(hideTimer); }
		    hideTimer = setTimeout(function(){ if (tooltipEl) { tooltipEl.style.display = 'none'; try { console.log('[Tooltip] hide tooltip'); } catch(_l) {} } }, 100);
		  });
		})();
		</script>

		<!-- 翻譯朗讀（TTS）事件委派：複刻原專案行為，僅在支援時啟用 -->
		<script>
		(function(){
		  function handleClick(e){
		    var el = e.target && e.target.closest ? e.target.closest('.fw_def') : null;
		    if (!el) return;
		    try {
		      var syn = window.speechSynthesis;
		      var Utter = window.SpeechSynthesisUtterance;
		      if (!syn || !Utter) return; // 靜默降級
		      var label = el.getAttribute('data-label') || '英';
		      var text = el.getAttribute('data-text') || '';
		      if (!text) return;
		      // 與 src/tts-utils.ts 的 getLanguageCode 對應
		      var langMap = { '英': 'en-US', '法': 'fr-FR', '德': 'de-DE' };
		      var u = new Utter(text);
		      u.lang = langMap[label] || 'en-US';
		      u.volume = 1.0; u.rate = 1.0;
		      function pickFrVoice(voices){
		        try {
		          voices = voices || [];
		          var fr = voices.filter(function(v){ return v && v.lang && String(v.lang).toLowerCase().indexOf('fr') === 0; });
		          // 1) 優先 Google français
		          var google = fr.find(function(v){ return (v.name||'').toLowerCase().indexOf('google') >= 0 && String(v.lang).toLowerCase() === 'fr-fr'; });
		          if (google) return google;
		          // 2) 其次任何 fr-FR
		          var frfr = fr.find(function(v){ return String(v.lang).toLowerCase() === 'fr-fr'; });
		          if (frfr) return frfr;
		          // 3) 再退 fr-CA
		          var frca = fr.find(function(v){ return String(v.lang).toLowerCase() === 'fr-ca'; });
		          if (frca) return frca;
		          // 4) 任一 fr*
		          return fr[0] || null;
		        } catch(_pf) { return null; }
		      }
		      function pickEnVoice(voices){
		        try {
		          voices = voices || [];
		          var en = voices.filter(function(v){ return v && v.lang && String(v.lang).toLowerCase().indexOf('en') === 0; });
		          // 避免較差音色的候選（如 Compact/Fred 等）
		          en = en.filter(function(v){ var nm = (v.name||'').toLowerCase(); return nm.indexOf('compact') < 0 && nm !== 'fred'; });
		          // 優先序（macOS 常見）：Samantha, Alex，其次 en-US，再退 en-GB / en-AU / 其他 en*
		          var prefName = en.find(function(v){ var nm=(v.name||'').toLowerCase(); return nm.indexOf('samantha')>=0; })
		                    || en.find(function(v){ var nm=(v.name||'').toLowerCase(); return nm.indexOf('alex')>=0; });
		          if (prefName) return prefName;
		          var enus = en.find(function(v){ return String(v.lang).toLowerCase() === 'en-us'; });
		          if (enus) return enus;
		          var engb = en.find(function(v){ return String(v.lang).toLowerCase() === 'en-gb'; });
		          if (engb) return engb;
		          var enau = en.find(function(v){ return String(v.lang).toLowerCase() === 'en-au'; });
		          if (enau) return enau;
		          return en[0] || null;
		        } catch(_pe) { return null; }
		      }
		      // 針對法文：選擇適合的 voice
		      if (label === '法') {
		        try {
		          var voices = [];
		          try { voices = syn.getVoices ? syn.getVoices() : []; } catch(_gv) { voices = []; }
		          if (!voices || !voices.length) {
		            try {
		              window.speechSynthesis.onvoiceschanged = function(){
		                try {
		                  var vv = syn.getVoices ? syn.getVoices() : [];
		                  var chosen = pickFrVoice(vv);
		                  if (chosen) {
		                    try { syn.cancel(); } catch(_c) {}
		                    var u2 = new Utter(text);
		                    u2.lang = chosen.lang; u2.voice = chosen; u2.volume = 1.0; u2.rate = 1.0;
		                    syn.speak(u2);
		                  }
		                } catch(_vcl) {}
		              };
		            } catch(_ael) {}
		            return; // 等待 voiceschanged 後再播放
		          }
		          // 立即可用 voices：選擇 fr-* voice
		          var chosenNow = pickFrVoice(voices);
		          if (chosenNow) {
		            u.voice = chosenNow; u.lang = chosenNow.lang;
		          }
		        } catch(_vf) {}
		      }
		      // 針對英語（Firefox 上音色調整與 voice 選擇）
		      if (label === '英') {
		        try {
		          var isFirefox = navigator.userAgent.indexOf('Gecko/') >= 0 && navigator.userAgent.indexOf('Chrome/') < 0;
		          var voicesE = [];
		          try { voicesE = syn.getVoices ? syn.getVoices() : []; } catch(_gve) { voicesE = []; }
		          if (!voicesE || !voicesE.length) {
		            try {
		              window.speechSynthesis.onvoiceschanged = function(){
		                try {
		                  var vv = syn.getVoices ? syn.getVoices() : [];
		                  var chosenE = pickEnVoice(vv);
		                  if (chosenE) {
		                    try { syn.cancel(); } catch(_cE) {}
		                    var uE = new Utter(text);
		                    uE.lang = chosenE.lang; uE.voice = chosenE; uE.volume = 1.0; uE.rate = isFirefox ? 0.95 : 1.0; uE.pitch = isFirefox ? 1.02 : 1.0;
		                    syn.speak(uE);
		                  }
		                } catch(_vcle) {}
		              };
		            } catch(_aele) {}
		            return; // 等待 voiceschanged 後再播放
		          }
		          var chosenNowE = pickEnVoice(voicesE);
		          if (chosenNowE) { u.voice = chosenNowE; u.lang = chosenNowE.lang; }
		          if (isFirefox) { u.rate = 0.95; u.pitch = 1.02; }
		        } catch(_ve) {}
		      }
		      syn.speak(u);
		    } catch (err) {
		      // 靜默失敗
		    }
		  }
		  document.addEventListener('click', handleClick);
		})();
		</script>
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

/**
 * 將連結中的字詞 ID 正規化：去除語言前綴符號等
 */
function normalizeLinkId(raw: string): string {
  try {
    let id = String(raw || '');
    id = id.replace(/^['!:~]/, '');
    id = id.replace(/^\.(?:\/)?/, '');
    id = id.replace(/^#/, '');
    return id;
  } catch(_e) { return raw || ''; }
}

/**
 * 移除 HTML 標籤，保留純文字（複製自 preact-components.tsx）
 */
function untag(input: string): string {
	return input.replace(/<[^>]*>/g, '');
}

/**
 * 建立簡介框 HTML（盡量複刻原專案結構，但用現有資料）
 */
async function buildTooltipHTML(id: string, lang: DictionaryLang, env: Env): Promise<string> {
  try {
    // 先嘗試完整詞條
    const entry = await lookupDictionaryEntry(id, lang, env);
    if (entry) {
      // 使用已有的 Preact render 但以 Result 結構簡化會較大；這裡組裝精簡版
      const title = entry.title || id;
      const het = (entry.heteronyms && entry.heteronyms[0]) || {} as any;
      const defs = (het.definitions || []);

      // 依詞性分組（復刻原專案：groupBy('type', definitions)）
      const groupMap = new Map<string, any[]>();
      for (const d of defs as any[]) {
        const key = String((d && d.type) || '');
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(d);
      }

      function renderPosLabels(typeStr: string): string {
        if (!typeStr) return '';
        const labels = String(typeStr).split(',').map(s => s.trim()).filter(Boolean);
        if (!labels.length) return '';
        return labels
          .map(l => `<span class="part-of-speech">${escapeHtml(untag(l))}</span>`) // 紅底白字標籤（樣式已存在）
          .join('&nbsp;');
      }

      const groupedItemsHTML = Array.from(groupMap.entries()).map(([typeStr, list]) => {
        const posHTML = renderPosLabels(typeStr);
        const olHTML = (list as any[])
          .map(d => {
            const defText = escapeHtml(untag(String(d && d.def || '')));
            return `<li><p class="definition"><span class="def">${defText}</span></p></li>`;
          })
          .join('');
        return `<div class="entry-item">${posHTML ? posHTML : ''}<ol>${olHTML}</ol></div>`;
      }).join('');

      // 使用 decorateRuby 和 rightAngle 生成正確的注音拼音顯示
      const rubyData = decorateRuby({
        LANG: lang,
        title: title,
        bopomofo: het.bopomofo,
        pinyin: het.pinyin,
        trs: het.trs
      });

      // 生成標題 HTML，包含正確的 hruby 結構和超連結（對齊主頁面樣式）
      let titleHTML = '';
      if (rubyData.ruby) {
        const hruby = rightAngle(rubyData.ruby);
        titleHTML = `<span class="h1">${hruby}</span>`;
      } else {
        // 單字也要有超連結，對齊多字詞的表現
        titleHTML = `<span class="h1"><a href="./#${escapeHtml(title)}">${escapeHtml(title)}</a></span>`;
      }

      // 又音標記
      const youyinHTML = rubyData.youyin ? `<small class="youyin">${escapeHtml(untag(rubyData.youyin))}</small>` : '';

      return `
        <div class="title" data-title="${escapeHtml(title)}">
          ${titleHTML}
          ${youyinHTML}
        </div>
        <div class="entry">${groupedItemsHTML}</div>
      `;
    }
    // 若無完整詞條，嘗試單字/分字定義
    const def = await getDefinition(lang, id, env);
    if (def) {
      return `
        <div class="title" data-title="${escapeHtml(id)}">
          <a href="./#${escapeHtml(id)}">${escapeHtml(id)}</a>
        </div>
        <div class="entry">
          <div class="entry-item">
            <div class="def">${escapeHtml(untag(String(def)))}</div>
          </div>
        </div>
      `;
    }
  } catch(_e) {}
  // 找不到
  return `
    <div class="title" data-title="${escapeHtml(id)}">
      <a href="./#${escapeHtml(id)}">${escapeHtml(id)}</a>
    </div>
    <div class="entry">
      <div class="entry-item">
        <div class="def">找不到內容</div>
      </div>
    </div>
  `;
}
