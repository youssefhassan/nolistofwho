// Headers on every answer. Nothing here reads or keeps anything about the visitor.
export async function handle({ event, resolve }) {
	const response = await resolve(event);
	response.headers.set('strict-transport-security', 'max-age=31536000');
	response.headers.set('referrer-policy', 'no-referrer');
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
	return response;
}
