/**
 * 簡單的 Preact 組件 - SSR 渲染字典頁面
 * 只顯示基本的字典資料
 */

import { DictionaryAPIResponse, DictionaryLang } from './types';
import AUDIO_MAP from './dict-concised.audio';
import { NavbarComponent } from './navbar-component';
import { rightAngle } from './ruby2hruby';
import { decorateRuby, formatBopomofo, formatPinyin } from './bopomofo-pinyin-utils';

/**
 * 根據語言獲取音檔 URL
 */
function getAudioUrl(lang: DictionaryLang, audioId: string): string {
	const httpMap: Record<DictionaryLang, string> = {
		a: 'https://203146b5091e8f0aafda-15d41c68795720c6e932125f5ace0c70.ssl.cf1.rackcdn.com',
		h: 'https://a7ff62cf9d5b13408e72-351edcddf20c69da65316dd74d25951e.ssl.cf1.rackcdn.com',
		t: 'https://1763c5ee9859e0316ed6-db85b55a6a3fbe33f09b9245992383bd.ssl.cf1.rackcdn.com',
		c: 'https://203146b5091e8f0aafda-15d41c68795720c6e932125f5ace0c70.ssl.cf1.rackcdn.com' // 兩岸詞典使用華語路由
	};

	return `${httpMap[lang]}/${audioId}.ogg`;
}

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
			{/* 異音字列表 */}
			{heteronyms.map((het: any, idx: number) => {
				// 處理注音和拼音顯示
				const rubyData = decorateRuby({
					LANG: lang,
					title: title || text,
					bopomofo: het.bopomofo,
					pinyin: het.pinyin,
					trs: het.trs
				});

				return (
					<div key={idx} className="entry">
                        {/* 標題和 Ruby 標註：使用原專案流程（decorate-ruby -> rightAngle） */}
                        <h1 className="title" data-title={title || text}>
                            {(() => {
                                const htmlRuby = rubyData.ruby || '';
                                if (!htmlRuby) {
                                    return <span dangerouslySetInnerHTML={{ __html: title || text }} />;
                                }
                                const hruby = rightAngle(htmlRuby);
                                return <span dangerouslySetInnerHTML={{ __html: hruby }} />;
                            })()}
                            {rubyData.youyin && (
                                <small className="youyin">{rubyData.youyin}</small>
                            )}
                            {het.audio_id && (
                                <span className="audioBlock">
                                    <i itemType="http://schema.org/AudioObject" className="icon-play playAudio part-of-speech">
                                        <meta itemProp="name" content={`${het.audio_id}.ogg`} />
                                        <meta itemProp="contentURL" content={getAudioUrl(lang, het.audio_id)} />
                                    </i>
                                </span>
                            )}
                        </h1>

						{/* 注音、拼音、朗讀按鈕區塊（包含原專案的播放按鈕樣式與邏輯所需標記） */}
						{(het.bopomofo || het.pinyin || rubyData.bAlt || rubyData.pAlt) && (
							<div className={`bopomofo ${rubyData.cnSpecific}`}>
								{/* 簡體字標記 */}
								{het.alt && (
									<div lang="zh-Hans" className="cn-specific">
										<span className="xref part-of-speech">简</span>
										<span className="xref">{het.alt}</span>
									</div>
								)}

								{/* 大陸特定注音拼音 */}
								{rubyData.cnSpecific && rubyData.pinyin && rubyData.bopomofo && (
									<small className="alternative cn-specific">
										<span className="pinyin" dangerouslySetInnerHTML={{ __html: formatPinyin(rubyData.pinyin) }} />
										<span className="bopomofo" dangerouslySetInnerHTML={{ __html: formatBopomofo(rubyData.bopomofo) }} />
									</small>
								)}

                                {/* 主要注音和拼音 */}
								<div className="main-pronunciation">
									{het.bopomofo && (
										<span className="bopomofo" dangerouslySetInnerHTML={{ __html: formatBopomofo(het.bopomofo) }} />
									)}
									{het.pinyin && (
										<span className="pinyin" dangerouslySetInnerHTML={{ __html: formatPinyin(het.pinyin) }} />
									)}
								</div>

								{/* 變音/又音 */}
								{(rubyData.bAlt || rubyData.pAlt) && (
									<small className="alternative">
										{rubyData.pAlt && (
											<span className="pinyin" dangerouslySetInnerHTML={{ __html: formatPinyin(rubyData.pAlt) }} />
										)}
										{rubyData.bAlt && (
											<span className="bopomofo" dangerouslySetInnerHTML={{ __html: formatBopomofo(rubyData.bAlt) }} />
										)}
									</small>
								)}
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
				);
			})}

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

