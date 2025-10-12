/**
 * 字詞紀錄簿頁面 Preact 組件
 * 復刻原專案 moedict-webkit 的字詞紀錄簿功能
 */

import { DictionaryLang } from './types';
import { NavbarComponent } from './navbar-component';

/**
 * 字詞紀錄簿頁面組件 Props
 */
interface StarredPageProps {
	currentLang: DictionaryLang;
	starredWords: string[];
	recentWords: string[];
	onClearHistory: () => void;
}

/**
 * 字詞紀錄簿頁面組件
 */
export function StarredPage(props: StarredPageProps) {
	const { currentLang, starredWords, recentWords, onClearHistory } = props;

	return (
		<>
			{/* 導航列 */}
			<NavbarComponent
				currentLang={currentLang}
				onLangChange={(newLang) => {
					// TODO: 實現語言切換邏輯
					console.log('語言切換到:', newLang);
				}}
			/>

			<div className="result">
				<h1 className="title">字詞紀錄簿</h1>

				{/* 收藏字詞區域 */}
				<div className="starred-section">
					<h3>收藏字詞</h3>
					{starredWords.length === 0 ? (
						<p className="bg-info">
							（請按詞條右方的 <i className="icon-star-empty"></i> 按鈕，即可將字詞加到這裡。）
						</p>
					) : (
						<div className="word-list">
							{starredWords.map((word, index) => (
								<div key={index} style={{ clear: 'both', display: 'block' }}>
									<span>·</span>
									<a href={`/${word}`}>{word}</a>
								</div>
							))}
						</div>
					)}
				</div>

				{/* 最近查閱過的字詞區域 */}
				{recentWords.length > 0 && (
					<div className="recent-section">
						<br />
						<h3 id="lru">
							最近查閱過的字詞
							<input
								id="btn-clear-lru"
								type="button"
								className="btn-default btn btn-tiny"
								value="清除"
								style={{ marginLeft: '10px' }}
								onClick={() => {
									if (confirm('確定要清除瀏覽紀錄？')) {
										onClearHistory();
									}
								}}
							/>
						</h3>
						<div className="word-list">
							{recentWords.map((word, index) => (
								<div key={index} style={{ clear: 'both', display: 'block' }}>
									<span>·</span>
									<a href={`/${word}`}>{word}</a>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</>
	);
}

/**
 * 字詞紀錄簿頁面組件（無 props 版本，用於 SSR）
 */
export function StarredPageSSR() {
	return (
		<>
			{/* 導航列 */}
			<NavbarComponent
				currentLang="a"
				onLangChange={(newLang) => {
					// TODO: 實現語言切換邏輯
					console.log('語言切換到:', newLang);
				}}
			/>

			<div className="result">
				<h1 className="title">字詞紀錄簿</h1>

				{/* 收藏字詞區域 */}
				<div className="starred-section">
					<h3>收藏字詞</h3>
					<p className="bg-info">
						（請按詞條右方的 <i className="icon-star-empty"></i> 按鈕，即可將字詞加到這裡。）
					</p>
				</div>

				{/* 最近查閱過的字詞區域 */}
				<div className="recent-section">
					<br />
					<h3 id="lru">
						最近查閱過的字詞
						<input
							id="btn-clear-lru"
							type="button"
							className="btn-default btn btn-tiny"
							value="清除"
							style={{ marginLeft: '10px' }}
							onClick={() => {
								if (confirm('確定要清除瀏覽紀錄？')) {
									// 前端 JavaScript 處理
									if (typeof window !== 'undefined' && window.localStorage) {
										window.localStorage.removeItem('lru-a');
										window.localStorage.removeItem('lru-t');
										window.localStorage.removeItem('lru-h');
										window.localStorage.removeItem('lru-c');
										location.reload();
									}
								}
							}}
						/>
					</h3>
					<div className="word-list">
						{/* 這裡會由前端 JavaScript 動態載入 */}
						<p>載入中...</p>
					</div>
				</div>
			</div>
		</>
	);
}
