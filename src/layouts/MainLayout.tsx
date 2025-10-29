import { ComponentChildren } from 'preact';

/**
 * 主佈局：預留給未來的應用殼層，統一包覆導覽與中央主內容。
 *
 * 現階段僅提供簡單的 slot 結構，後續可擴充狀態管理、路由切換等邏輯。
 */
export interface MainLayoutProps {
	/** 導覽列或其他頂部固定元素 */
	navbar?: ComponentChildren;
	/** 主要頁面內容 */
	children?: ComponentChildren;
	/** 額外可選擇掛載的底部元素（尚未使用） */
	footer?: ComponentChildren;
}

export function MainLayout(props: MainLayoutProps) {
	const { navbar, children, footer } = props;

	return (
		<div className="app-shell">
			{navbar}
			<main id="main-content">
				{children}
			</main>
			{footer}
		</div>
	);
}


