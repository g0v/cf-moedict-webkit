// Port of moedict-webkit/scripts/RightAngle.ls (ruby2hruby) to TypeScript
// Generates hruby/ru/zhuyin/yin/diao structure identical to original project

import * as cheerio from 'cheerio';

const UNICODE = {
	zhuyin: {
		base: /[\u3105-\u312D\u31A0-\u31BA]/,
		initial: /[\u3105-\u3119\u312A-\u312C\u31A0-\u31A3]/,
		medial: /[\u3127-\u3129]/,
		final: /[\u311A-\u3129\u312D\u31A4-\u31B3\u31B8-\u31BA]/,
		tone: /[\u02D9\u02CA\u02C5\u02C7\u02CB\u02EA\u02EB]/,
		ruyun: /[\u31B4-\u31B7][\u0307\u0358\u030d]?/,
	},
};

const rZyS = UNICODE.zhuyin.initial.source;
const rZyJ = UNICODE.zhuyin.medial.source;
const rZyY = UNICODE.zhuyin.final.source;
const rZyD = UNICODE.zhuyin.tone.source + '|' + UNICODE.zhuyin.ruyun.source;

const TYPESET = {
	zhuyin: {
		form: new RegExp('^\u02D9?(' + rZyS + ')?(' + rZyJ + ')?(' + rZyY + ')?(' + rZyD + ')?$'),
		diao: new RegExp('(' + rZyD + ')', 'g'),
	},
};

function toCodePointString(entity: string): string {
	const codePoint = parseInt(entity, 16);
	if (codePoint <= 0xffff) return String.fromCharCode(codePoint);
	const cp = codePoint - 0x10000;
	return String.fromCharCode((cp >> 10) + 0xd800) + String.fromCharCode((cp % 0x400) + 0xdc00);
}

export function ruby2hruby(html: string): string {
    const $ = cheerio.load(`<ruby class="rightangle">${html}</ruby>`);
	const $rbs = $('rb').toArray();
	const maxspan = $rbs.length;
    const $rus: any[] = [];

    $('rtc.zhuyin').each((_eIdx: number, e: any) => {
        $('rt', e).each((i: number, rt: any) => {
			if (!$rbs[i]) return;
			const $rb = $(($rbs[i] as any)).clone();
			const $rt = $(rt);
			const $ru = $('<ru/>');
			const $zhuyin = $('<zhuyin/>' as any);
			const $yin = $('<yin/>' as any);
			const $diao = $('<diao/>' as any);

			const zhuyin = $rt.text();
			const yin = zhuyin.replace(TYPESET.zhuyin.diao, '');
			const len = yin ? yin.length : 0;
			const diao = zhuyin
				.replace(yin, '')
				.replace(/[\u02C5]/g, '\u02C7')
				.replace(/[\u030D]/g, '\u0358')
				.replace(/[\u0358]/g, '\u0307');
            const form = ((): string => {
                const m = zhuyin.replace(TYPESET.zhuyin.form, (_s: string, s: string, j: string, y: string) => {
					return [s ? 'S' : null, j ? 'J' : null, y ? 'Y' : null].filter(Boolean).join('');
				});
				return m;
			})();

			$diao.html(diao);
			$yin.html(yin);
			$zhuyin.append($yin);
			$zhuyin.append($diao);
			$ru.append($rb);
			$ru.append($zhuyin);
			$ru.attr('zhuyin', '');
			$ru.attr('diao', diao);
			$ru.attr('length', String(len));
			$ru.attr('form', form);
			$($rbs[i] as any).replaceWith($ru);
			$rus.push($ru);
		});
	});

	$('rtc.zhuyin').remove();

    const spans: number[] = [];
    $('rtc').each((order: number, e: any) => {
        $('rt', e).each((i: number, rt: any) => {
			let span = 0;
            let aRb: any[] = [];
			if (order === 0) {
				const rbspan = Math.min(Number($(rt).attr('rbspan') || 1), maxspan);
				while (rbspan > span) {
					const rb = ($rus.shift() as any)?.get(0);
					if (!rb) break;
					aRb.push(rb);
					span += Number($(rb).attr('span') || 1);
				}
				if (rbspan < span) {
					if (aRb.length > 1) return;
					aRb = $(aRb[0]).find('rb').get();
					// trim extra
					aRb = aRb.slice(0, rbspan);
					span = rbspan;
				}
				spans[i] = span;
			} else {
				span = spans[i];
				aRb = [$('ru[order=0]').eq(i).get(0)!];
			}
            const $ru = $('<ru/>' as any);
            const $rt = $(rt).clone();
			$ru.html(
				aRb
					.map((rb) => (rb ? $.html(rb) : ''))
					.join('')
			);
			$ru.append($rt);
			$ru.attr('span', String(span));
			$ru.attr('order', String(order));
			$ru.attr('class', $('ruby').attr('class') || '');
			$ru.attr(
				'annotation',
				$rt
					.text()
					.replace(/\u0061[\u0307\u030d\u0358]/g, '\uDB80\uDC61')
					.replace(/\u0065[\u0307\u030d\u0358]/g, '\uDB80\uDC65')
					.replace(/\u0069[\u0307\u030d\u0358]/g, '\uDB80\uDC69')
					.replace(/\u006F[\u0307\u030d\u0358]/g, '\uDB80\uDC6F')
					.replace(/\u0075[\u0307\u030d\u0358]/g, '\uDB80\uDC75')
			);
			$(aRb.shift() as any).replaceWith($ru);
			for (const x of aRb) $(x).remove();
		});
	});

	$('rtc').remove();
	$('rt').attr('style', 'text-indent: -9999px; color: transparent');

    const out = $('ruby')
        .html()!
        .replace(/&#x([0-9a-fA-F]+);/g, (_m: string, hex: string) => toCodePointString(hex));
	return out;
}

export function rightAngle(html: string): string {
	const inner = ruby2hruby(html);
	return `<hruby class="rightangle" rightangle="rightangle">${inner}</hruby>`;
}


