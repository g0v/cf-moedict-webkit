import { Env, DictionaryLang, ErrorResponse } from './types';
import { parseTextFromUrl, fixMojibake, getCORSHeaders } from './index';
import { bucketOf, fillBucket } from './dictionary_tools';

/**
 * 處理子路由 API 請求
 * 支援 /a/, /t/, /h/, /c/, /raw/, /uni/, /pua/ 等子路由
 */
export async function handleSubRouteAPI(url: URL, env: Env): Promise<Response> {
	console.log('🔍 [SubRouteAPI] 開始處理子路由請求');
	console.log('🔍 [SubRouteAPI] URL:', url.href);
	console.log('🔍 [SubRouteAPI] Pathname:', url.pathname);

	// 解析子路由
	const pathMatch = url.pathname.match(/^\/(a|t|h|c|raw|uni|pua)\/(.+?)\.json$/);
	if (!pathMatch) {
		const errorResponse: ErrorResponse = {
			error: 'Bad Request',
			message: 'Invalid sub-route format'
		};
		return new Response(JSON.stringify(errorResponse), {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});
	}

	const [, routeType, encodedText] = pathMatch;
	const text = decodeURIComponent(encodedText);
	const fixedText = fixMojibake(text);

	console.log('🔍 [SubRouteAPI] 解析結果 - routeType:', routeType, 'text:', text, 'fixedText:', fixedText);

	try {
		switch (routeType) {
			case 'a':
			case 't':
			case 'h':
			case 'c':
				return await handleLanguageRoute(routeType as DictionaryLang, fixedText, env);
			case 'raw':
				return await handleRawRoute(fixedText, env);
			case 'uni':
				return await handleUniRoute(fixedText, env);
			case 'pua':
				return await handlePuaRoute(fixedText, env);
			default:
				const errorResponse: ErrorResponse = {
					error: 'Bad Request',
					message: `Unsupported route type: ${routeType}`
				};
				return new Response(JSON.stringify(errorResponse), {
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						...getCORSHeaders(),
					},
				});
		}
	} catch (error) {
		console.error('🔍 [SubRouteAPI] 處理過程中發生錯誤:', error);
		console.error('🔍 [SubRouteAPI] 錯誤堆疊:', error instanceof Error ? error.stack : 'No stack trace');

		const errorResponse: ErrorResponse = {
			error: 'Internal Server Error',
			message: error instanceof Error ? error.message : 'Failed to process sub-route request'
		};

		return new Response(JSON.stringify(errorResponse), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});
	}
}

/**
 * 處理語言路由 (/a/, /t/, /h/, /c/)
 * 返回壓縮格式的字典資料，類似原專案的格式
 */
