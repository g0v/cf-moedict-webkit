import { Env, FontConfig, FONT_MAP, WT2FONT, FONT2NAME, ImageGenerationOptions, LayoutDimensions, CharPosition } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { Resvg } from '@cf-wasm/resvg';

/**
 * 處理圖片生成請求
 * 對應原本的 @get '/:text.png' 路由
 * 使用 R2 中的字體 SVG 檔案 + resvg 生成 PNG 圖片
 */
export async function handleImageGeneration(url: URL, env: Env): Promise<Response> {
	const { text, lang, cleanText } = parseTextFromUrl(url.pathname);
	const fixedText = fixMojibake(cleanText);
	const fontParam = url.searchParams.get('font') || 'kai';

	try {
		// 限制文字長度
		const displayText = fixedText.slice(0, 50);

		// 檢查字體是否在 R2 中可用
		const fontName = getFontName(fontParam);
		const isFontAvailable = await checkFontAvailability(fontName, env);

		if (!isFontAvailable) {
			// 如果字體不可用，返回純文字錯誤說明
			const errorMessage = `目前R2中尚無${fontName}字體，待更新`;

			return new Response(errorMessage, {
				status: 404,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Cache-Control': 'public, max-age=3600', // 快取一小時
					...getCORSHeaders(),
				},
			});
		}

		// 生成 SVG 圖片，使用 R2 中的字體 SVG 檔案
		const svg = await generateTextSVGWithR2Fonts(displayText, fontParam, env);

		// 使用 resvg 將 SVG 轉換為 PNG
		const resvg = new Resvg(svg);
		const pngData = resvg.render();
		const pngBuffer = pngData.asPng();

		return new Response(pngBuffer, {
			headers: {
				'Content-Type': 'image/png',
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
 * 根據字體參數獲取字體名稱
 * 複製原本 moedict-webkit 的 font-of 函數邏輯
 */
function getFontName(fontParam: string): string {
	// 全字庫字體
	if (/sung/i.test(fontParam)) return 'TW-Sung';
	if (/ebas/i.test(fontParam)) return 'EBAS';
	if (/shuowen/i.test(fontParam)) return 'ShuoWen';

	// cwTeX Q 字體
	if (/cwming/i.test(fontParam)) return 'cwTeXQMing';
	if (/cwhei/i.test(fontParam)) return 'cwTeXQHei';
	if (/cwyuan/i.test(fontParam)) return 'cwTeXQYuan';
	if (/cwkai/i.test(fontParam)) return 'cwTeXQKai';
	if (/cwfangsong/i.test(fontParam)) return 'cwTeXQFangsong';

	// 思源黑體
	if (/srcx/i.test(fontParam)) return 'SourceHanSansTCExtraLight';
	if (/srcl/i.test(fontParam)) return 'SourceHanSansTCLight';
	if (/srcn/i.test(fontParam)) return 'SourceHanSansTCNormal';
	if (/srcr/i.test(fontParam)) return 'SourceHanSansTCRegular';
	if (/srcm/i.test(fontParam)) return 'SourceHanSansTCMedium';
	if (/srcb/i.test(fontParam)) return 'SourceHanSansTCBold';
	if (/srch/i.test(fontParam)) return 'SourceHanSansTCHeavy';

	// 思源宋體
	if (/shsx/i.test(fontParam)) return 'SourceHanSerifTCExtraLight';
	if (/shsl/i.test(fontParam)) return 'SourceHanSerifTCLight';
	if (/shsm/i.test(fontParam)) return 'SourceHanSerifTCMedium';
	if (/shsr/i.test(fontParam)) return 'SourceHanSerifTCRegular';
	if (/shss/i.test(fontParam)) return 'SourceHanSerifTCSemiBold';
	if (/shsb/i.test(fontParam)) return 'SourceHanSerifTCBold';
	if (/shsh/i.test(fontParam)) return 'SourceHanSerifTCHeavy';

	// 源雲明體
	if (/gwmel/i.test(fontParam)) return 'GenWanMinTWEL';
	if (/gwml/i.test(fontParam)) return 'GenWanMinTWL';
	if (/gwmr/i.test(fontParam)) return 'GenWanMinTWR';
	if (/gwmm/i.test(fontParam)) return 'GenWanMinTWM';
	if (/gwmsb/i.test(fontParam)) return 'GenWanMinTWSB';

	// 其他
	if (/rxkt/i.test(fontParam)) return 'Typography';
	if (/openhuninn/i.test(fontParam)) return 'jf-openhuninn-2.1';

	// 王漢宗字體
	if (WT2FONT[fontParam]) return WT2FONT[fontParam];

	// 預設字體
	return 'TW-Kai';
}

/**
 * 檢查字體是否在 R2 中可用
 * 通過檢查一個測試字符的 SVG 檔案是否存在
 */
async function checkFontAvailability(fontName: string, env: Env): Promise<boolean> {
	try {
		// 使用 "萌" 字 (U+840C) 作為測試字符
		const testUnicode = 0x840C;
		const svgPath = `${fontName}/U+${testUnicode.toString(16).toUpperCase().padStart(4, '0')}.svg`;

		console.log(`[DEBUG] Checking font availability: ${fontName}, test path: ${svgPath}`);

		const svgObject = await env.FONTS.get(svgPath);
		const isAvailable = svgObject !== null;

		console.log(`[DEBUG] Font ${fontName} availability: ${isAvailable}`);
		return isAvailable;
	} catch (error) {
		console.error(`[DEBUG] Error checking font availability for ${fontName}:`, error);
		return false;
	}
}


/**
 * 使用 R2 中的字體 SVG 檔案生成文字 SVG
 */
export async function generateTextSVGWithR2Fonts(text: string, font: string, env: Env): Promise<string> {
	const { width, height } = calculateLayout(text);
	const cellSize = 375;
	const charWidth = 360; // 九宮格間距
	const gridSize = 360;  // 九宮格大小

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
		// 計算九宮格位置：使用原本的邏輯
		const x = margin + col * charWidth;
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

	// 生成文字元素 - 使用 R2 中的 SVG 檔案
	const textElements = [];
	console.log(`[DEBUG] Processing text: "${text}", length: ${text.length}`);

	for (let i = 0; i < text.length && i < width * height; i++) {
		const char = text[i];
		const row = Math.floor(i / width);
		const col = i % width;

		// 計算文字位置：使用原本的邏輯
		const x = margin + col * charWidth + (charWidth / 2);
		const y = 10 + (padding + row) * cellSize + (cellSize / 2);

		// 獲取字符的 Unicode 編碼
		const unicode = char.codePointAt(0);
		if (!unicode) {
			console.log(`[DEBUG] No unicode for character: ${char}`);
			continue;
		}

		// 獲取字體名稱
		const fontName = getFontName(font);

		// 構建 SVG 檔案路徑
		const svgPath = `${fontName}/U+${unicode.toString(16).toUpperCase().padStart(4, '0')}.svg`;
		console.log(`[DEBUG] Character: ${char}, Unicode: U+${unicode.toString(16).toUpperCase()}, Font: ${fontName}, SVG Path: ${svgPath}`);

		try {
			// 從 R2 讀取 SVG 檔案
			console.log(`[DEBUG] Attempting to fetch SVG from R2: ${svgPath}`);
			const svgObject = await env.FONTS.get(svgPath);

			if (svgObject) {
				console.log(`[DEBUG] SVG object found for ${char}, size: ${svgObject.size} bytes`);
				const svgContent = await svgObject.text();
				console.log(`[DEBUG] SVG content length: ${svgContent.length} characters`);

				// 解析 SVG 內容，提取 path 元素和 transform
				const pathMatch = svgContent.match(/<path[^>]*d="([^"]*)"[^>]*>/);
				const transformMatch = svgContent.match(/<g[^>]*transform="([^"]*)"[^>]*>/);

				if (pathMatch) {
					const pathData = pathMatch[1];
					console.log(`[DEBUG] Path data found for ${char}, length: ${pathData.length} characters`);

					const initRatio = 360 / 1024;
					// 動態計算縮放比例 - 根據字體類型調整
					let scale = initRatio; // 預設縮放比例（楷體等，1024x1024）

					// 篆體字需要較小的縮放比例，因為其 SVG 尺寸較大
					// 楷體 SVG: 1024x1024, 篆體 SVG: 4096x4096 (4倍)
					// 楷體縮放 initRatio，篆體應該縮放 initRatio / 4
					if (fontName.includes('EBAS')) {
						scale = initRatio / 4; // 篆體使用較小的縮放比例，基於尺寸比例計算
						console.log(`[DEBUG] Using EBAS (seal script) scale: ${scale}`);
					}

					// 思源宋體的 SVG 尺寸為 1000x1000
					// 所有7個字重：ExtraLight, Light, Regular, Medium, SemiBold, Bold, Heavy
					else if (fontName.includes('SourceHanSerif')) {
						scale = initRatio * 1024 / 1000; // 思源宋體使用 1000x1000 的縮放比例
						console.log(`[DEBUG] Using SourceHanSerif scale: ${scale}`);
					}
					// 思源黑體的 SVG 尺寸為 1000x1000
					else if (fontName.includes('SourceHanSans')) {
						scale = initRatio * 1024 / 1000; // 思源黑體使用 1000x1000 的縮放比例
						console.log(`[DEBUG] Using SourceHanSans scale: ${scale}`);
					} else if (fontName.includes('jf-openhuninn-2.1')) {
						scale = initRatio; // jf-openhuninn-2.1使用 1024x1024 的縮放比例，與楷體相同
						console.log(`[DEBUG] Using jf-openhuninn-2.1 scale: ${scale}`);
					}
					// Typography 的 SVG 尺寸為 1024x1024, 與楷體相同
					else if (fontName.includes('Typography')) {
						scale = initRatio; // Typography使用 1024x1024 的縮放比例
						console.log(`[DEBUG] Using Typography scale: ${scale}`);
					}

					// ShuoWen 的 SVG 尺寸為 1024x1024，與楷體相同
					else if (fontName.includes('ShuoWen')) {
						scale = initRatio; // ShuoWen 使用與楷體相同的縮放比例
						console.log(`[DEBUG] Using ShuoWen scale: ${scale}`);
					}

					// HanWang 的 SVG 尺寸為 1024x1024，與楷體相同
					else if (fontName.includes('HanWang')) {
						scale = initRatio; // HanWang 使用與楷體相同的縮放比例
						console.log(`[DEBUG] Using HanWang scale: ${scale}`);
					}


					// 半形字（ASCII 可顯示範圍）在視覺上偏窄，向右再位移一些以達到置中視覺
					const isHalfWidth = /[\x20-\x7E]/.test(char);
					let halfWidthAdjustX = isHalfWidth ? 85 : 0; // 約半個半形字寬的視覺調整


					// 源雲明體的半形字寬度調整要再減30px
					if (fontName.includes('GenWanMin')) {
						halfWidthAdjustX = isHalfWidth ? 55 : 0;
						console.log(`[DEBUG] Using GenWanMin halfWidthAdjustX: ${halfWidthAdjustX}`);
					} else if (fontName.includes('jf-openhuninn-2.1')) {
						halfWidthAdjustX = isHalfWidth ? 65 : 0;
						console.log(`[DEBUG] Using jf-openhuninn-2.1 halfWidthAdjustX: ${halfWidthAdjustX}`);
					}



					// 動態計算位置：根據字符在九宮格中的位置，依 scale 調整
					// 基準縮放比例為 initRatio，其他縮放比例按比例調整偏移量
					const baseScale = initRatio;
					const scaleRatio = scale / baseScale;

					let offsetX = (x + halfWidthAdjustX) - (1024 * scale) / 2 - 180 * ( 1 - scaleRatio ); // X 位置依 scale 比例調整
					// 思源宋體的X偏移量要多50px
					if (fontName.includes('SourceHanSerif')) {
						offsetX += 50;
						console.log(`[DEBUG] Using SourceHanSerif offsetX: ${offsetX}`);
					}
					// 思源黑體的X偏移量也要多50px
					else if (fontName.includes('SourceHanSans')) {
						offsetX += 50;
						console.log(`[DEBUG] Using SourceHanSans offsetX: ${offsetX}`);
					}
					// 源雲明體的X偏移量也要多50px
					else if (fontName.includes('GenWanMin')) {
						offsetX += 50;
						console.log(`[DEBUG] Using GenWanMin offsetX: ${offsetX}`);
					}
					// jf-openhuninn-2.1 的X偏移量也要多45px
					else if (fontName.includes('jf-openhuninn-2.1')) {
						offsetX += 45;
						console.log(`[DEBUG] Using jf-openhuninn-2.1 offsetX: ${offsetX}`);
					}
					// Typography 的X偏移量也要多25px
					else if (fontName.includes('Typography')) {
						offsetX += 23;
						console.log(`[DEBUG] Using Typography offsetX: ${offsetX}`);
					}
					// ShuoWen 的X偏移量要多50px，與篆體類似
					else if (fontName.includes('ShuoWen')) {
						offsetX += 50;
						console.log(`[DEBUG] Using ShuoWen offsetX: ${offsetX}`);
					}
					// cwTeXQMing 全形字的X偏移量要多25px，但半形字不要
					else if (fontName.includes('cwTeXQMing') && !isHalfWidth) {
						offsetX += 25;
						console.log(`[DEBUG] Using cwTeXQMing full-width offsetX: ${offsetX}`);
					}


					let offsetY = y - (1024 * scale) / 2 -  (180 * (1 - scaleRatio )) + 280; // Y 位置依 scale 比例調整

					// ShuoWen 全形字的Y偏移量要多50px，但半形字不要多
					if (fontName.includes('ShuoWen') && !isHalfWidth) {
						offsetY += 50;
						console.log(`[DEBUG] Using ShuoWen full-width offsetY: ${offsetY}`);
					}

					// ShuoWen 半形字的Y偏移量要減10px，X偏移量要減50px
					if (fontName.includes('ShuoWen') && isHalfWidth) {
						offsetY -= 10;
						offsetX -= 50;
						console.log(`[DEBUG] Using ShuoWen half-width offsetX: ${offsetX}, offsetY: ${offsetY}`);
					}

					if (fontName.includes('HanWang') && isHalfWidth) {
						offsetX += 20;
						console.log(`[DEBUG] Using ShuoWen half-width offsetX: ${offsetX}, offsetY: ${offsetY}`);
					}

					// HanWangKanDaYan, HanWangKanTan, HanWangZonYi 的半形字X偏移量要減20px
					if ((fontName.includes('HanWangKanDaYan')
						 || fontName.includes('HanWangKanTan')
						 || fontName.includes('HanWangZonYi')) && isHalfWidth) {
						offsetX -= 20;
						console.log(`[DEBUG] Using HanWangKanDaYan or HanWangKanTan or HanWangZonYi half-width offsetX: ${offsetX}, offsetY: ${offsetY}`);
					}

					console.log(`[DEBUG] Character ${char} position: font=${fontName}, isHalfWidth=${isHalfWidth}, adjustX=${halfWidthAdjustX}, offsetX=${offsetX}, offsetY=${offsetY}, scale=${scale}`);

					// 簡單的 transform
					const combinedTransform = `translate(${offsetX}, ${offsetY}) scale(${scale})`;

					textElements.push(`
						<g transform="${combinedTransform}">
							<path d="${pathData}" fill="#000"/>
						</g>
					`);
				} else {
					console.log(`[DEBUG] No path element found in SVG for ${char}`);
					// 如果找不到 path 元素，使用 fallback 文字
					textElements.push(`
						<text x="${x}" y="${y}" dy="0.35em" font-family="serif" font-size="355px" fill="#000" text-anchor="middle">${char}</text>
					`);
				}
			} else {
				console.log(`[DEBUG] SVG object not found for ${char} at path: ${svgPath}`);
				// 如果找不到 SVG 檔案，使用 fallback 文字
				textElements.push(`
					<text x="${x}" y="${y}" dy="0.35em" font-family="serif" font-size="355px" fill="#000" text-anchor="middle">${char}</text>
				`);
			}
		} catch (error) {
			console.error(`[DEBUG] Error loading SVG for character ${char} (U+${unicode.toString(16)}):`, error);
			// 使用 fallback 文字
			textElements.push(`
				<text x="${x}" y="${y}" dy="0.35em" font-family="serif" font-size="355px" fill="#000" text-anchor="middle">${char}</text>
			`);
		}
	}

	console.log(`[DEBUG] Total text elements generated: ${textElements.length}`);

	const finalSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
	<rect width="${svgWidth}" height="${svgHeight}" fill="#F0F0F0"/>
	${gridElements.join('')}
	${textElements.join('')}
</svg>`;

	console.log(`[DEBUG] Final SVG generated, grid elements: ${gridElements.length}, text elements: ${textElements.length}`);
	console.log(`[DEBUG] SVG dimensions: ${svgWidth}x${svgHeight}`);
	console.log(`[DEBUG] Text element content: ${textElements[0] || 'No text elements'}`);

	return finalSVG;
}

/**
 * 生成簡單的文字 SVG（保留作為 fallback）
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
