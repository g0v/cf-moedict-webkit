import { DictionaryLang } from '../types';

export type RouteView = 'dictionary' | 'starred' | 'radical' | 'about' | 'home' | 'unknown';

export type RouteSource = 'hash' | 'path';

export type DictionaryRouteMode = 'entry' | 'search' | 'not-found' | 'unknown';

export interface DictionaryRoutePayload {
	term: string;
	mode?: DictionaryRouteMode;
}

export interface RadicalRoutePayload {
	kind: 'table' | 'bucket';
	radical?: string;
	isCrossStrait?: boolean;
}

export interface BaseRouteState {
	view: RouteView;
	lang: DictionaryLang;
	source?: RouteSource;
	raw?: string;
}

export interface DictionaryRouteState extends BaseRouteState {
	view: 'dictionary';
	payload: DictionaryRoutePayload;
}

export interface RadicalRouteState extends BaseRouteState {
	view: 'radical';
	lang: Extract<DictionaryLang, 'a' | 'c'>;
	payload: RadicalRoutePayload;
}

export interface StarredRouteState extends BaseRouteState {
	view: 'starred';
}

export interface AboutRouteState extends BaseRouteState {
	view: 'about';
}

export interface HomeRouteState extends BaseRouteState {
	view: 'home';
}

export interface UnknownRouteState extends BaseRouteState {
	view: 'unknown';
	payload?: { token?: string };
}

export type RouteState =
	| DictionaryRouteState
	| RadicalRouteState
	| StarredRouteState
	| AboutRouteState
	| HomeRouteState
	| UnknownRouteState;

export interface RouteLocationLike {
	pathname: string;
	hash?: string;
	search?: string;
}

const HASH_LANGUAGE_PREFIX: Record<string, DictionaryLang> = {
	"'": 't',
	'!': 't',
	':': 'h',
	'~': 'c'
};

const PATH_SPECIALS = new Set(['about.html', 'index.html']);

const DEFAULT_ROUTE: HomeRouteState = {
	view: 'home',
	lang: 'a'
};

export function parseRouteFromLocation(location: RouteLocationLike, fallbackLang: DictionaryLang = 'a'): RouteState {
	const pathname = location.pathname || '/';
	const hash = location.hash || '';
	const normalizedPath = decodeURIComponent(pathname.replace(/\/+/g, '/'));
	const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;

	if (isRootPath(normalizedPath)) {
		if (normalizedHash) {
			return parseToken(normalizedHash, 'hash', fallbackLang);
		}
		return { ...DEFAULT_ROUTE, lang: fallbackLang, source: 'path' };
	}

	const token = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
	if (!token) {
		return { ...DEFAULT_ROUTE, lang: fallbackLang, source: 'path' };
	}

	return parseToken(token, 'path', fallbackLang);
}

export function parseRouteFromHref(href: string, base?: string, fallbackLang: DictionaryLang = 'a'): RouteState {
	try {
		if (!href) {
			return { ...DEFAULT_ROUTE, lang: fallbackLang };
		}

		if (href.startsWith('#')) {
			return parseToken(href.slice(1), 'hash', fallbackLang);
		}

		const url = new URL(href, base || (typeof window !== 'undefined' ? window.location.href : 'https://example.com'));
		return parseRouteFromLocation({ pathname: url.pathname, hash: url.hash, search: url.search }, fallbackLang);
	} catch (_err) {
		return {
			view: 'unknown',
			lang: fallbackLang,
			source: href?.startsWith('#') ? 'hash' : 'path',
			raw: href,
			payload: { token: href }
		};
	}
}

export interface SerializeRouteOptions {
	useHash?: boolean;
	basePath?: string;
}

export interface SerializedRoute {
	pathname: string;
	hash?: string;
}

