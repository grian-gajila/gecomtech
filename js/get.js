export async function get(url) {
	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), 12000);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`Trivia service returned ${response.status}.`);
		}
		return await response.json();
	} finally {
		window.clearTimeout(timeoutId);
	}
}
