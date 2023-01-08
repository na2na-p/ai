import autobind from 'autobind-decorator';
import dlsiteParse from '@/utils/dlsiteParse';
const delay = require('timeout-as-promise');

import type {PromiseType} from '@/types';
import {Note} from '@/misskey/note';
import Module from '@/module';
import Message from '@/message';
import Stream from '@/stream';
import {DLSITE_CART_URI_BASE} from '@/utils/dlsiteParse/CONSTANTS';

export default class extends Module {
	public readonly name = 'emoji-react';

	private htl: ReturnType<Stream['useSharedConnection']>;

	@autobind
	public install() {
		this.htl = this.ai.connection.useSharedConnection('homeTimeline');
		this.htl.on('note', this.onNote);

		return {
			mentionHook: this.mentionHook,
		};
	}

	@autobind
	private async onNote(note: Note) {
		if (note.text?.includes('@')) return; // (自分または他人問わず)メンションっぽかったらreject
		if (note.reply != null) return;
		if (note.text == null) return;
		const dlsite = await dlsiteParse(note.text);
		this.response(dlsite, note.id);
	}

	@autobind
	private async mentionHook(msg: Message): Promise<boolean> {
		if (msg.isDm) return false;

		const dlsite: PromiseType<ReturnType<typeof dlsiteParse>> = [];
		dlsite.push(...(await dlsiteParse(msg.text)) ?? []);
		if (msg.quoteId == null) {
			this.response(dlsite, msg.id);
			return true;
		};

		const quotedNote = await this.getNoteById(msg.quoteId);
		if (quotedNote.text == null) return false;
		dlsite.push(...(await dlsiteParse(quotedNote.text)) ?? []);
		if (dlsite.length === 0) return false;
		this.response(dlsite, msg.id);
		return true;
	}

	@autobind
	private async getNoteById(id: string): Promise<Note> {
		const note: Note = await this.ai.api('notes/show', {
			noteId: id,
		});
		return note;
	}

	@autobind
	private async createReply(replyId: string, text: string, visibility?: string) {
		await this.ai.api('notes/create', {
			visibility: visibility,
			text: text,
			replyId: replyId,
		});
	}

	@autobind
	private async response(dlsite: PromiseType<ReturnType<typeof dlsiteParse>>, noteId: string) {
		if (!dlsite) {
			return;
		}
		const serifs: string[] = ['買おうね、押したらカートに突っ込むよ'];
		dlsite.forEach((item) => {
			serifs.push(`[${item.title?.replace('[', '<plain>[</plain>').replace(']', '<plain>]</plain>') ?? item.id}](${DLSITE_CART_URI_BASE}${item.id})`);
		});
		this.react(':dlsite:', noteId, true);
		this.createReply(noteId, serifs.join(`
`));
	}

	@autobind
	private async react(reaction: string, noteId: string, immediate = false) {
		if (!immediate) {
			await delay(2500);
		}
		this.ai.api('notes/reactions/create', {
			noteId: noteId,
			reaction: reaction,
		});
	}
}
