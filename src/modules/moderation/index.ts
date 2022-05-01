import autobind from "autobind-decorator";
const delay = require("timeout-as-promise");

import { Note } from "@/misskey/note";
import Module from "@/module";
import Stream from "@/stream";
import * as loki from "lokijs";
import includes from "@/utils/includes";

type watchNoteFirst = {
  createdAt: Date;
  userId: string;
};

type watchNoteLatest = {
  count: number;
  createdAt: Date;
  userId: string;
};

export default class extends Module {
  public readonly name = "moderation";

	private watchNoteFirstRecord: loki.Collection<watchNoteFirst>;
	private watchNoteLatest: loki.Collection<watchNoteLatest>;

  private ltl: ReturnType<Stream["useSharedConnection"]>;

  @autobind
  public install() {
    this.ltl = this.ai.connection.useSharedConnection("localTimeline");
    this.ltl.on("note", this.onNote);

    return {};
  }

  @autobind
  private async onNote(note: Note) {
    if (note.reply != null) return;
    if (note.text == null) return;
    if (note.text.includes("@")) return; // (自分または他人問わず)メンションっぽかったらreject

    const react = async (reaction: string, immediate = false) => {
      if (!immediate) {
        await delay(2500);
      }
      this.ai.api("notes/reactions/create", {
        noteId: note.id,
        reaction: reaction,
      });
    };

    // 最初の投稿から30秒以内に、note.user.idが同一のものを5回以上投稿した場合に、react(':kora:')をする
		// watchNoteLatestに同じuserIdがあった場合、countを+1する
		// countが5以上になったらreact(':kora:')をし、該当userIdを持つwatchNoteFirstRecordとwatchNoteLatestを削除する
		// watchNoteFirstRecordに該当のuserIdがない場合、watchNoteFirstRecordとwatchNoteLatestを作成する
		if (!this.watchNoteFirstRecord.findOne({ userId: note.user.id })) {
			this.watchNoteFirstRecord.insert({
				createdAt: note.createdAt,
				userId: note.user.id,
			});
			this.watchNoteLatest.insert({
				count: 1,
				createdAt: note.createdAt,
				userId: note.user.id,
			});
		} else {
			const latest = this.watchNoteLatest.findOne({ userId: note.user.id });
			if (latest) {
				latest.count++;
				this.watchNoteLatest.update(latest);
				if (latest.count >= 5) {
					await react(":kora:");
					this.watchNoteFirstRecord.remove(latest);
					this.watchNoteLatest.remove(latest);
				}
			}
		}
  }
}
