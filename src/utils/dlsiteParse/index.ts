
import {DLSITE_CODE_PREFIX, DLSITE_URI_PREFIX, DLSITE_URI_BASE} from './CONSTANTS';

function dlsiteParse(query: string): string[] | null {
	// queryの中にDLSITE_CODE_PREFIXから始まり6桁の数字が続くものがあるか
	const obscene = query.match(new RegExp(`(${DLSITE_CODE_PREFIX.join('|')})[0-9]{6}`, 'g'));

	if (!obscene || obscene.length === 0) {
		return null;
	}

	const ids = (()=>{
		const result: string[] = [];
		for (const id of obscene) {
			// 重複を排除
			if (!obscene.includes(id)) {
				result.push(id);
			}
		}
		return result;
	})();

	// idsのうち、実際にfetchした結果status=200だったもののみを格納するstring[]を作る
	const result: string[] = [];
	for (const id of ids) {
		new Promise<void>((resolve) => {
			const fetchUri = `${DLSITE_URI_BASE}${DLSITE_URI_PREFIX[0]}/work/=/product_id/${id}.html`;
			fetch(fetchUri).then((response) => {
				if (response.status === 200) {
					result.push(id);
				}
				resolve();
			});
		});
	}

	return result;
};

export default dlsiteParse;
