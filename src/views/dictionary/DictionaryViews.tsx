/**
 * 字典相關頁面組件
 */

import { DictionaryAPIResponse, DictionaryLang } from '../../types';
import { NavbarComponent } from '../../components/navbar';
import { rightAngle } from '../../ruby2hruby';
import { decorateRuby, formatBopomofo, formatPinyin } from '../../bopomofo-pinyin-utils';
import { cleanTextForTTS } from '../../tts-utils';

// 依原專案：Kangxi 部首映射，成對儲存（奇數位為 Kangxi 符號，偶數位為對應顯示字）
const CJK_RADICALS = '⼀一⼁丨⼂丶⼃丿⼄乙⼅亅⼆二⼇亠⼈人⼉儿⼊入⼋八⼌冂⼍冖⼎冫⼏几⼐凵⼑刀⼒力⼓勹⼔匕⼕匚⼖匸⼗十⼘卜⼙卩⼚厂⼛厶⼜又⼝口⼞囗⼟土⼠士⼡夂⼢夊⼣夕⼤大⼥女⼦子⼧宀⼨寸⼩小⼪尢⼫尸⼬屮⼭山⼮巛⼯工⼰己⼱巾⼲干⼳幺⼴广⼵廴⼶廾⼷弋⼸弓⼹彐⼺彡⼻彳⼼心⼽戈⼾戶⼿手⽀支⽁攴⽂文⽃斗⽄斤⽅方⽆无⽇日⽈曰⽉月⽊木⽋欠⽌止⽍歹⽎殳⽏毋⽐比⽑毛⽒氏⽓气⽔水⽕火⽖爪⽗父⽘爻⽙爿⺦丬⽚片⽛牙⽜牛⽝犬⽞玄⽟玉⽠瓜⽡瓦⽢甘⽣生⽤用⽥田⽦疋⽧疒⽨癶⽩白⽪皮⽫皿⽬目⽭矛⽮矢⽯石⽰示⽱禸⽲禾⽳穴⽴立⽵竹⽶米⽷糸⺰纟⽸缶⽹网⽺羊⽻羽⽼老⽽而⽾耒⽿耳⾀聿⾁肉⾂臣⾃自⾄至⾅臼⾆舌⾇舛⾈舟⾉艮⾊色⾋艸⾌虍⾍虫⾎血⾏行⾐衣⾑襾⾒見⻅见⾓角⾔言⻈讠⾕谷⾖豆⾗豕⾘豸⾙貝⻉贝⾚赤⾛走⾜足⾝身⾞車⻋车⾟辛⾠辰⾡辵⻌辶⾢邑⾣酉⾤釆⾥里⾦金⻐钅⾧長⻓长⾨門⻔门⾩阜⾪隶⾫隹⾬雨⾭靑⾮非⾯面⾰革⾱韋⻙韦⾲韭⾳音⾴頁⻚页⾵風⻛风⾶飛⻜飞⾷食⻠饣⾸首⾹香⾺馬⻢马⾻骨⾼高⾽髟⾾鬥⾿鬯⿀鬲⿁鬼⿂魚⻥鱼⻦鸟⿃鳥⿄鹵⻧卤⿅鹿⿆麥⻨麦⿇麻⿈黃⻩黄⿉黍⿊黑⿋黹⿌黽⻪黾⿍鼎⿎鼓⿏鼠⿐鼻⿑齊⻬齐⿒齒⻮齿⿓龍⻰龙⿔龜⻳龟⿕龠';

function normalizeRadicalChar(input: string): string {
	try {
		if (!input) return '';
		// 移除可能的超連結標籤
		const raw = input.replace(/<[^>]*>/g, '');
		const idx = CJK_RADICALS.indexOf(raw);
		if (idx >= 0 && idx % 2 === 0) {
			// 將 Kangxi 符號轉為對應顯示字
			return CJK_RADICALS.charAt(idx + 1) || raw;
		}
		return raw;
	} catch (_e) { return input || ''; }
}

function RadicalGlyph(props: { char: string }) {
	const ch = normalizeRadicalChar(props.char);
	return (
		<span className="glyph">
			<a title="部首檢索" className="xref" href={`./#@${ch}`} style={{ color: 'white' }}> {ch}</a>
		</span>
	);
}

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
					<div key={idx} className="entry" style={{ position: 'relative' }}>
		                {/* 部首與筆畫區 */}
		                {(entry.radical || entry.stroke_count || entry.non_radical_stroke_count) && (
		                    <div className="radical">
		                        {entry.radical && <RadicalGlyph char={entry.radical} />}
		                        <span className="sym">+</span>
		                        <span>{typeof entry.non_radical_stroke_count === 'number' ? entry.non_radical_stroke_count : 0}</span>
		                        <span className="count"> = {typeof entry.stroke_count === 'number' ? entry.stroke_count : ''}</span>
		                    </div>
		                )}
		                {/* 星號按鈕：只在第一個異音條目顯示 */}
		                {idx === 0 && (
		                    <i
		                        className="star iconic-color icon-star-empty"
		                        title="加入字詞記錄簿"
								style={{ color: '#400', top: '50px', right: '0px' }}
		                        data-word={title || text}
		                        data-lang={lang}
		                    ></i>
		                )}

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
		                        <span
		                            className="fw_def"
		                            data-label="英"
		                            data-text={cleanTextForTTS(translation.English)}
		                        >
		                            {formatTranslation(translation.English)}
		                        </span>
		                    </div>
		                )}
		                {translation.Deutsch && (
		                    <div className="xref-line">
		                        <span className="fw_lang">德</span>
		                        <span
		                            className="fw_def"
		                            data-label="德"
		                            data-text={cleanTextForTTS(translation.Deutsch)}
		                        >
		                            {formatTranslation(translation.Deutsch)}
		                        </span>
		                    </div>
		                )}
		                {translation.francais && (
		                    <div className="xref-line">
		                        <span className="fw_lang">法</span>
		                        <span
		                            className="fw_def"
		                            data-label="法"
		                            data-text={cleanTextForTTS(translation.francais)}
		                        >
		                            {formatTranslation(translation.francais)}
		                        </span>
		                    </div>
		                )}
		            </span>
		        </div>
		    )}

		{/* 跨語言對照 */}
		{ xrefs && xrefs.length > 0 && (
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

/**
 * 獲取語言名稱
 */
function getLangName(lang: string): string {
	const langNames: Record<string, string> = {
		a: '華語',
		t: '台語',
		h: '客語',
		c: '兩岸'
	};
	return langNames[lang] || lang;
}

/**
 * 格式化翻譯內容（處理字串或陣列）
 */
function formatTranslation(value: string | string[]): string {
	let text: string;
	if (Array.isArray(value)) {
		text = value.join(', ');
	} else {
		text = value;
	}

	// 清理 HTML 標籤，只保留純文字
	return untag(text);
}

/**
 * 移除 HTML 標籤，保留純文字
 */
function untag(input: string): string {
	return input.replace(/<[^>]*>/g, '');
}


