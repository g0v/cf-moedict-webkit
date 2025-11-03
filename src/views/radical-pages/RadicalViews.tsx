import { JSX } from 'preact';
import { useCallback } from 'preact/hooks';
import { useRouter } from '../../layouts';
import type { RouteNavigateIntent } from '../../layouts';

const RADICAL_LRU_SCRIPT = `
(function(){
  var LOG = '[RadicalLRU]';
  function debug(tag, payload) {
    try { console.log(LOG, tag, payload); } catch (err) {}
  }
  function warn(tag, payload) {
    try { console.warn(LOG, tag, payload); } catch (err) {}
  }
  function safeString(value) {
    if (value == null) return '';
    var str;
    try { str = String(value); } catch (err) { return ''; }
    return str.trim();
  }
  function safeDecode(value) {
    var str = safeString(value);
    if (!str) return '';
    try { return decodeURIComponent(str); } catch (err) { return str; }
  }
  var BACKSLASH = decodeURIComponent('%5C');
  function stripLeadingSlash(text) {
    var str = safeString(text);
    if (str.charAt(0) === '/') {
      return str.slice(1);
    }
    return str;
  }
  function stripLangMarkers(word) {
    var result = safeDecode(word);
    if (!result) return '';
    if (result.charAt(0) === BACKSLASH) {
      result = result.slice(1);
    }
    var first = result.charAt(0);
    if (first === "'" || first === '!' || first === ':' || first === '~') {
      result = result.slice(1);
    }
    return result;
  }
  var EXTENSION_PATTERN = /\.(html|json|png|jpg|jpeg|gif|svg|css|js)$/i;
  function shouldRecordWord(word) {
    if (!word) return false;
    if (word === '#') return false;
    if (word === 'about.html' || word.indexOf('about') === 0) return false;
    if (word === '=*' || word.indexOf('=') === 0) return false;
    if (word.indexOf('/') >= 0) return false;
    if (EXTENSION_PATTERN.test(word)) return false;
    return true;
  }
  function getLang() {
    try {
      var match = (document.documentElement.className || '').match(/lang-([atch])/);
      return (match && match[1]) || 'a';
    } catch (err) {
      return 'a';
    }
  }
  var lang = getLang();
  function addToLRU(rawWord) {
    var cleaned = stripLangMarkers(rawWord);
    if (!shouldRecordWord(cleaned)) {
      debug('skip', { raw: rawWord, cleaned: cleaned });
      return;
    }
    var key = 'lru-' + lang;
    var list = [];
    try {
      var stored = localStorage.getItem(key);
      if (stored) {
        list = JSON.parse(stored);
      }
    } catch (err) {
      warn('parse', { error: err && err.message });
      list = [];
    }
    list = list.filter(function(existing) {
      if (existing === cleaned) return false;
      try { return decodeURIComponent(existing) !== cleaned; } catch (err) { return true; }
    });
    list.unshift(cleaned);
    if (list.length > 50) {
      list = list.slice(0, 50);
    }
    localStorage.setItem(key, JSON.stringify(list));
    debug('add', { cleaned: cleaned, size: list.length });
  }
  function recordCurrent(source) {
    try {
      var path = stripLeadingSlash(window.location.pathname);
      debug('recordCurrent', { source: source, path: path });
      addToLRU(path);
    } catch (err) {
      warn('recordCurrent', { error: err && err.message });
    }
  }
  function handleClick(event) {
    try {
      var link = event.target && event.target.closest ? event.target.closest('a') : null;
      if (!link || !link.href) return;
      var url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
      var target = '';
      if (url.pathname !== window.location.pathname) {
        target = stripLeadingSlash(url.pathname);
      } else if (url.hash) {
        target = url.hash.substring(1);
      } else {
        return;
      }
      debug('click', { target: target, href: link.getAttribute('href') });
      addToLRU(target);
    } catch (err) {
      warn('click', { error: err && err.message });
    }
  }
  document.addEventListener('click', handleClick, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      recordCurrent('DOMContentLoaded');
    }, { once: true });
  } else {
    recordCurrent('immediate');
  }
  window.addEventListener('pageshow', function() {
    recordCurrent('pageshow');
  });
})();
`;

