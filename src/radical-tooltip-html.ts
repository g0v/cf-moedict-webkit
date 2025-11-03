import { Env } from './types';

function escapeHtml(text: string): string {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function buildTitleSection(label: string, href: string): string {
	const safeLabel = escapeHtml(label);
	const safeHref = escapeHtml(href);
	return `<div class="title" data-title="${safeLabel}"><span class="h1"><a href="${safeHref}">${safeLabel}</a></span></div>`;
}

function normalizeRows(raw: any): string[][] {
	try {
		if (!raw) return [];
		if (typeof raw === 'object' && !Array.isArray(raw)) {
			const keys = Object.keys(raw)
				.filter((k) => /^\d+$/.test(k))
				.map((k) => parseInt(k, 10));
			const max = keys.length ? Math.max(...keys) : -1;
			const rows: string[][] = [];
			for (let i = 0; i <= max; i++) {
				const row = raw[String(i)] || raw[i] || [];
				rows[i] = Array.isArray(row) ? row.filter(Boolean) : [];
			}
			return rows;
		}
		if (Array.isArray(raw) && raw.every((r: any) => Array.isArray(r) || r == null)) {
			return raw.map((r: any) => (Array.isArray(r) ? r.filter(Boolean) : []));
		}
		if (Array.isArray(raw)) {
			return [raw.filter(Boolean)];
		}
		return [];
	} catch (_e) {
		return [];
	}
}

export async function buildRadicalTooltipHTML(id: string, env: Env): Promise<string | null> {
	try {
		const dictBase = env.DICTIONARY_BASE_URL?.replace(/\/$/, '');
		if (!dictBase) return null;

		const rawId = String(id || '').trim();
		if (!rawId) return null;
		const path = rawId.replace(/^\//, '');
		const isCn = path.startsWith('~@');
		const langKey = isCn ? 'c' : 'a';

		// 部首表本身
		if (path === '@' || path === '~@') {
			const api = `${dictBase}/${langKey}/%40.json`;
			const raw = await fetch(api, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null));
			if (!raw) return null;
			const data = normalizeRows(raw);
			const title = buildTitleSection('部首表', isCn ? '/~@' : '/@');
			let html = `${title}<div class="entry"><div class="entry-item"><div style="max-height: 300px; overflow-y: auto;">`;
			for (let i = 0; i < data.length; i++) {
				const radicals = data[i] || [];
				if (radicals.length > 0) {
					html += `<div><span class="stroke-count">${i}</span><span class="stroke-list">`;
					const prefix = isCn ? '/~@' : '/@';
					radicals.forEach((rad: string) => {
						html += `<a href="${prefix}${encodeURIComponent(rad)}" class="stroke-char">${escapeHtml(rad)}</a>`;
					});
					html += '</span></div>';
				}
			}
			html += '</div></div></div>';
			return html;
		}

		// 特定部首
		const match = isCn ? path.match(/^~@(.+)$/) : path.match(/^@(.+)$/);
		const radical = match ? decodeURIComponent(match[1]) : '';
		if (!radical) return null;
		const api = `${dictBase}/${langKey}/%40${encodeURIComponent(radical)}.json`;
		const raw = await fetch(api, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null));
		if (!raw) return null;
		const data = normalizeRows(raw);
		const titleText = `${radical} 部`;
		const title = buildTitleSection(titleText, `${isCn ? '/~@' : '/@'}${encodeURIComponent(radical)}`);
		let html = `${title}<div class="entry"><div class="entry-item"><div style="max-height: 300px; overflow-y: auto;">`;
		for (let i = 0; i < Math.min(data.length, 8); i++) {
			const chars = data[i] || [];
			if (chars.length > 0) {
				html += `<div><span class="stroke-count">${i}</span><span class="stroke-list">`;
				const prefix = isCn ? '/~' : '/';
				chars.slice(0, 15).forEach((ch: string) => {
					html += `<a href="${prefix}${encodeURIComponent(ch)}" class="stroke-char">${escapeHtml(ch)}</a>`;
				});
				if (chars.length > 15) {
					html += `<span style="color: #666;">（還有 ${chars.length - 15} 個字）</span>`;
				}
				html += '</span></div>';
			}
		}
		html += '</div></div></div>';
		return html;
	} catch (_e) {
		return null;
	}
}


