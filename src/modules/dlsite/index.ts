import autobind from 'autobind-decorator';
import dlsiteParse from '@/utils/dlsiteParse';

import {Note} from '@/misskey/note';
import Module from '@/module';
import Stream from '@/stream';
import {DLSITE_CART_URI_BASE} from '@/utils/dlsiteParse/CONSTANTS';

export default class extends Module {
	public readonly name = 'emoji-react';

	private htl: ReturnType<Stream['useSharedConnection']>;

	@autobind
	public install() {
		this.htl = this.ai.connection.useSharedConnection('homeTimeline');
		this.htl.on('note', this.onNote);

		return {};
	}

	@autobind
	private async onNote(note: Note) {
		if (note.reply != null) return;
		if (note.text == null) return;
		if (note.text.includes('@')) return; // (自分または他人問わず)メンションっぽかったらreject

		const dlsite = await dlsiteParse(note.text);

		if (!dlsite) {
			return;
		}

		const serifs: string[] = ['買おうね、押したらカートに突っ込むよ'];
		dlsite.forEach((item) => {
			// HACK: MFMのエスケープあれば不要になる
			serifs.push(`[${item.title?.replace('[', '').replace(']', '') ?? item.id}](${DLSITE_CART_URI_BASE}${item.id})`);
		});


		this.createReply(note, serifs.join(`
`));
	}

	@autobind
	private async createReply(note: Note, text: string) {
		await this.ai.api('notes/create', {
			visibility: note.visibility,
			text: text,
			replyId: note.id,
		});
	}
}
