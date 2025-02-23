import autobind from 'autobind-decorator';
import Module from '@/module';
import config from '@/config';
import Message from '@/message';
import * as http from 'http';

// 基本的に生データはstringばっかり。都合のいい形に加工済みの状態の型定義を書いています。
// ここでいくらか言及されてる(https://bultar.bbs.fc2.com/?act=reply&tid=5645851);
interface 緊急地震速報 {
  type: 'eew';
  time: Date;
  report: string; // 第n報 最終報はstringで'final'となるので、とりあえずstring型
  epicenter: string; // 震源地
  depth: string; // 震源の深さ
  magnitude: string; // 地震の規模を示すマグニチュード
  latitude: string; // 緯度らしいが謎
  longitude: string; // 経度らしいが謎
  intensity: string; // 地震の強さ
  index: number; // 謎
}

interface 緊急地震速報キャンセル {
  type: 'pga_alert_cancel';
  time: Date;
}

interface 震度レポート {
  type: 'intensity_report';
  time: string;
  max_index: number;
  intensity_list: {
    intensity: string;
    index: number;
    region_list: string[];
  }[];
}

interface 地震検知 {
  type: 'pga_alert';
  time: Date;
  max_pga: number;
  new: boolean;
  estimated_intensity: number;
  region_list: string[];
}

export default class extends Module {
	public readonly name = 'earthquake';
	private message: string = '';

	private thresholdVal = 3; // 下の配列の添え字に相当する値。しきい値以上のものについて通知を出す。 普段は3(震度2)
	private earthquakeIntensityIndex: string[] = [
		'0未満',
		'0',
		'1',
		'2',
		'3',
		'4',
		'5弱',
		'5強',
		'6弱',
		'6強',
		'7',
	];

  @autobind
	public install() {
		this.createListenServer();
		return {};
	}

  @autobind
  private async createListenServer() {
  	http.createServer(async (req, res) => {
  		this.message = '';
  		const buffers: Buffer[] = [];
  		for await (const chunk of req) {
  			buffers.push(chunk);
  		}

  		const rawDataString = Buffer.concat(buffers).toString();
  		// rawDataString について、Unicodeエスケープシーケンスが含まれていたら通常の文字列に変換する
  		// JSONでなければreturn falseする
  		if (rawDataString.match(/\\u[0-9a-f]{4}/)) {
  			const rawDataJSON = JSON.parse(
  				rawDataString.replace(/\\u([\d\w]{4})/g, (match, p1) => {
  					return String.fromCharCode(parseInt(p1, 16));
  				}),
  			);

  			if (rawDataJSON.type == 'intensity_report') {
  				if (rawDataJSON.max_index >= this.thresholdVal - 1) {
  					// 日付時刻は、yyyy-mm-dd hh:mm:ss
  					const time = new Date(parseInt(rawDataJSON.time));
  					const timeString = `${time.getFullYear()}-${(time.getMonth() +
							1).toString().padStart(2, '0')}-${time.getDate().toString().padStart(2, '0')} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
  					const data: 震度レポート = {
  						type: rawDataJSON.type,
  						time: timeString,
  						max_index: rawDataJSON.max_index,
  						intensity_list: rawDataJSON.intensity_list,
  					};
  					this.message =
							`地震かも？\n\`\`\`\n震度レポート\n${data.time}\n最大震度: ${
								this.earthquakeIntensityIndex[data.max_index + 1]
							}\n\n${
								data.intensity_list.map((intensity) =>
									`震度${this.earthquakeIntensityIndex[intensity.index + 1]}: ${
										intensity.region_list.join(' ')
									}`,
								).join('\n')
							}\n\`\`\``;
  				}
  			}
  			if (rawDataJSON.type == 'eew') { // これ使わなさそうだしとりあえず入らないようにした
  				const data: 緊急地震速報 = {
  					type: rawDataJSON.type,
  					time: new Date(parseInt(rawDataJSON.time)),
  					report: rawDataJSON.report,
  					epicenter: rawDataJSON.epicenter,
  					depth: rawDataJSON.depth,
  					magnitude: rawDataJSON.magnitude,
  					latitude: rawDataJSON.latitude,
  					longitude: rawDataJSON.longitude,
  					intensity: rawDataJSON.intensity,
  					index: rawDataJSON.index,
  				};

  				if (data.report == 'final') { //  && data.index >= this.thresholdVal - 1
  					const timeString = `${data.time.getFullYear()}-${(data.time.getMonth() +
							1).toString().padStart(2, '0')}-${data.time.getDate().toString().padStart(2, '0')} ${data.time.getHours().toString().padStart(2, '0')}:${data.time.getMinutes().toString().padStart(2, '0')}:${data.time.getSeconds().toString().padStart(2, '0')}`;
  					this.message = `\`\`\`\n緊急地震速報(最終報)\n${timeString}\n震源地: ${data.epicenter}\n震源の深さ: ${data.depth}\n最大予測震度: ${this.earthquakeIntensityIndex[data.index + 1]}\nマグニチュード: ${data.magnitude}\n\`\`\``;
  				}
  			}

  			console.table(rawDataJSON); // デバッグ用
  			if (rawDataJSON.type == 'intensity_report') {
  				console.table(rawDataJSON.intensity_list); // デバッグ用
  			}

  			this.returnResponse(res, 'ok');
  			if (this.message) {
  				this.ai.post({
  					visibility: 'home',
  					text: this.message,
  				});
  			}
  		}
  	}).listen(config.earthQuakeMonitorPort || 9999);
  }

  @autobind
  private returnResponse(res: http.ServerResponse, text: string) {
  	res.writeHead(200, {
  		'Content-Type': 'text/plain',
  	});
  	res.end(text);
  }
}