const RADICAL_TOOLTIP_SCRIPT = `
(function(){
  if (typeof window === 'undefined') { return; }
  if (window.__RADICAL_TOOLTIP_INIT__) { return; }
  window.__RADICAL_TOOLTIP_INIT__ = true;

  var ATTR = 'data-radical-id';
  var tooltipEl = null;
  var cache = Object.create(null);
  var showTimer = null;
  var hideTimer = null;
  var currentId = null;
  var currentAnchor = null;
  var LOADING_HTML = '<div class="entry"><div class="entry-item"><div class="def">載入中…</div></div></div>';
  var EMPTY_HTML = '<div class="entry"><div class="entry-item"><div class="def">找不到內容</div></div></div>';

  function createTooltip(){
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'ui-tooltip prefer-pinyin-true';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.display = 'none';
      tooltipEl.style.zIndex = '9999';
      document.body.appendChild(tooltipEl);
      tooltipEl.addEventListener('mouseenter', function(){
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      });
      tooltipEl.addEventListener('mouseleave', function(){
        if (hideTimer) { clearTimeout(hideTimer); }
        hideTimer = setTimeout(function(){ hideTooltip(); }, 120);
      });
    }
    return tooltipEl;
  }

  function clamp(val, min, max){
    if (val < min) { return min; }
    if (val > max) { return max; }
    return val;
  }

  function positionNearAnchor(anchor){
    if (!anchor) { return; }
    var el = createTooltip();
    var rect = anchor.getBoundingClientRect();
    var scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    var w = el.offsetWidth || 240;
    var h = el.offsetHeight || 160;
    var minX = scrollX + 8;
    var maxX = scrollX + Math.max(vw - w - 8, 8);
    if (maxX < minX) { maxX = minX; }
    var minY = scrollY + 8;
    var maxY = scrollY + Math.max(vh - h - 8, 8);
    if (maxY < minY) { maxY = minY; }
    var desiredX = scrollX + rect.left + (rect.width / 2) - (w / 2);
    var desiredY = scrollY + rect.bottom + 12;
    var nx = clamp(desiredX, minX, maxX);
    var ny = clamp(desiredY, minY, maxY);
    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
  }

  function fetchTooltip(id, cb){
    if (!id) { cb(''); return; }
    if (cache[id]) { cb(cache[id]); return; }
    try {
      var u = new URL(window.location.href);
      u.searchParams.set('tooltip', '1');
      u.searchParams.set('id', id);
      fetch(u.toString(), { headers: { 'Accept': 'text/html' } })
        .then(function(r){ return r.text(); })
        .then(function(html){ cache[id] = html; cb(html); })
        .catch(function(){ cb(''); });
    } catch (_e) {
      cb('');
    }
  }

  function showTooltip(anchor, id){
    currentId = id;
    currentAnchor = anchor;
    var el = createTooltip();
    el.innerHTML = LOADING_HTML;
    el.style.display = 'block';
    positionNearAnchor(currentAnchor);
    fetchTooltip(id, function(html){
      if (currentId !== id) { return; }
      el.innerHTML = html || EMPTY_HTML;
      el.style.display = 'block';
      positionNearAnchor(currentAnchor);
    });
  }

  function hideTooltip(){
    if (!tooltipEl) { return; }
    tooltipEl.style.display = 'none';
    currentId = null;
    currentAnchor = null;
  }

  document.addEventListener('mouseover', function(ev){
    var anchor = ev.target && ev.target.closest ? ev.target.closest('[' + ATTR + ']') : null;
    if (!anchor) { return; }
    var id = anchor.getAttribute(ATTR) || '';
    if (!id) { return; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (showTimer) { clearTimeout(showTimer); }
    showTimer = setTimeout(function(){ showTooltip(anchor, id); }, 120);
  });

  document.addEventListener('mouseout', function(ev){
    var anchor = ev.target && ev.target.closest ? ev.target.closest('[' + ATTR + ']') : null;
    if (!anchor) { return; }
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    var toTooltip = ev.relatedTarget && ev.relatedTarget.closest ? ev.relatedTarget.closest('.ui-tooltip') : null;
    if (toTooltip) { return; }
    if (hideTimer) { clearTimeout(hideTimer); }
    hideTimer = setTimeout(function(){ hideTooltip(); }, 150);
  });

  function refreshPosition(){
    if (!currentId || !currentAnchor || !tooltipEl || tooltipEl.style.display !== 'block') { return; }
    positionNearAnchor(currentAnchor);
  }

  window.addEventListener('scroll', refreshPosition, true);
  window.addEventListener('resize', refreshPosition);
})();
`;

type AnchorMouseEvent = JSX.TargetedMouseEvent<HTMLAnchorElement>;

