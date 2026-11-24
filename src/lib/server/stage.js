// Staging or live. Live since Fri Nov 20, 2026, 16:27 Berlin (Youssef: "clean up the test data and removing the staging part"),
// on a fresh live.db; the staging test data on the server was deleted. Staging stays for local test copies.
//
// The stage is written into the database file itself, so a staging file can never be opened as the live one,
// and the live file can never be opened by a staging server. Live needs COUNTER_STAGE=live, said on purpose.

/** @returns {'staging' | 'live'} */
export function stageFrom(env = process.env) {
	return env.COUNTER_STAGE === 'live' ? 'live' : 'staging';
}

/**
 * Stamp a new database with its stage, or refuse one stamped with the other stage.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {'staging' | 'live'} stage
 */
export function checkStage(db, stage) {
	db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
	const row = db.prepare("SELECT value FROM meta WHERE key = 'stage'").get();
	if (!row) {
		db.prepare("INSERT INTO meta (key, value) VALUES ('stage', ?)").run(stage);
		return stage;
	}
	if (row.value !== stage) {
		throw new Error(`This database holds ${row.value} data, and this server runs as ${stage}. Use another COUNTER_DB.`);
	}
	return stage;
}

/**
 * Staging only: pretend today is another day (COUNTER_TODAY=2026-11-27), to test the strike day before it comes.
 * Live always uses the real day.
 * @returns {string | null}
 */
export function pretendToday(stage, env = process.env) {
	if (stage !== 'staging') return null;
	return /^\d{4}-\d{2}-\d{2}$/.test(env.COUNTER_TODAY ?? '') ? env.COUNTER_TODAY : null;
}
