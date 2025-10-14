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

			.navbar-fixed-top {
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
