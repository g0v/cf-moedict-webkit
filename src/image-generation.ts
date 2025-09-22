import { Env, FontConfig, FONT_MAP, WT2FONT, ImageGenerationOptions, LayoutDimensions, CharPosition } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { Resvg } from '@cf-wasm/resvg';

/**
 * 處理圖片生成請求
 * 對應原本的 @get '/:text.png' 路由
 * 使用 SVG + resvg 生成 PNG 圖片
 */
export async function handleImageGeneration(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);
	const fontParam = url.searchParams.get('font') || 'kai';

	try {
		// 限制文字長度
		const displayText = fixedText.slice(0, 50);

		// 生成 SVG 圖片
		const svg = generateSimpleTextSVG(displayText, fontParam);

		// 暫時先返回 SVG，等字體連上 R2 後再轉換為 PNG
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

		// 嘗試將錯誤 SVG 也轉換為 PNG
		try {
			const resvg = new Resvg(errorSVG);
			const pngData = resvg.render();
			const pngBuffer = pngData.asPng();

			return new Response(pngBuffer, {
				status: 500,
				headers: {
					'Content-Type': 'image/png',
					...getCORSHeaders(),
				},
			});
		} catch (pngError) {
			// 如果 PNG 轉換失敗，返回 SVG
			return new Response(errorSVG, {
				status: 500,
				headers: {
					'Content-Type': 'image/svg+xml',
					...getCORSHeaders(),
				},
			});
		}
	}
}

/**
 * 生成簡單的文字 SVG
 */
export function generateSimpleTextSVG(text: string, font: string): string {
	const { width, height } = calculateLayout(text);
	const cellSize = 375;
	const charWidth = 360; // 九宮格間距
	const gridSize = 355;  // 九宮格大小

	// 計算 SVG 尺寸 - 使用原本的正方形邏輯
	const svgWidth = width * 375;  // 原本的邏輯：w * 375
	const svgHeight = width * 375; // 原本的邏輯：w * 375（正方形）

	// 計算 padding，讓內容在正方形中垂直居中
	const padding = (width - height) / 2;

	// 計算 margin，讓左右留白一致（原本的邏輯）
	const margin = (width * 15) / 2;

	// 生成九宮格背景
	const gridElements = [];
	for (let i = 0; i < width * height; i++) {
		const row = Math.floor(i / width);
		const col = i % width;
		// 計算九宮格位置：使用原本的邏輯，考慮 padding
		const x = margin + col * charWidth - (i % width) * 10;
		const y = 10 + (padding + row) * cellSize;

		const char = text[i];

		if (!char || char === ' ') {
			continue;
		} else {
			gridElements.push(`
				<rect x="${x}" y="${y}" width="${gridSize}" height="${gridSize}"
					fill="#F9F6F6" stroke="#A33" stroke-width="5"/>
				<line x1="${x}" y1="${y + 118}" x2="${x + gridSize}" y2="${y + 118}" stroke="#A33" stroke-width="2"/>
				<line x1="${x}" y1="${y + 236}" x2="${x + gridSize}" y2="${y + 236}" stroke="#A33" stroke-width="2"/>
				<line x1="${x + 118}" y1="${y}" x2="${x + 118}" y2="${y + gridSize}" stroke="#A33" stroke-width="2"/>
				<line x1="${x + 236}" y1="${y}" x2="${x + 236}" y2="${y + gridSize}" stroke="#A33" stroke-width="2"/>
			`);
		}
	}

	// 生成文字元素 - 使用 <text> 元素
	const textElements = [];
	for (let i = 0; i < text.length && i < width * height; i++) {
		const char = text[i];
		const row = Math.floor(i / width);
		const col = i % width;
		// 計算文字位置：使用原本的邏輯，考慮 padding
		const x = margin + col * charWidth + (charWidth / 2) - (i % width) * 10;
		const y = 10 + (padding + row) * cellSize + (cellSize / 2) - 30;

		textElements.push(`
			<text x="${x}" y="${y}" dy="0.35em">${char}</text>
		`);
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<style>
			text {
				font-family: serif, Times, Times New Roman, Arial, sans-serif;
				font-size: 355px;
				fill: #000;
				text-anchor: middle;
				/* Safari 特殊處理 */
				-webkit-font-smoothing: antialiased;
				-moz-osx-font-smoothing: grayscale;
			}
		</style>
	</defs>
	<rect width="${svgWidth}" height="${svgHeight}" fill="#F0F0F0"/>
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
 * 複製原本 moedict-webkit 的邏輯
 */
function calculateLayout(text: string): LayoutDimensions {
	const len = Math.min(text.length, 50);

	// 原本的邏輯：4個字符以內排成一行
	let width = len;

	// 超過4個字符才開始計算換行
	if (width > 4) {
		width = Math.ceil(len / Math.sqrt(len * 0.5));
	}

	const height = Math.ceil(len / width);

	// 確保高度不超過寬度（原本的邏輯）
	const finalHeight = Math.min(height, width);

	return { width, height: finalHeight, rows: finalHeight, cols: width };
}

/**
 * 計算字符位置
 * 簡化版本，確保文字在九宮格內正確居中
 */
function calculateCharPosition(char: string, font: string, col: number, row: number): CharPosition {
	const cellSize = 375;
	const margin = 15;
	const charWidth = 360;

	// 計算基礎位置 - 九宮格的中心
	let x = margin + col * charWidth + (charWidth / 2);
	let y = margin + row * cellSize + (cellSize / 2);

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
 * 在 Cloudflare Worker 環境中，使用系統支援的字體
 */
function getFontFamily(font: string): string {
	// 使用更通用的字體名稱，確保 Resvg 能夠識別
	const systemFonts: Record<string, string> = {
		'kai': 'serif, Times, Times New Roman',
		'ming': 'serif, Times, Times New Roman',
		'song': 'serif, Times, Times New Roman',
		'hei': 'sans-serif, Arial, Helvetica',
		'default': 'serif, Times, Times New Roman'
	};

	return systemFonts[font] || systemFonts['default'];
}
