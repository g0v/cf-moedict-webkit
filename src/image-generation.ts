import { Env, FontConfig, FONT_MAP, WT2FONT, ImageGenerationOptions, LayoutDimensions, CharPosition } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';

/**
 * 處理圖片生成請求
 * 對應原本的 @get '/:text.png' 路由
 * 暫時使用簡單的 SVG 生成，後續可以升級到 Satori + resvg
 */
export async function handleImageGeneration(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);
	const fontParam = url.searchParams.get('font') || 'kai';

	try {
		// 限制文字長度
		const displayText = fixedText.slice(0, 50);

		// 生成簡單的 SVG 圖片
		const svg = generateSimpleTextSVG(displayText, fontParam);

		return new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=31536000', // 快取一年
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('Image generation error:', error);

		// 返回錯誤圖片
		const errorSVG = generateErrorSVG('圖片生成失敗');

		return new Response(errorSVG, {
			status: 500,
			headers: {
				'Content-Type': 'image/svg+xml',
				...getCORSHeaders(),
			},
		});
	}
}

/**
 * 生成簡單的文字 SVG
 */
function generateSimpleTextSVG(text: string, font: string): string {
	const { width, height } = calculateLayout(text);
	const cellSize = 375;
	const margin = 15;
	const charWidth = 360;

	// 計算 SVG 尺寸
	const svgWidth = width * cellSize;
	const svgHeight = height * cellSize;

	// 生成九宮格背景
	const gridElements = [];
	for (let i = 0; i < width * height; i++) {
		const row = Math.floor(i / width);
		const col = i % width;
		const x = margin + col * charWidth;
		const y = margin + row * cellSize;

		gridElements.push(`
			<rect x="${x}" y="${y}" width="355" height="355"
			      fill="none" stroke="#000" stroke-width="2"/>
			<line x1="${x}" y1="${y + 118}" x2="${x + 355}" y2="${y + 118}" stroke="#000" stroke-width="2"/>
			<line x1="${x}" y1="${y + 236}" x2="${x + 355}" y2="${y + 236}" stroke="#000" stroke-width="2"/>
			<line x1="${x + 118}" y1="${y}" x2="${x + 118}" y2="${y + 355}" stroke="#000" stroke-width="2"/>
			<line x1="${x + 236}" y1="${y}" x2="${x + 236}" y2="${y + 355}" stroke="#000" stroke-width="2"/>
		`);
	}

	// 生成文字元素
	const textElements = [];
	for (let i = 0; i < text.length && i < width * height; i++) {
		const char = text[i];
		const row = Math.floor(i / width);
		const col = i % width;
		const { x, y } = calculateCharPosition(char, font, col, row);

		textElements.push(`
			<text x="${x}" y="${y}" font-size="355" font-family="${getFontFamily(font)}" fill="#000">${char}</text>
		`);
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
	<rect width="${svgWidth}" height="${svgHeight}" fill="#F9F6F6" stroke="#A33" stroke-width="8"/>
	${gridElements.join('')}
	${textElements.join('')}
</svg>`;
}

/**
 * 生成錯誤 SVG
 */
function generateErrorSVG(message: string): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
	<rect width="400" height="200" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
	<text x="200" y="100" text-anchor="middle" font-size="16" font-family="Arial" fill="#666">${message}</text>
</svg>`;
}

/**
 * 計算佈局尺寸
 */
function calculateLayout(text: string): LayoutDimensions {
	const len = Math.min(text.length, 50);
	let width = len;
	let height = Math.ceil(len / width);

	if (width > 4) {
		width = Math.ceil(len / Math.sqrt(len * 0.5));
		height = Math.ceil(len / width);
	}

	height = Math.min(height, width);

	return { width, height, rows: height, cols: width };
}

/**
 * 計算字符位置
 */
function calculateCharPosition(char: string, font: string, col: number, row: number): CharPosition {
	const cellSize = 375;
	const margin = 15;
	const charWidth = 360;

	let x = margin + col * charWidth;
	let y = margin + row * cellSize;

	// 字體特定的位置調整
	const adjustments = getFontAdjustments(font, char);
	x += adjustments.x;
	y += adjustments.y;

	// 特殊字符處理
	if (/[0-9a-zA-Z]/.test(char)) {
		x += 90;
	}

	return { x, y };
}

/**
 * 獲取字體調整值
 */
function getFontAdjustments(font: string, char: string): CharPosition {
	const adjustments: CharPosition = { x: 0, y: 0 };

	// 根據原代碼的字體調整邏輯
	if (font.includes('ShuoWen') && !/[\u3000\uFF01-\uFF5E]/.test(char)) {
		adjustments.x += 50;
		adjustments.y += 45;
	}

	if (font.includes('Typography') && !/[\u3000\uFF01-\uFF5E]/.test(char)) {
		adjustments.x += 25;
		adjustments.y += 5;
	}

	if (font.includes('openhuninn') && !/[\u3000\uFF01-\uFF5E]/.test(char)) {
		adjustments.y += 20;
	}

	if (font.includes('cwTeXQ') && !/[\u3000\uFF01-\uFF5E]/.test(char)) {
		adjustments.x += 15;
		adjustments.y += 15;
	}

	if (font.includes('SourceHanSerif') && !/[\u3000\uFF01-\uFF5E]/.test(char)) {
		adjustments.y += 30;
	}

	if (font.includes('SourceHanSans') && !/[\u3000\uFF01-\uFF5E]/.test(char)) {
		adjustments.y += 30;
	}

	if (font.includes('GenWanMin') && !/[\u3000\uFF01-\uFF5E]/.test(char)) {
		adjustments.y += 30;
	}

	return adjustments;
}

/**
 * 獲取字體家族名稱
 */
function getFontFamily(font: string): string {
	// 檢查是否為王漢宗字體
	if (WT2FONT[font]) {
		return WT2FONT[font];
	}

	// 檢查是否為預設字體映射
	if (FONT_MAP[font]) {
		return FONT_MAP[font].name;
	}

	// 預設字體
	return 'TW-Kai';
}
