import { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
	DictionaryRouteMode,
	RouteState,
	serializeRoute,
	parseRouteFromHref,
	parseRouteFromLocation,
	isSameRoute
} from '../router/state';

export type RouteNavigateIntent = RouteState | string | { href: string } | ((current: RouteState) => RouteState);

export interface NavigateOptions {
	replace?: boolean;
	useHash?: boolean;
}

export interface RouterContextValue {
	route: RouteState;
	navigate: (intent: RouteNavigateIntent, options?: NavigateOptions) => void;
	replace: (intent: RouteNavigateIntent, options?: NavigateOptions) => void;
	resolveHref: (href: string) => RouteState;
	formatHref: (intent: RouteNavigateIntent) => string;
	useHashRouting: boolean;
}

const DEFAULT_ROUTE: RouteState = {
	view: 'home',
	lang: 'a'
};

const noop = () => undefined;

export const RouterContext = createContext<RouterContextValue>({
	route: DEFAULT_ROUTE,
	navigate: noop,
	replace: noop,
	resolveHref: (href: string) => parseRouteFromHref(href),
	formatHref: () => '#',
	useHashRouting: false
});

export function useRouter(): RouterContextValue {
	return useContext(RouterContext);
}

type SlotRenderer = ComponentChildren | ((ctx: RouterContextValue) => ComponentChildren);

function renderSlot(slot: SlotRenderer | undefined, context: RouterContextValue): ComponentChildren | null {
	if (!slot) {
		return null;
	}
	if (typeof slot === 'function') {
		return (slot as (ctx: RouterContextValue) => ComponentChildren)(context);
	}
	return slot;
}

export interface MainLayoutProps {
	initialRoute: RouteState;
	navbar?: SlotRenderer;
	children?: SlotRenderer;
	footer?: SlotRenderer;
	useHashRouting?: boolean;
	onRouteChange?: (route: RouteState) => void;
}

export function MainLayout(props: MainLayoutProps) {
	const {
		initialRoute,
		navbar,
		children,
		footer,
		useHashRouting: useHashRoutingProp,
		onRouteChange
	} = props;

	const [route, setRoute] = useState<RouteState>(() => normalizeInitialRoute(initialRoute));
	const lastRouteRef = useRef<RouteState>(route);
	const preferHashRouting = useMemo(() => {
		if (typeof useHashRoutingProp === 'boolean') {
			return useHashRoutingProp;
		}
		return initialRoute.source === 'hash';
	}, [initialRoute.source, useHashRoutingProp]);

	const resolveHref = useCallback((href: string): RouteState => {
		return parseRouteFromHref(
			href,
			typeof window !== 'undefined' ? window.location.href : undefined,
			route.lang
		);
	}, [route.lang]);

	const commitRoute = useCallback((nextRoute: RouteState, mode: 'push' | 'replace', options?: NavigateOptions) => {
		if (typeof window !== 'undefined') {
			const serialized = serializeRoute(nextRoute, {
				useHash: options?.useHash ?? preferHashRouting,
				basePath: '/'
			});
			const url = `${serialized.pathname}${serialized.hash ?? ''}`;
			const state = { route: nextRoute };
			if (mode === 'replace') {
				window.history.replaceState(state, '', url);
			} else {
				window.history.pushState(state, '', url);
			}
		}
		onRouteChange?.(nextRoute);
	}, [onRouteChange, preferHashRouting]);

	const resolveIntent = useCallback((intent: RouteNavigateIntent, current: RouteState): RouteState => {
		if (typeof intent === 'function') {
			return intent(current);
		}
		if (typeof intent === 'string') {
			return resolveHref(intent);
		}
		if (intent && typeof intent === 'object' && 'view' in intent && 'lang' in intent) {
			return intent as RouteState;
		}
		if (intent && typeof intent === 'object' && 'href' in intent) {
			return resolveHref(intent.href);
		}
		return current;
	}, [resolveHref]);

	const formatHref = useCallback((intent: RouteNavigateIntent): string => {
		const current = lastRouteRef.current ?? route;
		const nextRoute = resolveIntent(intent, current);
		const serialized = serializeRoute(nextRoute, {
			useHash: preferHashRouting,
			basePath: '/'
		});
		return `${serialized.pathname}${serialized.hash ?? ''}`;
	}, [preferHashRouting, resolveIntent, route]);

	const navigate = useCallback((intent: RouteNavigateIntent, options?: NavigateOptions) => {
		const current = lastRouteRef.current;
		const nextRoute = resolveIntent(intent, current ?? route);
		if (current && isSameRoute(current, nextRoute)) {
			if (options?.replace) {
				commitRoute(nextRoute, 'replace', options);
			}
			return;
		}
		lastRouteRef.current = nextRoute;
		setRoute(nextRoute);
		commitRoute(nextRoute, options?.replace ? 'replace' : 'push', options);
	}, [commitRoute, resolveIntent, route]);

	const replace = useCallback((intent: RouteNavigateIntent, options?: NavigateOptions) => {
		navigate(intent, { ...options, replace: true });
	}, [navigate]);

	useEffect(() => {
		lastRouteRef.current = route;
	}, [route]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const handlePopState = (event: PopStateEvent) => {
			const stateRoute: RouteState | undefined = event.state?.route;
			if (stateRoute) {
				lastRouteRef.current = stateRoute;
				setRoute(stateRoute);
				onRouteChange?.(stateRoute);
				return;
			}
			const next = parseRouteFromLocation(window.location, lastRouteRef.current?.lang ?? 'a');
			lastRouteRef.current = next;
			setRoute(next);
			onRouteChange?.(next);
		};

		const handleHashChange = () => {
			const next = parseRouteFromLocation(window.location, lastRouteRef.current?.lang ?? 'a');
			lastRouteRef.current = next;
			setRoute(next);
			onRouteChange?.(next);
		};

		window.addEventListener('popstate', handlePopState);
		window.addEventListener('hashchange', handleHashChange);

		return () => {
			window.removeEventListener('popstate', handlePopState);
			window.removeEventListener('hashchange', handleHashChange);
		};
	}, [onRouteChange]);

	const contextValue = useMemo<RouterContextValue>(() => ({
		route,
		navigate,
		replace,
		resolveHref,
		formatHref,
		useHashRouting: preferHashRouting
	}), [formatHref, navigate, preferHashRouting, replace, resolveHref, route]);

	return (
		<RouterContext.Provider value={contextValue}>
			<div className="app-shell">
				{renderSlot(navbar, contextValue)}
				<main id="main-content">
					{renderSlot(children, contextValue)}
				</main>
				{renderSlot(footer, contextValue)}
			</div>
		</RouterContext.Provider>
	);
}

function normalizeInitialRoute(route: RouteState | undefined): RouteState {
	if (!route) {
		return DEFAULT_ROUTE;
	}
	if (route.view === 'dictionary' && route.payload && !route.payload.mode) {
		return {
			...route,
			payload: {
				...route.payload,
				mode: inferDictionaryMode(route.payload.term)
			}
		};
	}
	return route;
}

function inferDictionaryMode(term: string): DictionaryRouteMode {
	const clean = (term || '').trim();
	if (!clean) {
		return 'unknown';
	}
	if (clean.startsWith('=')) {
		return 'search';
	}
	return 'entry';
}

