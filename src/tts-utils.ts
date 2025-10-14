/**
 * 語音合成（TTS）工具
 * 目標：複刻原專案 view.ls 中 Translations.onClick 的行為
 * - 使用 SpeechSynthesisUtterance
 * - 語言：英(en-US) / 法(fr-FR) / 德(de-DE)
 * - 文字清理規則：移除 (A) 標記、非 ASCII 字元、", CL:" 片段、以及 '|' 後的非標點內容
 */

export type TTSSupportedLabel = '英' | '法' | '德';

/**
 * 語言代碼對應（英/法/德）
 */
export function getLanguageCode(label: string): string {
	switch (label) {
		case '英':
			return 'en-US';
		case '法':
			return 'fr-FR';
		case '德':
			return 'de-DE';
		default:
			return 'en-US';
	}
}

/**
 * 去除 HTML 標籤
 */
function untag(input: string): string {
	return input.replace(/<[^>]*>/g, '');
}

/**
 * 轉為字串
 */
function normalizeToString(value: unknown): string {
	if (Array.isArray(value)) return value.join(', ');
	return String(value ?? '');
}

/**
 * 清理用於 TTS 的文字（複刻原專案清理規則）
 */
export function cleanTextForTTS(value: unknown): string {
	let text = normalizeToString(value);
	text = untag(text);
	// 移除 , CL: 開頭之後的內容
	text = text.replace(/,\s*CL:.*/g, '');
	// 移除 | 後的非標點內容（近似原則：直到遇到常見標點或結尾）
	text = text.replace(/\|[^,\.\(\)\[\]\s]+/g, '');
	// 移除如 (A) 的大寫標記
	text = text.replace(/\([A-Z]\)/g, '');
	// 僅保留 ASCII 字符
	text = text.replace(/[^\x00-\x7F]/g, '');
	// 收斂多餘空白
	text = text.replace(/\s+/g, ' ').trim();
	return text;
}

/**
 * 在瀏覽器端發聲（需由使用者互動觸發）
 */
export function speakText(label: string, text: string): void {
	try {
		if (typeof window === 'undefined') return;
		const syn: SpeechSynthesis | undefined = (window as any).speechSynthesis;
		const Utter: typeof SpeechSynthesisUtterance | undefined = (window as any).SpeechSynthesisUtterance;
		if (!syn || !Utter) return;
		const cleaned = cleanTextForTTS(text);
		if (!cleaned) return;
		const u = new Utter(cleaned);
		u.lang = getLanguageCode(label);
		u.volume = 1.0;
		u.rate = 1.0;
		// Chrome: 若法語失敗，嘗試在 voices 已存在時挑選 fr-* voice
		if (label === '法') {
			try {
				const voices = syn.getVoices ? syn.getVoices() : [];
				const frList = (voices || []).filter(v => v && v.lang && String(v.lang).toLowerCase().indexOf('fr') === 0);
				const prefer = (frList || []).find(v => (v.name||'').toLowerCase().indexOf('google') >= 0 && String(v.lang).toLowerCase() === 'fr-fr')
					|| (frList || []).find(v => String(v.lang).toLowerCase() === 'fr-fr')
					|| (frList || []).find(v => String(v.lang).toLowerCase() === 'fr-ca')
					|| (frList || [])[0] || null;
				if (prefer) { u.voice = prefer; u.lang = prefer.lang; }
			} catch(_) {}
		}
		// Firefox 英語：挑選適合 voice 並微調參數，降低金屬音
		if (label === '英') {
			try {
				const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
				const isFirefox = ua.indexOf('Gecko/') >= 0 && ua.indexOf('Chrome/') < 0;
				const voices = syn.getVoices ? syn.getVoices() : [];
				const enList = (voices || []).filter(v => v && v.lang && String(v.lang).toLowerCase().indexOf('en') === 0)
					.filter(v => {
						const nm = (v.name||'').toLowerCase();
						return nm.indexOf('compact') < 0 && nm !== 'fred';
					});
				const prefer = enList.find(v => (v.name||'').toLowerCase().indexOf('samantha')>=0)
					|| enList.find(v => (v.name||'').toLowerCase().indexOf('alex')>=0)
					|| enList.find(v => String(v.lang).toLowerCase() === 'en-us')
					|| enList.find(v => String(v.lang).toLowerCase() === 'en-gb')
					|| enList.find(v => String(v.lang).toLowerCase() === 'en-au')
					|| enList[0] || null;
				if (prefer) { u.voice = prefer; u.lang = prefer.lang; }
				if (isFirefox) { u.rate = 0.95; u.pitch = 1.02; }
			} catch(_) {}
		}
		syn.speak(u);
	} catch (err) {
		// 靜默失敗，只記錄於 console 便於除錯
		try { console.warn('[TTS] 語音播放失敗', err); } catch (_) {}
	}
}


