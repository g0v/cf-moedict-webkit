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

interface RadicalTableProps {
	data: string[][];
	isCrossStrait: boolean;
}

export function RadicalTable(props: RadicalTableProps) {
	const { data, isCrossStrait } = props;
	const prefix = isCrossStrait ? '/~@' : '/@';
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
										{list.map((radical, i) => (
											<a key={i} className="stroke-char" href={`${prefix}${radical}`} style={{ marginRight: '6px' }}>{radical}</a>
										))}
									</span>
									<hr style={{ margin: '0', padding: '0', height: '0' }} />
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<script dangerouslySetInnerHTML={{ __html: RADICAL_LRU_SCRIPT }} />
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
	return (
		<>
			<div className="result" style={{ marginTop: '50px' }}>
				<h1 className="title" style={{ marginTop: '0' }}>{radical} 部</h1>
				<p><a className="xref" href={backHref}>回部首表</a></p>
				<div className="entry">
					<div className="entry-item list">
						{(Array.isArray(data) ? data : []).map((row, idx) => {
							const list = Array.isArray(row) ? row.filter(Boolean) : [];
							return (
								<div key={idx} style={{ margin: '8px 0' }}>
									<span className="stroke-count" style={{ marginRight: '8px' }}>{idx}</span>
									<span className="stroke-list">
										{list.map((ch, i) => (
											<a
												key={i}
												className="stroke-char"
												href={backHref.startsWith('/~@') ? `/~${ch}` : `/${ch}`}
												style={{ marginRight: '6px' }}
											>
												{ch}
											</a>
										))}
									</span>
									<hr style={{ margin: '0', padding: '0', height: '0' }} />
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<script dangerouslySetInnerHTML={{ __html: RADICAL_LRU_SCRIPT }} />
		</>
	);
}


