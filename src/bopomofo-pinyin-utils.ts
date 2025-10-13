/**
 * 注音和拼音處理工具函數
 * 基於原專案 view.ls 的實作邏輯
 */

export interface BopomofoPinyinData {
	ruby: string;
	youyin: string;
	bAlt: string;
	pAlt: string;
	cnSpecific: string;
	pinyin: string;
	bopomofo: string;
}

/**
 * 裝飾 Ruby 標註 - 基於原專案的 decorate-ruby 函數
 */
export function decorateRuby(params: {
	LANG: string;
	title?: string;
	bopomofo?: string;
	py?: string;
	pinyin?: string;
	trs?: string;
}): BopomofoPinyinData {
	const { LANG, title = '', bopomofo, py, pinyin = py, trs } = params;

	let processedPinyin = pinyin || trs || '';
	let processedBopomofo = bopomofo || '';

	// 清理拼音
	if (LANG !== 'c') {
		processedPinyin = processedPinyin.replace(/<[^>]*>/g, '').replace(/（.*）/, '');
	}
	processedPinyin = processedPinyin || '';

	// 清理注音
	if (LANG !== 'c') {
		processedBopomofo = processedBopomofo.replace(/<[^>]*>/g, '');
	}
	processedBopomofo = processedBopomofo || '';

	// 處理拼音格式
	processedPinyin = processedPinyin
		.replace(/ɡ/g, 'g')
		.replace(/ɑ/g, 'a')
		.replace(/，/g, ', ');

	// 處理又音
	let youyin = '';
	if (processedBopomofo.match(/^（[語|讀|又]音）/)) {
		youyin = processedBopomofo.replace(/（([語|讀|又]音)）.*/, '$1');
	}

	// 處理變音和又音
	let bAlt = '';
	if (processedBopomofo.match(/[變|\/]/)) {
		bAlt = processedBopomofo.replace(/.*[\(變\)\u200B|\/](.*)/, '$1');
	} else if (processedBopomofo.match(/.+（又音）.+/)) {
		bAlt = processedBopomofo.replace(/.+（又音）/, '');
	}

	bAlt = bAlt.replace(/ /g, '\u3000').replace(/([ˇˊˋ])\u3000/g, '$1 ');

	let pAlt = '';
	if (processedPinyin.match(/[變|\/]/)) {
		pAlt = processedPinyin.replace(/.*[\(變\)\u200B|\/](.*)/, '$1');
	} else if (processedBopomofo.match(/.+（又音）.+/)) {
		const pyArray = processedPinyin.split(' ');
		for (let i = 0; i < pyArray.length / 2 - 1; i++) {
			pyArray.shift();
		}
		pAlt = pyArray.join(' ');
	}

	// 處理注音符號格式
	processedBopomofo = processedBopomofo
		.replace(/([^ ])(ㄦ)/g, '$1 $2')
		.replace(/([ ]?[\u3000][ ]?)/g, ' ')
		.replace(/([ˇˊˋ˪˫])[ ]?/g, '$1 ')
		.replace(/([ㆴㆵㆶㆷ][̍͘]?)/g, '$1 ');

	// 處理大陸特定標記
	let cnSpecific = '';
	if (processedBopomofo.match(/陸/)) {
		cnSpecific = 'cn-specific';
	}

	// 清理注音
	let b = processedBopomofo
		.replace(/\s?[，、；！。－—,\.;]\s?/g, ' ')
		.replace(/（[語|讀|又]音）[\u200B]?/, '')
		.replace(/\(變\)\u200B\/.*/, '')
		.replace(/\/.*/, '');

	let cnSpecificBpmf = '';
	if (b.match(/<br>陸/)) {
		cnSpecificBpmf = b.replace(/.*<br>陸./, '');
	}
	b = b.replace(/<br>(.*)/, '').replace(/.\u20DF/g, '');

	// 生成 Ruby 標註
	let ruby = '';
	const rCjkOne = /^(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[^？，、；！。－—<>])$/;
	const rCjkG = /([\uD800-\uDBFF][\uDC00-\uDFFF]|[^？，、；！。－—<>])/g;

    if (rCjkOne.test(title)) {
        ruby = `<div class="stroke" title="筆順動畫"><rb>${title}</rb></div>`;
    } else {
        // 構造 <rb> 基底：將每個字分拆，保留連結，並包在 <rb> 內
        ruby = buildRubyBases(title);
    }

	// 處理拼音
	let p = processedPinyin
		.replace(/\(變\)\u200B.*/, '')
		.replace(/\/.*/, '')
		.replace(/<br>.*/, '');

	const convertedP = convertPinyin(p);
	const pArray = convertedP.replace(/[,\.;，、；！。－—]\s?/g, ' ').split(' ');
	const originalPArray = p.replace(/[,\.;，、；！。－—]\s?/g, ' ').split(' ');

	// 生成 Ruby 標註的拼音部分
	const pUpper: string[] = [];
	const isParallel = false; // 簡化實作，暫時不處理並列顯示

	for (let idx = 0; idx < pArray.length; idx++) {
		const yin = pArray[idx];
		let span = '';

		// 處理閩南語典的隔音符
		if (LANG === 't' && yin.match(/[-\u2011]/g)) {
			const matches = yin.match(/[-\u2011]+/g);
			span = ` rbspan="${(matches ? matches.length : 0) + 1}"`;
		}
		// 處理國語兒化音
		else if (LANG !== 't' && yin.match(/^[^eēéěè].*r\d?$/) && !yin.match(/^(j|ch|sh)r$/)) {
			if (cnSpecificBpmf) {
				const cns = cnSpecificBpmf.split(/\s+/);
				const tws = b.split(/\s+/);
				tws[tws.length - 2] = cns[cns.length - 2];
				bAlt = b.replace(/ /g, '\u3000').replace(/\sㄦ$/, 'ㄦ');
				b = tws.join(' ');
			}
			span = ' rbspan="2"';
		}
		// 處理兩岸詞典的元音群
		else if (LANG !== 't' && yin.match(/[aāáǎàeēéěèiīíǐìoōóǒòuūúǔùüǖǘǚǜ]+/g)) {
			const matches = yin.match(/[aāáǎàeēéěèiīíǐìoōóǒòuūúǔùüǖǘǚǜ]+/g);
			span = ` rbspan="${matches ? matches.length : 1}"`;
		}

		pUpper[idx] = isParallel ? `<rt${span}>${originalPArray[idx]}</rt>` : '';
		pArray[idx] = `<rt${span}>${yin}</rt>`;
	}

	// 組裝 Ruby 標註
	ruby += '<rtc class="zhuyin" hidden="hidden"><rt>' + b.replace(/[ ]+/g, '</rt><rt>') + '</rt></rtc>';
	ruby += '<rtc class="romanization" hidden="hidden">';
	ruby += pArray.join('');
	ruby += '</rtc>';

	if (isParallel) {
		ruby += '<rtc class="romanization" hidden="hidden">';
		ruby += pUpper.join('');
		ruby += '</rtc>';
	}

	// 處理兩岸詞典的特殊情況
	if (LANG === 'c') {
		if (processedBopomofo.match(/<br>/)) {
			processedPinyin = processedPinyin.replace(/.*<br>/, '').replace(/陸./, '').replace(/\s?([,\.;])\s?/g, '$1 ');
			processedBopomofo = processedBopomofo.replace(/.*<br>/, '').replace(/陸./, '').replace(/\s?([，！。；])\s?/g, '$1');
			processedBopomofo = processedBopomofo.replace(/ /g, '\u3000').replace(/([ˇˊˋ])\u3000/g, '$1 ');
		} else {
			processedPinyin = '';
			processedBopomofo = '';
		}
	} else if (LANG === 'h') {
		processedBopomofo = '';
	}

	return {
		ruby,
		youyin,
		bAlt,
		pAlt,
		cnSpecific,
		pinyin: processedPinyin,
		bopomofo: processedBopomofo
	};
}

