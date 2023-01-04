
import {DLSITE_CODE_PREFIX, DLSITE_URI_PREFIX, DLSITE_URI_BASE} from './CONSTANTS';
import {JSDOM} from 'jsdom';

type workIdAndTitle = {
	id: string,
	title: string | null,
}

export type DlsiteParseReturnType = workIdAndTitle[] | null

async function dlsiteParse(query: string): Promise<DlsiteParseReturnType> {
	// queryの中にDLSITE_CODE_PREFIXから始まり6桁の数字が続くものがあるか
	const obscene = query.match(new RegExp(`(${DLSITE_CODE_PREFIX.join('|')})[0-9]{6}`, 'g'));

	if (!obscene || obscene.length === 0) {
		return null;
	}

	const ids = (()=>{
		const result: string[] = [];
		for (const id of obscene) {
			// 重複を排除
			if (!result.includes(id)) {
				result.push(id);
			}
		}
		return result;
	})();

	// idsのうち、実際にfetchした結果status=200だったもののみを格納するstring[]を作る
	const result: workIdAndTitle[] = [];
	let loadingCounter = 0;

	// TODO: リファクタしろ
	ids.forEach(async (id) => {
		const fetchUri = `${DLSITE_URI_BASE}${DLSITE_URI_PREFIX[0]}/work/=/product_id/${id}.html`;
		const response = await fetch(fetchUri);
		if (response.status === 200) {
			const dom = new JSDOM(await response.text());
			result.push({
				id,
				// DOMからtitleを取得
				title: dom.window.document.querySelector('title')?.textContent ?? null,
			});
		}
		loadingCounter++;
	});

	// TODO: リファクタしろ
	while (loadingCounter < ids.length) {
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});
	}

	return result.length === 0 ? null : result;
};

export default dlsiteParse;
