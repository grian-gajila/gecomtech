import {
	HISTORY_LIMIT,
	isValidActiveQuiz,
	isValidResult,
	isValidStoreState,
	STORE_VERSION,
} from './quiz-core.js';

const STORAGE_KEY = 'gecomtech:state:v1';

function emptyState() {
	return {
		version: STORE_VERSION,
		activeQuiz: null,
		history: [],
		lastResult: null,
	};
}

export function createQuizStore(storage) {
	if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
		throw new TypeError('Quiz storage must implement getItem and setItem.');
	}

	function load() {
		const serialized = storage.getItem(STORAGE_KEY);
		if (serialized === null) {
			return emptyState();
		}

		let state;
		try {
			state = JSON.parse(serialized);
		} catch (error) {
			throw new Error('Saved quiz data is not valid JSON.', { cause: error });
		}
		if (!isValidStoreState(state)) {
			throw new Error('Saved quiz data is incomplete or uses an unsupported version.');
		}
		return state;
	}

	function save(state) {
		if (!isValidStoreState(state)) {
			throw new TypeError('Refusing to save invalid quiz data.');
		}
		storage.setItem(STORAGE_KEY, JSON.stringify(state));
	}

	return Object.freeze({
		load,
		saveActive(activeQuiz) {
			if (!isValidActiveQuiz(activeQuiz)) {
				throw new TypeError('Refusing to save an invalid active quiz.');
			}
			const state = load();
			const updated = { ...state, activeQuiz };
			save(updated);
			return updated;
		},
		complete(result) {
			if (!isValidResult(result)) {
				throw new TypeError('Refusing to save an invalid quiz result.');
			}
			const state = load();
			if (!state.activeQuiz || state.activeQuiz.id !== result.id) {
				throw new Error('This quiz is no longer the active round.');
			}
			const updated = {
				version: STORE_VERSION,
				activeQuiz: null,
				history: [result, ...state.history.filter((item) => item.id !== result.id)]
					.slice(0, HISTORY_LIMIT),
				lastResult: result,
			};
			save(updated);
			return updated;
		},
		reset() {
			const state = emptyState();
			save(state);
			return state;
		},
	});
}
