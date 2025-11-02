/**
 * 字詞紀錄簿頁面 Preact 組件
 * 復刻原專案 moedict-webkit 的字詞紀錄簿功能
 */

import { DictionaryLang } from '../../types';

/**
 * 字詞紀錄簿頁面組件 Props
 */
interface StarredPageProps {
	currentLang: DictionaryLang;
	recentWords: string[];
	onClearHistory: () => void;
}

/**
 * 字詞紀錄簿頁面組件
 */
export function StarredPage(props: StarredPageProps) {
	const { currentLang, recentWords, onClearHistory } = props;

	return (
		<div className="result">
				<h1 className="title">字詞紀錄簿</h1>

				{/* 收藏字詞區域（交由前端腳本渲染） */}
				<div className="starred-section">
					<h3>收藏字詞</h3>
					<div className="word-list"><p>載入中...</p></div>
				</div>

				{/* 最近查閱過的字詞區域 */}
				{recentWords.length > 0 && (
					<div className="recent-section">
						<br />
						<h3 id="lru">
							最近查閱過的字詞
							<input
								id="btn-clear-lru"
								type="button"
								className="btn-default btn btn-tiny"
								value="清除"
								style={{ marginLeft: '10px' }}
								onClick={() => {
									if (confirm('確定要清除瀏覽紀錄？')) {
										onClearHistory();
									}
								}}
							/>
						</h3>
						<div className="word-list">
							{recentWords.map((word, index) => (
								<div key={index} style={{ clear: 'both', display: 'block' }}>
									<span>·</span>
									<a href={`/${word}`}>{word}</a>
								</div>
							))}
						</div>
					</div>
				)}
		</div>
	);
}

/**
 * 字詞紀錄簿頁面組件（無 props 版本，用於 SSR）
 */
export function StarredPageSSR() {
	return (
		<>
			<div className="result">
				<h1 className="title">字詞紀錄簿</h1>

				{/* 收藏字詞區域 */}
				<div className="starred-section">
					<h3>收藏字詞</h3>
					<p className="bg-info">
						（請按詞條右方的 <i className="icon-star-empty"></i> 按鈕，即可將字詞加到這裡。）
					</p>
				</div>

				{/* 最近查閱過的字詞區域 */}
				<div className="recent-section">
					<br />
					<h3 id="lru">
						最近查閱過的字詞
						<input
							id="btn-clear-lru"
							type="button"
							className="btn-default btn btn-tiny"
							value="清除"
							style={{ marginLeft: '10px' }}
						/>
					</h3>
					<div className="word-list">
						{/* 這裡會由前端 JavaScript 動態載入 */}
					</div>
				</div>
			</div>
			{/* 以 localStorage 解析 starred-{lang} 與 lru-{lang} 並渲染清單，並綁定清除鈕事件 */}
			<script
				dangerouslySetInnerHTML={{ __html: `
				(function(){
				  function getLang(){
				    try {
				      var m = (document.documentElement.className||'').match(/lang-([atch])/);
				      return (m && m[1]) || 'a';
				    } catch(_e){ return 'a'; }
				  }
				  function parseStarred(raw){
				    var list = [];
				    if (typeof raw !== 'string' || !raw) return list;
				    var re = /"([^\"]+)"/g, m; var seen = Object.create(null);
				    while ((m = re.exec(raw))) {
				      var w = m[1];
				      if (!seen[w]) { list.push(w); seen[w] = 1; }
				    }
				    return list;
				  }
				  function parseLru(raw){
				    var list = [];
				    if (!raw) return list;
				    try {
				      var parsed = JSON.parse(raw);
				      if (Array.isArray(parsed)) {
				        for (var i=0;i<parsed.length;i++) {
				          var v = parsed[i];
				          if (typeof v === 'string' && v) list.push(v);
				        }
				        return list;
				      }
				    } catch(_e) {}
				    var re = /"([^\"]+)"/g, m; var seen = Object.create(null);
				    while ((m = re.exec(raw))) {
				      var w = m[1];
				      if (!seen[w]) { list.push(w); seen[w] = 1; }
				    }
				    return list;
				  }
				  function ensureContainer(){
				    var sec = document.querySelector('.starred-section');
				    if (!sec) return null;
				    var container = sec.querySelector('.word-list');
				    if (!container){
				      container = document.createElement('div');
				      container.className = 'word-list';
				      var info = sec.querySelector('.bg-info');
				      if (info && info.parentNode) { info.parentNode.replaceChild(container, info); }
				      else { sec.appendChild(container); }
				    }
				    return container;
				  }
				  function render(list){
				    var container = ensureContainer();
				    if (!container) return;
				    if (!list.length){
				      container.innerHTML = '<p class="bg-info">（請按詞條右方的 <i class="icon-star-empty"></i> 按鈕，即可將字詞加到這裡。）</p>';
				      return;
				    }
				    var html = '';
				    for (var i=0;i<list.length;i++){
				      var w = list[i];
				      var href = '/' + encodeURIComponent(w);
				      html += '<div style="clear: both; display: block;"><span>·</span><a href="'+href+'">'+w+'</a></div>';
				    }
				    container.innerHTML = html;
				  }
				  function renderRecent(list){
				    var sec = document.querySelector('.recent-section');
				    if (!sec) return;
				    var container = sec.querySelector('.word-list');
				    if (!container){
				      container = document.createElement('div');
				      container.className = 'word-list';
				      sec.appendChild(container);
				    }
				    if (!list.length){
				      container.innerHTML = '';
				      return;
				    }
				    var html = '';
				    for (var i=0;i<list.length;i++){
				      var w = list[i];
				      var href = '/' + encodeURIComponent(w);
				      html += '<div style="clear: both; display: block;"><span>·</span><a href="'+href+'">'+w+'</a></div>';
				    }
				    container.innerHTML = html;
				  }
				  function bindClear(){
				    try {
				      var btn = document.getElementById('btn-clear-lru');
				      if (!btn) return;
				      if (btn._bound) return;
				      btn._bound = true;
				      btn.addEventListener('click', function(){
				        var lang = getLang();
				        if (window.confirm('確定要清除瀏覽紀錄？')) {
				          try {
				            window.localStorage && window.localStorage.removeItem('lru-' + lang);
				            location.reload();
				          } catch(_e) {}
				        }
				      });
				    } catch(_e) {}
				  }
				  function setClearVisibility(hasItems){
				    try {
				      var btn = document.getElementById('btn-clear-lru');
				      if (!btn) return;
				      btn.style.display = hasItems ? '' : 'none';
				    } catch(_e) {}
				  }
				  function run(){
				    try {
				      var lang = getLang();
				      var rawStarred = localStorage.getItem('starred-' + lang) || '';
				      var starredList = parseStarred(rawStarred);
				      render(starredList);
				      var rawLru = localStorage.getItem('lru-' + lang) || '';
				      var lruList = parseLru(rawLru);
				      renderRecent(lruList);
				      setClearVisibility(lruList && lruList.length > 0);
				      bindClear();
				    } catch(_e){}
				  }
				  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', run, { once: true }); } else { run(); }
				})();
				` }}
			/>
		</>
	);
}


