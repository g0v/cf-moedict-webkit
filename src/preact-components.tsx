/**
 * 簡單的 Preact 組件 - SSR 渲染字典頁面
 * 只顯示基本的字典資料
 */

import { DictionaryAPIResponse, DictionaryLang } from './types';
import { NavbarComponent } from './navbar-component';

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
		<>
			{/* 導航列 */}
			<NavbarComponent
				currentLang={lang}
				onLangChange={(newLang) => {
					// TODO: 實現語言切換邏輯
					console.log('語言切換到:', newLang);
				}}
			/>

			<div className="result">
			{/* 標題 */}
			<h1 className="title" dangerouslySetInnerHTML={{ __html: title || text }} />

			{/* 異音字列表 */}
			{heteronyms.map((het: any, idx: number) => (
				<div key={idx} className="entry">
					{/* 注音/拼音 */}
					{het.bopomofo && (
						<div className="bopomofo">
							<span className="bopomofo">{het.bopomofo}</span>
						</div>
					)}
					{het.pinyin && (
						<div className="pinyin">
							<span className="pinyin">{het.pinyin}</span>
						</div>
					)}

					{/* 定義列表 */}
					{het.definitions && het.definitions.length > 0 && (
						<div className="entry-item">
							<ol>
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
												<span className="part-of-speech">似</span>
												<span dangerouslySetInnerHTML={{ __html: def.synonyms.replace(/,/g, '、') }} />
											</div>
										)}
										{def.antonyms && (
											<div className="antonyms">
												<span className="part-of-speech">反</span>
												<span dangerouslySetInnerHTML={{ __html: def.antonyms.replace(/,/g, '、') }} />
											</div>
										)}
									</li>
								))}
							</ol>
						</div>
					)}
				</div>
			))}

			{/* 翻譯 */}
			{translation && (
				<div className="xrefs">
					<span className="translation">
						{translation.English && (
							<div className="xref-line">
								<span className="fw_lang">英</span>
								<span className="fw_def">{formatTranslation(translation.English)}</span>
							</div>
						)}
						{translation.Deutsch && (
							<div className="xref-line">
								<span className="fw_lang">德</span>
								<span className="fw_def">{formatTranslation(translation.Deutsch)}</span>
							</div>
						)}
						{translation.francais && (
							<div className="xref-line">
								<span className="fw_lang">法</span>
								<span className="fw_def">{formatTranslation(translation.francais)}</span>
							</div>
						)}
					</span>
				</div>
			)}

			{/* 跨語言對照 */}
			{xrefs && xrefs.length > 0 && (
				<div className="xrefs">
					{xrefs.map((xref: any, xrefIdx: number) => (
						<div key={xrefIdx} className="xref-line">
							<span className="xref part-of-speech">{getLangName(xref.lang)}</span>
							<span className="xref">
								{xref.words.map((word: string, wordIdx: number) => (
									<span key={wordIdx}>
										{wordIdx > 0 && '、'}
										{word}
									</span>
								))}
							</span>
						</div>
					))}
				</div>
			)}
			</div>
		</>
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
		<>
			{/* 導航列 */}
			<NavbarComponent
				currentLang="a"
				onLangChange={(newLang) => {
					// TODO: 實現語言切換邏輯
					console.log('語言切換到:', newLang);
				}}
			/>

			<div className="result">
			<h1 className="title">搜尋：{text}</h1>
			<p>找到 {segments.length} 個相關字詞：</p>
			<div className="entry">
				<div className="entry-item">
					<ul>
						{segments.map((seg, idx) => (
							<li key={idx}>
								<span className="def">
									<strong>{seg.part}</strong>: {seg.def}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
			</div>
		</>
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
		<>
			{/* 導航列 */}
			<NavbarComponent
				currentLang="a"
				onLangChange={(newLang) => {
					// TODO: 實現語言切換邏輯
					console.log('語言切換到:', newLang);
				}}
			/>

			<div className="result">
			<h1 className="title">找不到：{text}</h1>
			<div className="entry">
				<div className="entry-item">
					<p className="def">查無此詞彙，請嘗試其他關鍵字。</p>
				</div>
			</div>
			</div>
		</>
	);
}