function shouldHandleWithRouter(event: AnchorMouseEvent): boolean {
	if (!event) {
		return false;
	}
	if (event.defaultPrevented) {
		return false;
	}
	if (event.button !== 0) {
		return false;
	}
	if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
		return false;
	}
	return true;
}

function useRouterNavigation() {
	const router = useRouter();

	const formatHref = useCallback((intent: RouteNavigateIntent) => router.formatHref(intent), [router]);

	const navigateIntent = useCallback((intent: RouteNavigateIntent) => {
		if (typeof intent === 'string') {
			const resolved = router.resolveHref(intent);
			router.navigate(resolved);
			return;
		}
		router.navigate(intent);
	}, [router]);

	const createClickHandler = useCallback((intent: RouteNavigateIntent) => {
		return (event: AnchorMouseEvent) => {
			if (!shouldHandleWithRouter(event)) {
				return;
			}
			event.preventDefault();
			navigateIntent(intent);
		};
	}, [navigateIntent]);

	return { formatHref, createClickHandler };
}

interface RadicalTableProps {
	data: string[][];
	isCrossStrait: boolean;
}

export function RadicalTable(props: RadicalTableProps) {
	const { data, isCrossStrait } = props;
	const prefix = isCrossStrait ? '/~@' : '/@';
	const { formatHref, createClickHandler } = useRouterNavigation();
	return (
		<>
			<div className="result" style={{ marginTop: '50px' }}>
				<h1 className="title" style={{ marginTop: '0' }}>部首表</h1>
				<div className="entry">
					<div className="entry-item list">
						{(Array.isArray(data) ? data : []).map((row, idx) => {
							const list = Array.isArray(row) ? row.filter(Boolean) : [];
							return (
								<div key={idx} style={{ margin: '8px 0' }}>
									<span className="stroke-count" style={{ marginRight: '8px' }}>{idx}</span>
									<span className="stroke-list">
										{list.map((radical, i) => {
											const intent: RouteNavigateIntent = `${prefix}${radical}`;
											const tooltipId = `${isCrossStrait ? '~@' : '@'}${radical}`;
											return (
												<a
													key={i}
													className="stroke-char"
													href={formatHref(intent)}
													onClick={createClickHandler(intent)}
													data-radical-id={tooltipId}
													style={{ marginRight: '6px' }}
												>
													{radical}
												</a>
											);
										})}
									</span>
									<hr style={{ margin: '0', padding: '0', height: '0' }} />
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<script dangerouslySetInnerHTML={{ __html: RADICAL_LRU_SCRIPT }} />
			<script dangerouslySetInnerHTML={{ __html: RADICAL_TOOLTIP_SCRIPT }} />
		</>
	);
}

interface RadicalBucketProps {
	radical: string;
	data: string[][];
	backHref: string;
}

export function RadicalBucket(props: RadicalBucketProps) {
	const { radical, data, backHref } = props;
	const { formatHref, createClickHandler } = useRouterNavigation();
	const tooltipBackId = backHref.startsWith('/~@') ? '~@' : '@';
	return (
		<>
			<div className="result" style={{ marginTop: '50px' }}>
				<h1 className="title" style={{ marginTop: '0' }}>{radical} 部</h1>
				<p>
					<a
						className="xref"
						href={formatHref(backHref)}
						onClick={createClickHandler(backHref)}
						data-radical-id={tooltipBackId}
					>
						回部首表
					</a>
				</p>
				<div className="entry">
					<div className="entry-item list">
						{(Array.isArray(data) ? data : []).map((row, idx) => {
							const list = Array.isArray(row) ? row.filter(Boolean) : [];
							return (
								<div key={idx} style={{ margin: '8px 0' }}>
									<span className="stroke-count" style={{ marginRight: '8px' }}>{idx}</span>
									<span className="stroke-list">
										{list.map((ch, i) => {
											const intent: RouteNavigateIntent = backHref.startsWith('/~@') ? `/~${ch}` : `/${ch}`;
											return (
												<a
													key={i}
													className="stroke-char"
													href={formatHref(intent)}
													onClick={createClickHandler(intent)}
													style={{ marginRight: '6px' }}
												>
													{ch}
												</a>
											);
										})}
									</span>
									<hr style={{ margin: '0', padding: '0', height: '0' }} />
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<script dangerouslySetInnerHTML={{ __html: RADICAL_LRU_SCRIPT }} />
			<script dangerouslySetInnerHTML={{ __html: RADICAL_TOOLTIP_SCRIPT }} />
		</>
	);
}


