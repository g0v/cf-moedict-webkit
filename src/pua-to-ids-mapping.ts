/**
 * PUA (Private Use Area) 字符到 IDS (Ideographic Description Sequence) 的映射表
 *
 * 此映射表從 moedict-webkit 的原始數據中提取：
 * - dict-revised.pua.json: 包含 PUA 字符的版本
 * - dict-revised.unicode.json: 包含 IDS 的版本
 *
 * PUA 字符範圍：U+F0000 到 U+FFFFF
 * IDS 字符：⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻
 */

export const PUA_TO_IDS_MAP: Record<string, string> = {
	'\uDBA4\uDCFD': '⿺辶局',  // 󹃽 (U+F90FD)
	'\uDBA3\uDFF0': '⿰亻壯',  // 󸿰 (U+F8FF0)
	'\uDBA6\uDED7': '⿰扌層',  // 󹫗 (U+F9AD7)
	'\uDBA6\uDC68': '⿱禾千',  // 󹡨 (U+F9868)
};

/**
 * 將 PUA 字符轉換為 IDS
 * @param text 包含 PUA 字符的文本
 * @returns 轉換後的文本
 */
export function convertPuaToIds(text: string): string {
	let result = text;
	for (const [pua, ids] of Object.entries(PUA_TO_IDS_MAP)) {
		result = result.replace(new RegExp(pua, 'g'), ids);
	}
	return result;
}
