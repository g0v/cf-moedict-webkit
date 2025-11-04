/**
 * 左側欄組件
 * 復刻原專案 moedict-webkit 的 query-box 布局
 */

import { JSX } from 'preact';
import { DictionaryLang } from '../../types';
import { SearchBox } from './SearchBox';

interface SidebarProps {
	currentLang?: DictionaryLang;
}

/**
 * 左側欄組件
 */
export function Sidebar(props: SidebarProps) {
	return (
		<div id="query-box" className="query-box">
			<SearchBox currentLang={props.currentLang} />
		</div>
	);
}

