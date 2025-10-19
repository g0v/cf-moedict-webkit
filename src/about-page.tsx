/**
 * 關於頁面 Preact 組件
 * 復刻原專案 moedict-webkit 的 about.html 頁面
 */

/**
 * 關於頁面組件
 */
export function AboutPage({ assetBaseUrl }: { assetBaseUrl: string }) {
	// R2 公開端點（由外部注入）
	const R2_ENDPOINT = assetBaseUrl.replace(/\/$/, '');

	return (
		<div className="about-page">
			{/* 簡化版導航列 */}
			<div className="navbar navbar-inverse navbar-fixed-top">
				<a href="./" className="navbar-brand brand ebas home">萌典</a>
				<ul style={{ float: 'left', width: '200px' }} className="nav navbar-nav">
					<li style={{ display: 'inline-block' }}>
						<a
							href="https://racklin.github.io/moedict-desktop/download.html"
							target="_blank"
							title="桌面版下載（可離線使用）"
						>
							<i className="icon-download-alt"></i>
						</a>
					</li>
				</ul>
				<ul style={{ display: 'inline-block', minWidth: '120px', position: 'absolute', right: 0 }} className="nav navbar-nav pull-right">
					<li style={{ display: 'inline-block', position: 'absolute', right: '32px' }}>
						<a href="http://g0v.tw/" target="_blank" title="g0v.tw 零時政府">
							<img
								src={`${R2_ENDPOINT}/images/g0v-icon-invert.png`}
								height="54"
								width="162"
								style={{ position: 'absolute', top: '-3px', right: '10px' }}
								alt="g0v.tw"
							/>
						</a>
					</li>
					<li style={{ display: 'inline-block', position: 'absolute', right: 0 }}>
						<a href="./" title="回到萌典" className="home">
							<i className="icon-remove-circle"></i>
						</a>
					</li>
				</ul>
			</div>

		{/* 主要內容 */}
		<div style={{ textAlign: 'center' }}>
				<img
					style={{ marginTop: '60px', background: 'white' }}
					title="萌典首頁"
					src={`${R2_ENDPOINT}/images/icon.png`}
					width="50%"
					className="logo"
					alt="萌典 Logo"
				/>
		</div>

			<div className="content">
				<p>
					<a href="./" className="home">萌典</a>
					共收錄十六萬筆臺灣華語、兩萬筆臺灣台語、一萬四千筆臺灣客語條目，並支援「自動完成」功能及
					<span style={{ whiteSpace: 'nowrap' }}>「%_ *? ^.$」</span>等萬用字元。
				</p>
				<p>定義裡的每個字詞都可以點擊連到說明。</p>
				<p>
					源碼、其他平台版本、API 及原始資料等，均可在{' '}
					<a target="_blank" href="https://github.com/g0v/moedict-webkit/">GitHub</a> 取得。
				</p>
				<p>
					原始資料來源為教育部《
					<a target="_blank" href="https://dict.revised.moe.edu.tw/">重編國語辭典修訂本</a>》（
					<a target="_blank" href="https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_reviseddict_download.html">CC BY-ND 3.0 臺灣</a>授權）、《
					<a target="_blank" href="https://sutian.moe.edu.tw/zh-hant/piantsip/pankhuan-singbing/">臺灣台語常用詞辭典</a>》（
					<a target="_blank" href="http://twblg.dict.edu.tw/holodict_new/compile1_6_1.jsp">CC BY-ND 3.0 臺灣</a>授權）及《
					<a target="_blank" href="https://hakkadict.moe.edu.tw/">臺灣客語辭典</a>》（
					<a target="_blank" href="https://hakkadict.moe.edu.tw/directions/%E7%AD%94%E5%AE%A2%E5%95%8F/%E7%89%88%E6%9C%AC%E6%8E%88%E6%AC%8A/">CC BY-ND 3.0 臺灣</a>），辭典本文的著作權仍為教育部所有。
				</p>
				<p>
					筆劃資料來源為教育部「
					<a target="_blank" href="https://stroke-order.learningweb.moe.edu.tw/">國字標準字體筆順學習網</a>」，國語發音資料來源為教育部「
					<a target="_blank" href="https://dict.concised.moe.edu.tw//">國語辭典簡編本</a>」（
					<a target="_blank" href="https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_concised_download.html">CC BY-ND 3.0 臺灣</a>授權），著作權仍為教育部所有。
				</p>
				<p>
					英/法/德文對照表{' '}
					<a target="_blank" href="https://cc-cedict.org/">CC-CEDict</a>、{' '}
					<a target="_blank" href="https://chine.in/mandarin/dictionnaire/CFDICT/">CFDict</a>、{' '}
					<a target="_blank" href="http://www.handedict.de/chinesisch_deutsch.php">HanDeDict</a>{' '}
					採用{' '}
					<a target="_blank" href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh_TW">CC BY-SA 4.0 國際</a>授權。
				</p>
				<p>
					兩岸詞典由
					<a target="_blank" href="http://www.gacc.org.tw/">中華文化總會</a>提供，採用{' '}
					<a target="_blank" href="https://creativecommons.org/licenses/by-nc-nd/3.0/tw/deed.zh_TW">CC BY-NC-ND 3.0 臺灣</a>授權。
				</p>
				<p>
					歷代書體以內嵌網頁方式，連至
					<a target="_blank" href="http://www.gacc.org.tw/">中華文化總會</a>網站。字體e筆書寫：張炳煌教授。字體選用：郭晉銓博士。
				</p>
				<p className="web-only">
					<a target="_blank" href="https://play.google.com/store/apps/details?id=org.audreyt.dict.moe">Android</a>、{' '}
					<a target="_blank" href="http://itunes.apple.com/app/id1434947403">Apple iOS</a> 及{' '}
					<a target="_blank" href="https://marketplace.firefox.com/app/%E8%90%8C%E5%85%B8">Firefox OS</a> 離線版包含下列第三方元件：
				</p>
				<ul>
					<li>
						jQuery 及 jQuery UI 由 jQuery Foundation 提供，採用{' '}
						<a target="_blank" href="https://jquery.org/license/">MIT</a> 授權。
					</li>
					<li>
						Cordova 由 Apache 基金會提供，採用{' '}
						<a target="_blank" href="https://www.apache.org/licenses/LICENSE-2.0">Apache 2.0</a> 授權。
					</li>
					<li>
						Fira Sans 字型由 Mozilla 基金會提供，採用{' '}
						<a target="_blank" href="https://github.com/mozilla/Fira/blob/master/LICENSE">SIL Open Font 1.1</a> 授權。
					</li>
				</ul>
				<p>
					<a target="_blank" href="https://www.moedict.tw/%E5%AD%97%E5%9C%96%E5%88%86%E4%BA%AB">字圖分享</a>功能使用下列來源之中文字型：
				</p>
				<ul>
					<li>
						<a target="_blank" href="http://www.cns11643.gov.tw/AIDB/download.do?name=%E5%AD%97%E5%9E%8B%E4%B8%8B%E8%BC%89">中文全字庫</a>採用{' '}
						<a target="_blank" href="https://creativecommons.org/licenses/by-nd/3.0/tw/deed.zh_TW">CC BY-ND 3.0 臺灣</a>授權。
					</li>
					<li>
						<a target="_blank" href="http://www.cl.fcu.edu.tw/">逢甲大學中文系</a>採用「不涉及商業行為使用」授權。
					</li>
					<li>
						<a target="_blank" href="https://code.google.com/p/cwtex-q-fonts/">cwTeX Q</a>採用{' '}
						<a target="_blank" href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html">GPL 2.0</a> 授權。
					</li>
					<li>
						<a target="_blank" href="https://github.com/adobe-fonts/source-han-sans/tree/release">思源黑體</a>採用{' '}
						<a target="_blank" href="https://github.com/adobe-fonts/source-han-sans/blob/release/LICENSE.txt">SIL Open Font 1.1</a>授權。
					</li>
					<li>
						<a target="_blank" href="https://github.com/adobe-fonts/source-han-serif/tree/release">思源宋體</a>採用{' '}
						<a target="_blank" href="https://github.com/adobe-fonts/source-han-serif/blob/release/LICENSE.txt">SIL Open Font 1.1</a>授權。
					</li>
					<li>
						<a target="_blank" href="https://code.google.com/p/wangfonts/">王漢宗自由字型</a>採用{' '}
						<a target="_blank" href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html">GPL 2.0</a> 授權。
					</li>
					<li>
						<a target="_blank" href="http://typography.ascdc.sinica.edu.tw/%E5%AD%97/">日星初號楷體</a>採用
						<a target="_blank" href="https://creativecommons.org/licenses/by-nc-nd/3.0/tw/deed.zh_TW">CC BY-NC-ND 3.0 臺灣</a>授權。
					</li>
				</ul>
				<p>
					感謝 <a target="_blank" href="http://g0v.tw">#g0v.tw</a> 頻道內所有協助開發的朋友們。
				</p>
				<h2 className="cc0">
					<a target="_blank" href="https://creativecommons.org/publicdomain/zero/1.0/deed.zh_TW">CC0 1.0 公眾領域貢獻宣告</a>
				</h2>
				<p>作者 唐鳳 在法律許可的範圍內，拋棄此著作依著作權法所享有之權利，包括所有相關與鄰接的法律權利，並宣告將該著作貢獻至公眾領域。</p>
			</div>

			{/* GitHub 連結 */}
			<a target="_blank" href="https://github.com/audreyt/moedict-webkit">
				<img
					style={{ zOrder: 9999, position: 'absolute', top: '50px', right: 0, border: 0 }}
					src={`${R2_ENDPOINT}/images/right-graphite@2x.png`}
					width="120"
					height="120"
					alt="Fork me on GitHub"
				/>
			</a>

			{/* App 版返回按鈕 */}
			<div className="app-only">
				<a
					href="./"
					title="回到萌典"
					style={{ float: 'left', marginTop: '-60px', marginLeft: '5px' }}
					className="visible-xs pull-left ebas btn btn-default home"
				>
					<span className="iconic-circle">
						<i className="icon-arrow-left"></i>
					</span>
					<span> 萌典</span>
				</a>
			</div>

			{/* 下載按鈕 */}
			<div style={{ position: 'fixed', bottom: '10px', left: '10px', zIndex: 2 }} className="web-only">
				<a target="_blank" href="https://play.google.com/store/apps/details?id=org.audreyt.dict.moe">
					<img
						alt="Google Play 下載"
						title="Google Play 下載"
						src={`${R2_ENDPOINT}/css/google_play.jpg`}
						width="135"
						height="46"
					/>
				</a>
				<a target="_blank" href="http://itunes.apple.com/app/id1434947403" style={{ marginLeft: '10px' }}>
					<img
						alt="App Store 下載"
						title="App Store 下載"
						src={`${R2_ENDPOINT}/css/Download_on_the_App_Store_Badge_HK_TW_135x40.png`}
						width="155"
						height="46"
					/>
				</a>
			</div>

			{/* 加入搜尋列按鈕 */}
			<div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 1 }} className="web-only">
				<a
					id="opensearch"
					onClick={(e) => {
						e.preventDefault();
						// TODO: 實現加入搜尋列功能
					}}
					className="btn btn-default btn-info"
				>
					<i className="icon icon-plus-sign"></i> 加入搜尋列
				</a>
			</div>
		</div>
	);
}
