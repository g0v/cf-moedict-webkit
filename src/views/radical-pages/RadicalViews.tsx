interface RadicalTableProps {
	data: string[][];
	isCrossStrait: boolean;
}

export function RadicalTable(props: RadicalTableProps) {
	const { data, isCrossStrait } = props;
	const prefix = isCrossStrait ? '/~@' : '/@';
	return (
		<div className="result" style={{ marginTop: '50px' }}>
			<h1 className="title" style={{ marginTop: '0' }}>部首表</h1>
			<div className="entry">
				<div className="entry-item list">
					{(Array.isArray(data) ? data : []).map((row, idx) => {
						const list = Array.isArray(row) ? row.filter(Boolean) : [];
						return (
							<div key={idx} style={{ margin: '8px 0' }}>
								<span className="stroke-count" style={{ marginRight: '8px' }}>{idx}</span>
								<span className="stroke-list">
									{list.map((radical, i) => (
										<a key={i} className="stroke-char" href={`${prefix}${radical}`} style={{ marginRight: '6px' }}>{radical}</a>
									))}
								</span>
								<hr style={{ margin: '0', padding: '0', height: '0' }} />
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

interface RadicalBucketProps {
	radical: string;
	data: string[][];
	backHref: string;
}

export function RadicalBucket(props: RadicalBucketProps) {
	const { radical, data, backHref } = props;
	return (
		<div className="result" style={{ marginTop: '50px' }}>
			<h1 className="title" style={{ marginTop: '0' }}>{radical} 部</h1>
			<p><a className="xref" href={backHref}>回部首表</a></p>
			<div className="entry">
				<div className="entry-item list">
					{(Array.isArray(data) ? data : []).map((row, idx) => {
						const list = Array.isArray(row) ? row.filter(Boolean) : [];
						return (
							<div key={idx} style={{ margin: '8px 0' }}>
								<span className="stroke-count" style={{ marginRight: '8px' }}>{idx}</span>
								<span className="stroke-list">
									{list.map((ch, i) => (
										<a
											key={i}
											className="stroke-char"
											href={backHref.startsWith('/~@') ? `/~${ch}` : `/${ch}`}
											style={{ marginRight: '6px' }}
										>
											{ch}
										</a>
									))}
								</span>
								<hr style={{ margin: '0', padding: '0', height: '0' }} />
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}


