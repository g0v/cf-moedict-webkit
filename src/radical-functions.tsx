import { renderToString } from 'preact-render-to-string';
import { Env } from './types';
import { NavbarComponent } from './components/navbar';
import { RadicalTable, RadicalBucket } from './views/radical-pages';
import { MainLayout } from './layouts';
import { RouteState } from './router/state';

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
	return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
	<meta charset="utf-8">
	<title>${escapeHtml(title)} - 部首表 - 萌典</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
	<link rel="stylesheet" href="${assetBaseUrl}/styles.css">
	<link rel="stylesheet" href="${assetBaseUrl}/css/cupertino/jquery-ui-1.10.4.custom.css">
</head>
<body>
${body}
</body>
</html>`;
}

export async function handleRadicalPageRequest(url: URL, env: Env): Promise<Response> {
	try {
		const assetBase = env.ASSET_BASE_URL?.replace(/\/$/, '') || '';
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


