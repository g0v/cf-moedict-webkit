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
	const { title, heteronyms = [] } = entry;

	return (
		<div className="dictionary-page">
			<h1>{title || text}</h1>

			{heteronyms.map((het: any, idx: number) => (
				<div key={idx} className="heteronym">
					{/* 注音/拼音 */}
					{het.bopomofo && <div className="bopomofo">{het.bopomofo}</div>}
					{het.pinyin && <div className="pinyin">{het.pinyin}</div>}

					{/* 定義列表 */}
					{het.definitions && het.definitions.length > 0 && (
						<ol className="definitions">
							{het.definitions.map((def: any, defIdx: number) => (
								<li key={defIdx}>
									{def.def && <div dangerouslySetInnerHTML={{ __html: def.def }} />}
								</li>
							))}
						</ol>
					)}
				</div>
			))}
		</div>
	);
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

