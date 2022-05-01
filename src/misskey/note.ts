export type Note = {
	id: string;
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
