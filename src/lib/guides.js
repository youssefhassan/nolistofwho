// How to do each action, shown on its page (Youssef, Nov 22, 2026: "We need to link the counter to guides
// to understand how to do the actions"). Steps come from his own published guides:
// - Amazon: his "Getting away from Amazon" (six steps, in order).
// - Facebook: the "How to leave Facebook" carousel, Nov 15, 2026 (content/assets/carousel-fb-guide).
// The two weekly days have no published guide; their tips are Claude's, for him to check.
// The guides live here, on his own host, not on Substack or X (Youssef, Nov 22: "they should be at my stall not substack").
// They move to his stall once it exists. Only the strike links out, to the group that called it.
// An action with no entry here shows no guide. Never guess a menu path: leave it out until it is checked.


export const GUIDES = {
	'amazon-cancel-prime': {
		steps: ['Account, then Prime membership, then Manage membership, then End membership.', 'Amazon asks three times if you’re sure. Say yes three times.']
	},
	'amazon-request-data': {
		steps: [
			'Account, then Your Account, then Request your information.',
			'Tick everything: orders, addresses, payments, subscriptions, search history, Alexa. Not just orders.',
			'Used Amazon in other countries? Check whether your request covers them; if not, request in each one.',
			'The data comes by email as a zip file, within thirty days under GDPR. Download it and keep it on your own drive.'
		]
	},
	'amazon-delete-2026': {
		steps: [
			'First request your data, and download it. Once the account is gone, so is your request.',
			'Remove every address (Your Addresses) and every card (Your Payments and Wallet).',
			'Then Help, then Close your Amazon account. Last step, not first.'
		]
	},
	'meta-delete-facebook': {
		lose: 'The logins that use Facebook, Messenger, pages only you run, photos others posted of you. You keep your export, and the people: they’re on other apps already.',
		steps: [
			'Download first: Accounts Center, then Your information and permissions, then Export your information. JSON for tools, HTML to read. It can take days.',
			'Fix “Log in with Facebook”: Settings, then Apps and websites. Switch the active ones to email login, remove the rest.',
			'Make someone else admin of your groups and pages, and take Facebook out of Accounts Center so Instagram stays separate.',
			'Tell people where to find you. Then Settings, then Meta Account, then Manage account, then Deactivation or deletion. You have 30 days to change your mind.'
		]
	},
	// Path walked on his own account, Instagram web, Sun Nov 22, 2026; the "lose" line is Meta's own confirm dialog.
	'meta-less-personalised-ads': {
		lose: 'Meta says your ads will be less related to your interests, you may see ad breaks, and your own ability to advertise and earn with ads is limited. It still uses some of your data: what you view, how you engage with ads, your age, gender and location.',
		steps: [
			'In Instagram or Facebook: Settings, then Accounts Center, then Ad preferences.',
			'Open Manage info, then Ad experience.',
			'Pick Less-personalized ads, then Confirm. Check it reads Less-personalized ads afterwards.'
		]
	},
	'x-sundays': {
		steps: ['Log out on Saturday night, or move the app off your home screen for the day.', 'If you post for work, nothing scheduled for Sunday either.']
	},
	'instagram-tuesdays': {
		steps: ['Log out on Monday night, or move the app off your home screen for the day.', 'Nothing scheduled for Tuesday either; stories included.']
	},
	'attention-strike-2026': {
		steps: ['Log off every big tech platform for 24 hours, from midnight to midnight where you live.', 'Buy nothing that day.'],
		guide: { url: 'https://takebackbigtech.com/attention-strike', label: 'The Attention Strike, from Take Back Big Tech' }
	}
};
