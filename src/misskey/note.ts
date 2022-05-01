export type Note = {
	id: string;
	createdAt: Date;
	text: string | null;
	reply: any | null;
	visibility: 'public' | 'home' | 'followers' | 'specified';
	user: {
		id: string;
		name: string;
		username: string;
		host: string | null;
	}
	poll?: {
		choices: {
			votes: number;
			text: string;
		}[];
		expiredAfter: number;
		multiple: boolean;
	} | null;
};
