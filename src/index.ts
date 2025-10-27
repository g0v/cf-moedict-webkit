import { Env, DictionaryLang, DictionaryAPIResponse, ErrorResponse } from './types';
import { handleDictionaryAPI } from './dictionary';
import { handleImageGeneration, generateTextSVGWithR2Fonts } from './image-generation';
import { handlePageRequest, handleAboutPageRequest } from './page-rendering';
import { handleStaticAssets } from './static-assets';
import { Resvg } from '@cf-wasm/resvg';
import { handleSubRouteAPI } from './sub-routes.js';

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
				return await handlePrototypeImageGeneration(env);
			}

			// 路由處理
			if (url.pathname.endsWith('.json')) {
				// 檢查是否為子路由格式 /a/, /t/, /h/, /c/, /raw/, /uni/, /pua/
				if (url.pathname.match(/^\/(a|t|h|c|raw|uni|pua)\//)) {
					return await handleSubRouteAPI(url, env);
				}
				return await handleDictionaryAPI(url, env);
			}

			// 處理 /raw/, /uni/, /pua/ 開頭的路由，即使沒有 .json 結尾
			if (url.pathname.match(/^\/(raw|uni|pua)\/.+/)) {
				// 自動補上 .json 後交給 handleSubRouteAPI 處理
				const modifiedUrl = new URL(request.url);
				modifiedUrl.pathname = url.pathname + '.json';
				return await handleSubRouteAPI(modifiedUrl, env);
			}

			if (url.pathname.match(/^\/[^\/]+\.png$/)) {
				return await handleImageGeneration(url, env);
			}

			// 處理 about.html 頁面
			if (url.pathname === '/about.html') {
				return await handleAboutPageRequest(url, env);
			}

			// 部首檢索頁面（/@ 以及 /@{部首}）
			if (url.pathname === '/@' || url.pathname.startsWith('/@')) {
				return await handlePageRequest(url, env);
			}

			if (url.pathname.endsWith('.html') || url.pathname === '/') {
				return await handlePageRequest(url, env);
			}

			// 靜態資源處理 (排除字體檔案，字體直接從 R2 端點載入)
			if (url.pathname.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg)$/)) {
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
	console.log('🔍 [ParseTextFromUrl] 開始解析 URL 路徑:', pathname);

	// 移除 .json, .png, .html 等副檔名
	let text = pathname.replace(/\.(json|png|html)$/, '');
	console.log('🔍 [ParseTextFromUrl] 移除副檔名後:', text);

	// 移除開頭的斜線
	text = text.replace(/^\//, '');
	console.log('🔍 [ParseTextFromUrl] 移除開頭斜線後:', text);

	// URL 解碼
	text = decodeURIComponent(text);
	console.log('🔍 [ParseTextFromUrl] URL 解碼後:', text);

	// 處理特殊重定向
	if (text.match(/^[~:!]?=\*/)) {
		text = text.replace(/^[~:!]?=\*/, '');
		console.log('🔍 [ParseTextFromUrl] 處理特殊重定向後:', text);
	}

	// 解析語言前綴
	let lang: DictionaryLang = 'a'; // 預設華語
	let cleanText = text;

	if (text.startsWith("'") || text.startsWith('!')) {
		lang = 't'; // 台語
		cleanText = text.substring(1);
		console.log('🔍 [ParseTextFromUrl] 識別為台語，lang:', lang, 'cleanText:', cleanText);
	} else if (text.startsWith(':')) {
		lang = 'h'; // 客語
		cleanText = text.substring(1);
		console.log('🔍 [ParseTextFromUrl] 識別為客語，lang:', lang, 'cleanText:', cleanText);
	} else if (text.startsWith('~')) {
		lang = 'c'; // 兩岸
		cleanText = text.substring(1);
		console.log('🔍 [ParseTextFromUrl] 識別為兩岸，lang:', lang, 'cleanText:', cleanText);
	} else {
		console.log('🔍 [ParseTextFromUrl] 預設華語，lang:', lang, 'cleanText:', cleanText);
	}

	console.log('🔍 [ParseTextFromUrl] 最終解析結果:', { text, lang, cleanText });
	return { text, lang, cleanText };
}

/**
 * 修復 mojibake (亂碼) 問題
 */
export function fixMojibake(text: string): string {
	console.log('🔍 [FixMojibake] 開始處理文字:', text);

	// 檢查是否為 Latin-1 編碼的中文字符
	if (/^[\u0080-\u00FF]/.test(text)) {
		console.log('🔍 [FixMojibake] 檢測到 Latin-1 編碼字符');
		// 簡單的 Latin-1 到 UTF-8 轉換
		// 在 CloudFlare Worker 中，通常不需要特別處理
		// 因為 Worker 環境已經正確處理 UTF-8
		return text;
	}

	console.log('🔍 [FixMojibake] 無需修復，返回原文字');
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
export async function handlePrototypeImageGeneration(env: Env): Promise<Response> {
	try {
		// 測試兩個字符
		const text = '萌典';
		const font = 'kai';

		// 使用新的 R2 SVG 功能
		const svg = await generateTextSVGWithR2Fonts(text, font, env);

		// 使用 resvg 將 SVG 轉換為 PNG
		const resvg = new Resvg(svg);
		const pngData = resvg.render();
		const pngBuffer = pngData.asPng();

		return new Response(pngBuffer as unknown as ArrayBuffer, {
			headers: {
				'Content-Type': 'image/png',
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

			return new Response(pngBuffer as unknown as ArrayBuffer, {
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