// 將標題 HTML 轉成一串 <rb>…</rb>，錨點內每字一個 <rb><a/></rb>
function buildRubyBases(titleHtml: string): string {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cheerio = require('cheerio');
        const $ = cheerio.load(`<div id="wrap">${titleHtml}</div>`);
        const out: string[] = [];
        $('#wrap').contents().each((_: any, node: any) => {
            if (node.type === 'text') {
                const text = (node.data || '').replace(/\s+/g, '');
                for (const ch of text) out.push(`<rb>${ch}</rb>`);
            } else if (node.type === 'tag' && node.name === 'a') {
                const href = $(node).attr('href') || '';
                const text = $(node).text();
                for (const ch of text) out.push(`<rb><a href="${href}">${ch}</a></rb>`);
            } else {
                const text = $(node).text().replace(/\s+/g, '');
                for (const ch of text) out.push(`<rb>${ch}</rb>`);
            }
        });
        return out.join('');
    } catch (_e) {
        // 退路：去標籤後逐字包 <rb>
        const plain = titleHtml.replace(/<[^>]*>/g, '');
        return Array.from(plain).map((ch) => `<rb>${ch}</rb>`).join('');
    }
}

/**
 * 轉換拼音 - 簡化版本
 */
function convertPinyin(yin: string): string {
	// 簡化實作，主要處理基本格式
	return yin.replace(/-/g, '\u2011');
}

/**
 * 格式化注音符號顯示
 */
export function formatBopomofo(bopomofo: string): string {
	if (!bopomofo) return '';

	// 處理聲調標記，但保持原有的空格結構
	return bopomofo
		.replace(/([ˇˊˋ˪˫])/g, '<span class="tone">$1</span>');
}

/**
 * 格式化拼音顯示
 */
export function formatPinyin(pinyin: string): string {
	if (!pinyin) return '';

	// 處理聲調標記，但保持原有的空格結構
	return pinyin
		.replace(/([āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ])/g, '<span class="tone">$1</span>');
}
