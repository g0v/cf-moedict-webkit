/**
 * 導航列 Preact 組件
 * 復刻原專案 moedict-webkit 的導航列功能
 */

import { DictionaryLang } from './types';

/**
 * 導航列組件 Props
 */
interface NavbarProps {
	currentLang: DictionaryLang;
	onLangChange: (lang: DictionaryLang) => void;
}

/**
 * 語言選項配置
 */
const LANG_OPTIONS = [
	{ key: 'a' as DictionaryLang, label: '華語辭典', href: '##' },
	{ key: 't' as DictionaryLang, label: '臺灣台語', href: '#!' },
	{ key: 'h' as DictionaryLang, label: '臺灣客語', href: '#:' },
	{ key: 'c' as DictionaryLang, label: '兩岸詞典', href: '#~' }
];

/**
 * 語言對應的特殊頁面
 */
const LANG_SPECIAL_PAGES = {
	a: [
		{ label: '…分類索引', href: '#=' },
		{ label: '…部首表', href: '#@' }
	],
	t: [
		{ label: '…分類索引', href: '#!=' },
		{ label: '…諺語', href: '#!=諺語' }
	],
	h: [
		{ label: '…諺語', href: '#:=諺語' }
	],
	c: [
		{ label: '…分類索引', href: '#~=' },
		{ label: '…部首表', href: '#~@' }
	]
};

/**
 * 主要導航列組件
 */
export function NavbarComponent(props: NavbarProps) {
	const { currentLang, onLangChange } = props;
	const currentLangOption = LANG_OPTIONS.find(opt => opt.key === currentLang);
	const specialPages = LANG_SPECIAL_PAGES[currentLang] || [];

	return (
		<>
			{/* 導航列背景 */}
			<div className="nav-bg navbar-fixed-top"></div>

			{/* 主要導航列 */}
			<nav role="navigation" className="navbar navbar-inverse navbar-fixed-top" style={{ opacity: 1 }}>
				{/* 左側區域 */}
				<div className="navbar-header">
					<a href="./" className="navbar-brand brand ebas">萌典</a>
				</div>

				<ul className="nav navbar-nav">
					{/* 辭典下拉選單 */}
					<li className="dropdown">
						<a href="#" data-toggle="dropdown" className="dropdown-toggle">
							<i className="icon-book">&nbsp;</i>
							<span
								style={{ margin: 0, padding: 0 }}
								itemProp="articleSection"
								className="lang-active"
							>
								{currentLangOption?.label || '華語辭典'}
							</span>
							<b className="caret"></b>
						</a>
						<ul role="navigation" className="dropdown-menu">
							{/* 語言選項 */}
							{LANG_OPTIONS.map(option => (
								<li key={option.key} role="presentation">
									<a
										role="menuitem"
										href={option.href}
										className={`lang-option ${option.key}`}
										onClick={(e) => {
											e.preventDefault();
											onLangChange(option.key);
										}}
									>
										{option.label}
									</a>
								</li>
							))}

							{/* 特殊頁面 */}
							{specialPages.map((page, index) => (
								<li key={index} role="presentation">
									<a
										href={page.href}
										className={`lang-option ${currentLang} ${page.href.includes('諺語') ? 'idiom' : ''}`}
									>
										{page.label}
									</a>
								</li>
							))}
						</ul>
					</li>

					{/* 字詞紀錄簿按鈕 */}
					<li id="btn-starred">
						<a title="字詞紀錄簿" href="#=*">
							<i className="icon-bookmark-empty"></i>
						</a>
					</li>

					{/* 偏好設定按鈕 */}
					<li id="btn-pref">
						<a title="偏好設定" href="#">
							<i className="icon-cogs"></i>
						</a>
					</li>

					{/* 字體大小調整按鈕（僅 App 版） */}
					<li
						style={{ position: 'absolute', top: '2px', left: '8em', padding: '3px' }}
						className="resize-btn app-only"
					>
						<a
							style={{ paddingLeft: '5px', paddingRight: '5px', marginRight: '30px' }}
							onClick={(e) => {
								e.preventDefault();
								// TODO: 實現字體大小調整功能
							}}
						>
							<i className="icon-resize-small"></i>
						</a>
					</li>
					<li
						style={{ position: 'absolute', top: '2px', left: '8em', padding: '3px', marginLeft: '30px' }}
						className="resize-btn app-only"
					>
						<a
							style={{ paddingLeft: '5px', paddingRight: '5px' }}
							onClick={(e) => {
								e.preventDefault();
								// TODO: 實現字體大小調整功能
							}}
						>
							<i className="icon-resize-full"></i>
						</a>
					</li>
				</ul>

				{/* 右側區域 - 下載連結、搜尋框、社群連結 */}
				<ul className="nav pull-right hidden-xs" style={{ display: 'flex' }}>

					{/* Google 站內搜尋 */}
					<li style={{ display: 'inline-block' }} className="web-inline-only">
						<div id="gcse">
							<span className={`lang-${currentLang}-only`}>
								<gcse:search
									webSearchQueryAddition={getSearchQueryAddition(currentLang)}
								></gcse:search>
							</span>
						</div>
					</li>


					<li style={{ display: 'inline-block' }}>
						<a
							href="https://racklin.github.io/moedict-desktop/download.html"
							target="_blank"
							rel="noopener noreferrer"
							title="桌面版下載(可離線使用)"
							style={{ color: '#ccc' }}
						>
							<i className="icon-download-alt"></i>
						</a>
					</li>



					<li style={{ display: 'inline-block' }}>
						<a
							href="https://play.google.com/store/apps/details?id=org.audreyt.dict.moe"
							target="_blank"
							rel="noopener noreferrer"
							title="Google Play 下載"
							style={{ color: '#ccc' }}
						>
							<i className="icon-android"></i>
						</a>
					</li>
					<li style={{ display: 'inline-block' }}>
						<a
							href="http://itunes.apple.com/app/id1434947403"
							target="_blank"
							rel="noopener noreferrer"
							title="App Store 下載"
							style={{ color: '#ccc' }}
						>
							<i className="icon-apple"></i>
						</a>
					</li>


					<li>
						<a href="about.html" title="關於本站">
							<span className="iconic-circle" style={{ backgroundColor: '#400' }}>
								<i className="icon-info"></i>
							</span>
						</a>
					</li>
				</ul>
			</nav>

		</>
	);
}

/**
 * 根據語言獲取搜尋查詢附加條件
 */
function getSearchQueryAddition(lang: DictionaryLang): string {
	const searchConfig = {
		a: '-"臺灣台語萌典" -"兩岸萌典" -"臺灣客語萌典" -"推特" -"moedict tw lab" -"moedict tw dodo"',
		t: '+"臺灣台語萌典" -"兩岸萌典" -"臺灣客語萌典" -"推特" -"moedict tw lab" -"moedict tw dodo"',
		h: '+"臺灣客語萌典" -"臺灣台語萌典" -"兩岸萌典" -"推特" -"moedict tw lab" -"moedict tw dodo"',
		c: '+"兩岸萌典" -"臺灣台語萌典" -"臺灣客語萌典" -"推特" -"moedict tw lab" -"moedict tw dodo"'
	};

	return searchConfig[lang] || searchConfig.a;
}
