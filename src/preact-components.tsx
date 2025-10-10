/**
 * 簡單的 Preact 組件 - SSR 渲染字典頁面
 * 只顯示基本的字典資料
 */

import { DictionaryAPIResponse, DictionaryLang } from './types';

/**
 * 字典頁面組件 Props
 */
interface DictionaryPageProps {
	entry: DictionaryAPIResponse;
	text: string;
	lang: DictionaryLang;
}

/**
 * 主要字典頁面組件
 */
export function DictionaryPage(props: DictionaryPageProps) {
	const { entry, text, lang } = props;
	const { title, heteronyms = [], translation, xrefs = [] } = entry;

	return (
		<div className="dictionary-page">
			{/* 標題 */}
			<h1 dangerouslySetInnerHTML={{ __html: title || text }} />

			{/* 異音字列表 */}
			{heteronyms.map((het: any, idx: number) => (
				<div key={idx} className="heteronym">
					{/* 注音/拼音 */}
					<div className="phonetic">
						{het.bopomofo && <span className="bopomofo">{het.bopomofo}</span>}
						{het.pinyin && <span className="pinyin"> {het.pinyin}</span>}
					</div>

					{/* 定義列表 */}
					{het.definitions && het.definitions.length > 0 && (
						<ol className="definitions">
							{het.definitions.map((def: any, defIdx: number) => (
								<li key={defIdx}>
									{/* 定義 */}
									{def.def && <div className="def" dangerouslySetInnerHTML={{ __html: def.def }} />}

									{/* 例句/引文 */}
									{def.example && def.example.map((ex: string, exIdx: number) => (
										<div key={exIdx} className="example" dangerouslySetInnerHTML={{ __html: ex }} />
									))}
									{def.quote && def.quote.map((q: string, qIdx: number) => (
										<div key={qIdx} className="quote" dangerouslySetInnerHTML={{ __html: q }} />
									))}

									{/* 同義詞/反義詞 */}
									{def.synonyms && (
										<div className="synonyms">
											<strong>似：</strong>
											<span dangerouslySetInnerHTML={{ __html: def.synonyms }} />
										</div>
									)}
									{def.antonyms && (
										<div className="antonyms">
											<strong>反：</strong>
											<span dangerouslySetInnerHTML={{ __html: def.antonyms }} />
										</div>
									)}
								</li>
							))}
						</ol>
					)}
				</div>
			))}

		{/* 翻譯 */}
		{translation && (
			<div className="translations">
				<h3>翻譯</h3>
				{translation.English && (
					<div className="translation-item">
						<strong>英：</strong> {formatTranslation(translation.English)}
					</div>
				)}
				{translation.Deutsch && (
					<div className="translation-item">
						<strong>德：</strong> {formatTranslation(translation.Deutsch)}
					</div>
				)}
				{translation.francais && (
					<div className="translation-item">
						<strong>法：</strong> {formatTranslation(translation.francais)}
					</div>
				)}
			</div>
		)}

			{/* 跨語言對照 */}
			{xrefs && xrefs.length > 0 && (
				<div className="xrefs">
					<h3>相關詞彙</h3>
					{xrefs.map((xref: any, xrefIdx: number) => (
						<div key={xrefIdx} className="xref-item">
							<strong>{getLangName(xref.lang)}：</strong>
							{xref.words.join('、')}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * 獲取語言名稱
 */
function getLangName(lang: string): string {
	const langNames: Record<string, string> = {
		'a': '華語',
		't': '台語',
		'h': '客語',
		'c': '兩岸'
	};
	return langNames[lang] || lang;
}

/**
 * 格式化翻譯內容（處理字串或陣列）
 */
function formatTranslation(value: string | string[]): string {
	if (Array.isArray(value)) {
		return value.join(', ');
	}
	return value;
}

/**
 * 搜尋結果頁面組件（當找不到完整詞條時）
 */
interface SearchResultsPageProps {
	text: string;
	segments: Array<{ part: string; def: string }>;
}

export function SearchResultsPage(props: SearchResultsPageProps) {
	const { text, segments } = props;

	return (
		<div className="search-results">
			<h1>搜尋：{text}</h1>
			<p>找到 {segments.length} 個相關字詞：</p>
			<ul>
				{segments.map((seg, idx) => (
					<li key={idx}>
						<strong>{seg.part}</strong>: {seg.def}
					</li>
				))}
			</ul>
		</div>
	);
}

/**
 * 找不到結果的頁面
 */
interface NotFoundPageProps {
	text: string;
}

export function NotFoundPage(props: NotFoundPageProps) {
	const { text } = props;

	return (
		<div className="not-found">
			<h1>找不到：{text}</h1>
			<p>查無此詞彙，請嘗試其他關鍵字。</p>
		</div>
	);
}

