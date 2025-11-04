import { renderToString } from 'preact-render-to-string';
import { Env } from './types';
import { NavbarComponent } from './components/navbar';
import { RadicalTable, RadicalBucket } from './views/radical-pages';
import { MainLayout } from './layouts';
import { RouteState } from './router/state';
import { buildRadicalTooltipHTML } from './radical-tooltip-html';

function requireDictionaryBaseUrl(env: Env): string {
	const base = env.DICTIONARY_BASE_URL;
	if (!base || !base.trim()) {
		throw new Error('未設定 DICTIONARY_BASE_URL，請於 wrangler.jsonc 的 vars.DICTIONARY_BASE_URL 指定公開端點');
	}
	return base.replace(/\/$/, '');
}

async function fetchJson(url: string): Promise<any> {
	const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
	if (!res.ok) throw new Error(`載入失敗: ${url} (${res.status})`);
	return await res.json();
}

function escapeHtml(text: string): string {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function wrapHtml(title: string, body: string, assetBaseUrl: string): string {
	const R2_ENDPOINT = assetBaseUrl;
	return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>${escapeHtml(title)} - 部首表 - 萌典</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
	<link rel="stylesheet" href="${R2_ENDPOINT}/styles.css">
	<link rel="stylesheet" href="${R2_ENDPOINT}/css/cupertino/jquery-ui-1.10.4.custom.css">
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

		/* 確保主內容區域不會被左側欄遮擋 */
		#main-content {
			margin-left: 260px;
		}

		/* 部首頁的內容區域 */
		.result {
			padding: 20px;
			max-width: 1200px;
			margin-left: 0; /* 移除 auto，改為 0，因為父容器已經有 margin-left */
			margin-right: auto;
		}

		@media only screen and (max-width: 767px) {
			#main-content {
				margin-left: 0; /* 手機版移除左側邊距 */
				margin-top: 55px;
			}
		}

		/* 左側欄（query-box）樣式 - 復刻原專案 */
		.query-box {
			width: 260px;
			position: fixed;
			border-right: 1px solid hsl(360, 1%, 83%);
			top: 45px;
			bottom: 0;
			z-index: 9;
			padding: 20px;
			box-sizing: border-box;
			background-color: hsl(0, 0%, 97%);
		}

		@media print {
			.query-box { display: none; }
		}

		@media only screen and (max-width: 767px) {
			/* 手機版：左側欄顯示在頂部橫向 */
			.query-box {
				right: auto !important;
				width: 100% !important;
				top: 40px !important;
				height: 65px !important;
				bottom: auto !important;
				padding: 15px !important;
				padding-bottom: 3px !important;
				z-index: 10 !important;
				border-right: none !important;
			}
		}

		/* 搜尋輸入框樣式 */
		.query-box input.query {
			display: block;
			border: 1px solid #ddd;
			font-size: 1.2em;
			width: 100%;
			height: 1.8em;
			box-sizing: border-box;
			padding: 4px 8px;
		}

		.query-box .search-form {
			width: 100%;
		}

		/* 隱藏搜尋輸入框的取消按鈕 */
		::-webkit-search-cancel-button {
			-webkit-appearance: none;
		}

		/* Autocomplete 選單樣式 - 復刻原專案 */
		.ui-autocomplete {
			overflow: auto;
			height: auto !important;
			position: fixed !important;
			box-sizing: border-box;
			background: #fff;
			border: 1px solid #ddd;
			border-radius: 4px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.15);
		}

		.ui-autocomplete ul {
			list-style: none;
			margin: 0;
			padding: 0;
		}

		.ui-autocomplete .ui-menu-item {
			padding: 8px 12px;
			cursor: pointer;
			border-bottom: 1px solid #eee;
		}

		.ui-autocomplete .ui-menu-item:hover {
			background: #f0f0f0;
		}

		@media only screen and (min-width: 768px) {
			.ui-autocomplete {
				top: 113px !important;
				bottom: auto !important;
				left: 19px !important;
				width: 221px !important;
				max-height: 80% !important;
			}
		}

		@media only screen and (max-width: 767px) {
			/* 手機版：autocomplete 顯示在搜尋框下方 */
			ul.ui-autocomplete {
				top: 100px !important;
				height: auto !important;
				max-height: 75% !important;
				left: 0 !important;
				width: 100% !important;
			}
		}
	</style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function handleRadicalPageRequest(url: URL, env: Env): Promise<Response> {
	try {
		const assetBase = env.ASSET_BASE_URL?.replace(/\/$/, '') || '';
		const tooltip = url.searchParams.get('tooltip');
		if (tooltip === '1') {
			const idParam = url.searchParams.get('id') || '';
			let decodedId = '';
			try {
				decodedId = decodeURIComponent(idParam);
			} catch (_e) {
				decodedId = idParam;
			}
			const normalizedId = decodedId.replace(/^\.(?:\/)?/, '').replace(/^\//, '').trim();
			const html = await buildRadicalTooltipHTML(normalizedId, env);
			if (html) {
				return new Response(html, {
					headers: { 'Content-Type': 'text/html; charset=utf-8' }
				});
			}
			const safeId = normalizedId || '@';
			const isTable = safeId === '@' || safeId === '~@';
			const isCrossStrait = safeId.startsWith('~@');
			let titleText = safeId;
			let href = '/@';
			if (isTable) {
				titleText = '部首表';
				href = isCrossStrait ? '/~@' : '/@';
			} else if (safeId.startsWith('~@')) {
				const radical = safeId.slice(2);
				titleText = `${radical} 部`;
				href = `/~@${encodeURIComponent(radical)}`;
			} else if (safeId.startsWith('@')) {
				const radical = safeId.slice(1);
				titleText = `${radical} 部`;
				href = `/@${encodeURIComponent(radical)}`;
			} else {
				titleText = safeId;
				href = `/${encodeURIComponent(safeId)}`;
			}
			const fallback = `<div class="title" data-title="${escapeHtml(titleText)}">` +
				`<span class="h1"><a href="${escapeHtml(href)}">${escapeHtml(titleText)}</a></span>` +
			`</div>` +
			`<div class="entry">` +
				`<div class="entry-item">` +
					`<div class="def">找不到內容</div>` +
				`</div>` +
			`</div>`;
			return new Response(fallback, {
				status: 404,
				headers: { 'Content-Type': 'text/html; charset=utf-8' }
			});
		}
		const dictBase = requireDictionaryBaseUrl(env);
		const decodedPathname = decodeURIComponent(url.pathname);
		const path = decodedPathname.replace(/^\//, '');
		const isCn = decodedPathname.startsWith('/~@');
		const langKey = isCn ? 'c' : 'a';
		// 資料正規化：允許 object 或一維陣列
		const normalizeRows = (raw: any): string[][] => {
			try {
				if (!raw) return [];
				if (typeof raw === 'object' && !Array.isArray(raw)) {
					const keys = Object.keys(raw).filter(k => /^\d+$/.test(k)).map(k => parseInt(k, 10));
					const max = keys.length ? Math.max(...keys) : -1;
					const rows: string[][] = [];
					for (let i = 0; i <= max; i++) {
						const row = raw[String(i)] || raw[i] || [];
						rows[i] = Array.isArray(row) ? row.filter(Boolean) : [];
					}
					return rows;
				}
				if (Array.isArray(raw) && raw.every((r: any) => Array.isArray(r) || r == null)) {
					return raw.map((r: any) => Array.isArray(r) ? r.filter(Boolean) : []);
				}
				if (Array.isArray(raw)) {
					return [raw.filter(Boolean)];
				}
				return [];
			} catch(_e) { return []; }
		};
		// /@ 或 /~@
		if (path === '@' || path === '~@') {
			const api = `${dictBase}/${langKey}/%40.json`;
			const raw = await fetchJson(api);
			const data = normalizeRows(raw); // [[radicals], ...] by strokes
			const initialRoute: RouteState = {
				view: 'radical',
				lang: langKey as any,
				source: 'path',
				raw: path,
				payload: { kind: 'table', isCrossStrait: isCn }
			};
			const body = renderToString(
				<MainLayout
					initialRoute={initialRoute}
					navbar={<NavbarComponent currentLang={langKey as any} />}
				>
					<RadicalTable data={Array.isArray(data) ? data : []} isCrossStrait={isCn} />
				</MainLayout>
			);
			return new Response(wrapHtml('部首表', body, assetBase), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
		}
		// /@{radical}
		const m = (isCn ? path.match(/^~@(.+)$/) : path.match(/^@(.+)$/));
		const radical = m ? decodeURIComponent(m[1]) : '';
		if (!radical) {
			return new Response('Not Found', { status: 404 });
		}
		const api = `${dictBase}/${langKey}/%40${encodeURIComponent(radical)}.json`;
		const raw = await fetchJson(api);
		const data = normalizeRows(raw); // [[chars], ...] by remaining strokes
		const initialRoute: RouteState = {
			view: 'radical',
			lang: langKey as any,
			source: 'path',
			raw: path,
			payload: { kind: 'bucket', radical, isCrossStrait: isCn }
		};
		const body = renderToString(
			<MainLayout
				initialRoute={initialRoute}
				navbar={<NavbarComponent currentLang={langKey as any} />}
			>
				<RadicalBucket radical={radical} data={Array.isArray(data) ? data : []} backHref={isCn ? '/~@' : '/@'} />
			</MainLayout>
		);
		return new Response(wrapHtml(`${radical} 部`, body, assetBase), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
	} catch (err: any) {
		const msg = err?.message || 'Internal Error';
		return new Response(`<pre>${escapeHtml(msg)}</pre>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
	}
}