async function handleLanguageRoute(lang: DictionaryLang, text: string, env: Env): Promise<Response> {
	console.log('🔍 [LanguageRoute] 處理語言路由，lang:', lang, 'text:', text);

	try {
		// 使用 bucket 機制查詢字典資料
		const bucket = bucketOf(text, lang);
		console.log('🔍 [LanguageRoute] 計算出的 bucket:', bucket);

		const bucketResult = await fillBucket(text, bucket, lang, env);
		console.log('🔍 [LanguageRoute] Bucket 查詢結果:', {
			hasData: !!bucketResult.data,
			hasError: bucketResult.err,
			bsCount: bucketResult.bs?.length || 0
		});

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 返回壓縮格式的原始資料（不經過 decodeLangPart 處理）
		const rawData = bucketResult.data;
		console.log('🔍 [LanguageRoute] 返回壓縮格式資料');
		console.log('🔍 [LanguageRoute] 原始資料:', JSON.stringify(rawData, null, 2));

		return new Response(JSON.stringify(rawData), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [LanguageRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 處理 /raw/ 路由
 * 返回原始 JSON 檔，Big5 區之外的字以造字碼 {[abcd]} 表示
 */
async function handleRawRoute(text: string, env: Env): Promise<Response> {
	console.log('🔍 [RawRoute] 處理 raw 路由，text:', text);

	try {
		// 嘗試從華語字典獲取原始資料
		const bucket = bucketOf(text, 'a');
		const bucketResult = await fillBucket(text, bucket, 'a', env);

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 轉換為 raw 格式（需要將特殊字符轉換為造字碼格式）
		const rawData = convertToRawFormat(bucketResult.data);
		console.log('🔍 [RawRoute] 返回 raw 格式資料');

		return new Response(JSON.stringify(rawData), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [RawRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 處理 /uni/ 路由
 * 將原始 JSON 檔，Big5 區之外的字轉成相應的 Unicode 字元表示
 */
async function handleUniRoute(text: string, env: Env): Promise<Response> {
	console.log('🔍 [UniRoute] 處理 uni 路由，text:', text);

	try {
		// 嘗試從華語字典獲取原始資料
		const bucket = bucketOf(text, 'a');
		const bucketResult = await fillBucket(text, bucket, 'a', env);

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 轉換為 uni 格式（Unicode 字元表示）
		const uniData = convertToUniFormat(bucketResult.data);
		console.log('🔍 [UniRoute] 返回 uni 格式資料');

		return new Response(JSON.stringify(uniData), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [UniRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 處理 /pua/ 路由
 * 與 /uni/ 相同，已使用 Unicode 字元，但動態組字改用 @medicalwei 的造字替代
 */
async function handlePuaRoute(text: string, env: Env): Promise<Response> {
	console.log('🔍 [PuaRoute] 處理 pua 路由，text:', text);

	try {
		// 嘗試從華語字典獲取原始資料
		const bucket = bucketOf(text, 'a');
		const bucketResult = await fillBucket(text, bucket, 'a', env);

		if (bucketResult.err || !bucketResult.data) {
			const errorResponse: ErrorResponse = {
				error: 'Not Found',
				message: `找不到詞彙: ${text}`,
				terms: []
			};

			return new Response(JSON.stringify(errorResponse), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 轉換為 pua 格式（PUA 造字替代）
		const puaData = convertToPuaFormat(bucketResult.data);
		console.log('🔍 [PuaRoute] 返回 pua 格式資料');

		return new Response(JSON.stringify(puaData), {
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});

	} catch (error) {
		console.error('🔍 [PuaRoute] 處理過程中發生錯誤:', error);
		throw error;
	}
}

/**
 * 轉換為 raw 格式
 * 將特殊字符轉換為造字碼格式 {[abcd]}
 */
function convertToRawFormat(data: any): any {
	console.log('🔍 [ConvertToRawFormat] 轉換為 raw 格式');

	// 將資料轉換為字串進行處理
	const jsonString = JSON.stringify(data);

	// 處理特殊字符轉換為造字碼
	// 這裡需要根據實際的造字碼映射表進行轉換
	// 暫時保持原始格式，因為我們沒有完整的造字碼映射表
	let processedString = jsonString;

	// 一些常見的造字碼轉換（根據原專案文檔）
	processedString = processedString.replace(/灾/g, '{[9264]}');
	processedString = processedString.replace(/从/g, '{[9064]}');

	// 處理其他可能的造字碼
	// 這裡可以根據需要添加更多的轉換規則

	try {
		return JSON.parse(processedString);
	} catch (error) {
		console.error('🔍 [ConvertToRawFormat] JSON 解析失敗，返回原始資料');
		return data;
	}
}

/**
 * 轉換為 uni 格式
 * 將造字碼轉換為 Unicode 字元
 */
function convertToUniFormat(data: any): any {
	console.log('🔍 [ConvertToUniFormat] 轉換為 uni 格式');

	// 將資料轉換為字串進行處理
	const jsonString = JSON.stringify(data);

	// 處理造字碼轉換為 Unicode 字元
	let processedString = jsonString;

	// 將造字碼轉換為對應的 Unicode 字元
	processedString = processedString.replace(/\{\[9264\]\}/g, '灾');
	processedString = processedString.replace(/\{\[9064\]\}/g, '从');

	// 處理其他可能的造字碼轉換
	// 這裡可以根據需要添加更多的轉換規則

	try {
		return JSON.parse(processedString);
	} catch (error) {
		console.error('🔍 [ConvertToUniFormat] JSON 解析失敗，返回原始資料');
		return data;
	}
}

/**
 * 轉換為 pua 格式
 * 使用 PUA 造字替代
 */
function convertToPuaFormat(data: any): any {
	console.log('🔍 [ConvertToPuaFormat] 轉換為 pua 格式');

	// 將資料轉換為字串進行處理
	const jsonString = JSON.stringify(data);

	// 處理 PUA 造字轉換
	let processedString = jsonString;

	// 將造字碼轉換為 PUA 字元
	// 根據原專案文檔，PUA 使用 U+F9AD7 等格式
	processedString = processedString.replace(/\{\[9264\]\}/g, '\uF9264');
	processedString = processedString.replace(/\{\[9064\]\}/g, '\uF9064');

	// 處理其他可能的造字碼轉換
	// 這裡可以根據需要添加更多的轉換規則

	try {
		return JSON.parse(processedString);
	} catch (error) {
		console.error('🔍 [ConvertToPuaFormat] JSON 解析失敗，返回原始資料');
		return data;
	}
}