export function serializeRoute(route: RouteState, options: SerializeRouteOptions = {}): SerializedRoute {
	const useHash = Boolean(options.useHash);
	switch (route.view) {
		case 'dictionary': {
			const payload = route.payload;
			const term = payload?.term ?? '';
			const prefix = getLangPrefix(route.lang);
			const token = `${prefix}${term}`;
			if (useHash) {
				return { pathname: options.basePath || '/', hash: `#${encodeURIComponent(token)}` };
			}
			return { pathname: `/${encodeURIComponent(token)}` };
		}
		case 'starred': {
			const token = '=*';
			if (useHash) {
				return { pathname: options.basePath || '/', hash: `#${token}` };
			}
			return { pathname: '/=*' };
		}
		case 'radical': {
			const payload = route.payload || { kind: 'table' };
			const isCrossStrait = payload.isCrossStrait || route.lang === 'c';
			const base = isCrossStrait ? '~@' : '@';
			const token = payload.kind === 'bucket' && payload.radical ? `${base}${payload.radical}` : base;
			if (useHash) {
				return { pathname: options.basePath || '/', hash: `#${encodeURIComponent(token)}` };
			}
			return { pathname: `/${encodeURIComponent(token)}` };
		}
		case 'about': {
			return { pathname: '/about.html' };
		}
		case 'home': {
			return { pathname: options.basePath || '/' };
		}
		case 'unknown':
		default: {
			const token = route.raw || '';
			if (useHash) {
				return { pathname: options.basePath || '/', hash: token ? `#${token}` : undefined };
			}
			return { pathname: token ? `/${encodeURIComponent(token)}` : (options.basePath || '/') };
		}
	}
}

export function getLangPrefix(lang: DictionaryLang): string {
	switch (lang) {
		case 't':
			return "'";
		case 'h':
			return ':';
		case 'c':
			return '~';
		default:
			return '';
	}
}

export function isSameRoute(a: RouteState, b: RouteState): boolean {
	if (a.view !== b.view || a.lang !== b.lang) {
		return false;
	}
	if (a.view === 'dictionary' && b.view === 'dictionary') {
		return normalizeTerm(a.payload?.term) === normalizeTerm(b.payload?.term);
	}
	if (a.view === 'radical' && b.view === 'radical') {
		return (
			(a.payload?.kind || 'table') === (b.payload?.kind || 'table') &&
			(a.payload?.radical || '') === (b.payload?.radical || '') &&
			Boolean(a.payload?.isCrossStrait || a.lang === 'c') === Boolean(b.payload?.isCrossStrait || b.lang === 'c')
		);
	}
	return true;
}

function normalizeTerm(term?: string): string {
	return term ? term.trim() : '';
}

function isRootPath(pathname: string): boolean {
	if (!pathname) return true;
	if (pathname === '/') return true;
	if (PATH_SPECIALS.has(trimLeadingSlash(pathname))) return true;
	return false;
}

function trimLeadingSlash(value: string): string {
	return value.replace(/^\//, '');
}

function parseToken(rawToken: string, source: RouteSource, fallbackLang: DictionaryLang): RouteState {
	const token = decodeURIComponent(rawToken || '').trim();
	if (!token) {
		return { ...DEFAULT_ROUTE, lang: fallbackLang, source };
	}

	if (token === '=*') {
		return { view: 'starred', lang: fallbackLang, source, raw: token };
	}

	if (token === 'about.html' || token === 'about') {
		return { view: 'about', lang: fallbackLang, source, raw: token };
	}

	if (token === '@' || token === '%40') {
		return {
			view: 'radical',
			lang: 'a',
			source,
			raw: token,
			payload: { kind: 'table', isCrossStrait: false }
		};
	}

	if (token === '~@' || token === '~%40') {
		return {
			view: 'radical',
			lang: 'c',
			source,
			raw: token,
			payload: { kind: 'table', isCrossStrait: true }
		};
	}

	if (token.startsWith('@')) {
		return {
			view: 'radical',
			lang: 'a',
			source,
			raw: token,
			payload: { kind: 'bucket', radical: token.slice(1), isCrossStrait: false }
		};
	}

	if (token.startsWith('~@')) {
		return {
			view: 'radical',
			lang: 'c',
			source,
			raw: token,
			payload: { kind: 'bucket', radical: token.slice(2), isCrossStrait: true }
		};
	}

	const { lang, value } = extractLangFromToken(token, fallbackLang);
	const trimmed = value.trim();
	if (!trimmed) {
		return { view: 'dictionary', lang, source, raw: token, payload: { term: '', mode: 'unknown' } };
	}

	return {
		view: 'dictionary',
		lang,
		source,
		raw: token,
		payload: {
			term: trimmed,
			mode: 'unknown'
		}
	};
}

function extractLangFromToken(token: string, fallbackLang: DictionaryLang): { lang: DictionaryLang; value: string } {
	if (!token) {
		return { lang: fallbackLang, value: '' };
	}

	const first = token.charAt(0);
	if (HASH_LANGUAGE_PREFIX[first]) {
		return { lang: HASH_LANGUAGE_PREFIX[first], value: token.slice(1) };
	}

	return { lang: fallbackLang, value: token };
}


