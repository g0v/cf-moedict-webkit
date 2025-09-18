import { Env, DictionaryLang, DictionaryAPIResponse, ErrorResponse } from './types';
import { handleDictionaryAPI } from './dictionary';
import { handleImageGeneration, generateSimpleTextSVG } from './image-generation';
import { handlePageRequest } from './page-rendering';
import { handleStaticAssets } from './static-assets';
import { Resvg } from '@cf-wasm/resvg';

/**
 * CloudFlare Worker 主要處理函數
 * 複刻 moedict-webkit 的後端功能
 */
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		try {
			// 測試路由 - 字圖生成 prototype
			if (url.pathname === '/test/prototype.png') {
				return await handlePrototypeImageGeneration();
			}

			// 路由處理
			if (url.pathname.endsWith('.json')) {
				return await handleDictionaryAPI(url, env);
			}

			if (url.pathname.endsWith('.png')) {
				return await handleImageGeneration(url, env);
			}

			if (url.pathname.endsWith('.html') || url.pathname === '/') {
				return await handlePageRequest(url, env);
			}

			// 靜態資源處理
			if (url.pathname.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|otf)$/)) {
				return await handleStaticAssets(url, env);
			}

			// 預設處理 - 嘗試作為字典查詢
			return await handlePageRequest(url, env);

		} catch (error) {
			console.error('Worker error:', error);

			const errorResponse: ErrorResponse = {
				error: 'Internal Server Error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * 解析 URL 路徑，提取語言和文字
 */
export function parseTextFromUrl(pathname: string): { text: string; lang: DictionaryLang; cleanText: string } {
	// 移除 .json, .png, .html 等副檔名
	let text = pathname.replace(/\.(json|png|html)$/, '');

	// 移除開頭的斜線
	text = text.replace(/^\//, '');

	// URL 解碼
	text = decodeURIComponent(text);

	// 處理特殊重定向
	if (text.match(/^[~:!]?=\*/)) {
		text = text.replace(/^[~:!]?=\*/, '');
	}

	// 解析語言前綴
	let lang: DictionaryLang = 'a'; // 預設華語
	let cleanText = text;

	if (text.startsWith("'") || text.startsWith('!')) {
		lang = 't'; // 台語
		cleanText = text.substring(1);
	} else if (text.startsWith(':')) {
		lang = 'h'; // 客語
		cleanText = text.substring(1);
	} else if (text.startsWith('~')) {
		lang = 'c'; // 兩岸
		cleanText = text.substring(1);
	}

	return { text, lang, cleanText };
}

/**
 * 修復 mojibake (亂碼) 問題
 */
export function fixMojibake(text: string): string {
	// 檢查是否為 Latin-1 編碼的中文字符
	if (/^[\u0080-\u00FF]/.test(text)) {
		// 簡單的 Latin-1 到 UTF-8 轉換
		// 在 CloudFlare Worker 中，通常不需要特別處理
		// 因為 Worker 環境已經正確處理 UTF-8
		return text;
	}
	return text;
}

/**
 * 生成 CORS 標頭
 */
export function getCORSHeaders(): HeadersInit {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
}

/**
 * 處理 OPTIONS 請求
 */
export function handleOptionsRequest(): Response {
	return new Response(null, {
		status: 200,
		headers: getCORSHeaders(),
	});
}

/**
 * 處理 prototype 測試請求
 * 生成單個"萌"字的字圖
 */
export async function handlePrototypeImageGeneration(): Promise<Response> {
	try {
		// 固定生成"萌"字
		const text = '萌';
		const font = 'kai';

		// 使用現有的 generateSimpleTextSVG 函數
		const svg = generateSimpleTextSVG(text, font);

		// 先測試 SVG 版本，看看 <text> 元素是否正確生成
		return new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=31536000', // 快取一年
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('Prototype image generation error:', error);

		// 返回錯誤圖片
		const errorSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
	<rect width="400" height="200" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
	<text x="200" y="100" text-anchor="middle" font-size="16" font-family="Arial" fill="#666">Prototype 圖片生成失敗</text>
</svg>`;

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
