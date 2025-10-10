import { Env } from './types';
import { getCORSHeaders } from './index';

/**
 * 處理靜態資源請求
 * 對應原本的靜態檔案路由
 */
export async function handleStaticAssets(url: URL, env: Env): Promise<Response> {
	const pathname = url.pathname;

	try {
		// 從 R2 Storage 讀取靜態資源
		const asset = await env.ASSETS.get(pathname.substring(1)); // 移除開頭的 /

		if (!asset) {
			return new Response('Not Found', {
				status: 404,
				headers: getCORSHeaders(),
			});
		}

		// 根據檔案類型設定 Content-Type
		const contentType = getContentType(pathname);

		return new Response(asset.body, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000', // 快取一年
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('Static asset error:', error);

		return new Response('Internal Server Error', {
			status: 500,
			headers: getCORSHeaders(),
		});
	}
}

/**
 * 根據檔案副檔名獲取 Content-Type
 */
function getContentType(pathname: string): string {
	const ext = pathname.split('.').pop()?.toLowerCase();

	switch (ext) {
		case 'css':
			return 'text/css';
		case 'js':
			return 'application/javascript';
		case 'json':
			return 'application/json';
		case 'png':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'svg':
			return 'image/svg+xml';
		case 'ico':
			return 'image/vnd.microsoft.icon';
		case 'html':
			return 'text/html';
		case 'txt':
			return 'text/plain';
		case 'xml':
			return 'application/xml';
		case 'appcache':
			return 'text/cache-manifest';
		default:
			return 'application/octet-stream';
	}
}


/**
 * 處理圖片請求
 * 對應原本的 @get '/images/:file.png' 和 @get '/images/:file.jpg' 路由
 */
export async function handleImageRequest(url: URL, env: Env): Promise<Response> {
	const pathname = url.pathname;
	const filename = pathname.split('/').pop();

	if (!filename) {
		return new Response('Bad Request', {
			status: 400,
			headers: getCORSHeaders(),
		});
	}

	try {
		// 從 R2 Storage 讀取圖片檔案
		const image = await env.ASSETS.get(`images/${filename}`);

		if (!image) {
			return new Response('Image Not Found', {
				status: 404,
				headers: getCORSHeaders(),
			});
		}

		const contentType = getContentType(pathname);

		return new Response(image.body, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('Image request error:', error);

		return new Response('Internal Server Error', {
			status: 500,
			headers: getCORSHeaders(),
		});
	}
}

/**
 * 處理 CSS 請求
 * 對應原本的 @get '/styles.css' 和 @get '/css/:path/:file.css' 路由
 */
export async function handleCSSRequest(url: URL, env: Env): Promise<Response> {
	const pathname = url.pathname;

	try {
		// 從 R2 Storage 讀取 CSS 檔案
		const css = await env.ASSETS.get(pathname.substring(1));

		if (!css) {
			return new Response('CSS Not Found', {
				status: 404,
				headers: getCORSHeaders(),
			});
		}

		return new Response(css.body, {
			headers: {
				'Content-Type': 'text/css',
				'Cache-Control': 'public, max-age=31536000',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('CSS request error:', error);

		return new Response('Internal Server Error', {
			status: 500,
			headers: getCORSHeaders(),
		});
	}
}

/**
 * 處理 JavaScript 請求
 * 對應原本的 @get '/js/:file.js' 和 @get '/:file.js' 路由
 */
export async function handleJSRequest(url: URL, env: Env): Promise<Response> {
	const pathname = url.pathname;

	try {
		// 從 R2 Storage 讀取 JS 檔案
		const js = await env.ASSETS.get(pathname.substring(1));

		if (!js) {
			return new Response('JavaScript Not Found', {
				status: 404,
				headers: getCORSHeaders(),
			});
		}

		return new Response(js.body, {
			headers: {
				'Content-Type': 'application/javascript',
				'Cache-Control': 'public, max-age=31536000',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('JavaScript request error:', error);

		return new Response('Internal Server Error', {
			status: 500,
			headers: getCORSHeaders(),
		});
	}
}
