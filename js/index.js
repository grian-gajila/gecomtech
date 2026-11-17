import { get } from './get.js';
import { createActiveQuiz, isValidQuestions } from './quiz-core.js';
import { createQuizStore } from './quiz-store.js';

const selectionForm = document.getElementById('selection-menu');
const categorySelect = document.getElementById('category');
const categoryOptions = document.getElementById('topicOptions');
const questionCountSelect = document.getElementById('questionNum');
const setupStatus = document.getElementById('setupStatus');
const submitButton = document.getElementById('submitForm');
const existingRound = document.getElementById('existingRound');
const savedRoundDetail = document.getElementById('savedRoundDetail');
const clearSavedDataButton = document.getElementById('clearSavedData');

let store;
let storageError = false;

function showStatus(message, isError = false) {
	setupStatus.textContent = message;
	setupStatus.classList.toggle('is-error', isError);
}

function describeRound(quiz) {
	const answered = quiz.answers.filter((answer) => typeof answer === 'string').length;
	return `${quiz.settings.category} · ${answered} of ${quiz.questions.length} answered`;
}

try {
	store = createQuizStore(localStorage);
	const { activeQuiz } = store.load();
	if (activeQuiz) {
		existingRound.hidden = false;
		savedRoundDetail.textContent = describeRound(activeQuiz);
	}
} catch {
	storageError = true;
	showStatus(
		store
			? 'Saved data could not be read. Clear it below to start a new round.'
			: 'Browser storage is unavailable. Enable storage to start a round.',
		true,
	);
	clearSavedDataButton.hidden = !store;
	submitButton.disabled = true;
}

clearSavedDataButton.addEventListener('click', () => {
	if (!store || !window.confirm('Clear saved quiz history and progress from this browser?')) {
		return;
	}
	try {
		store.reset();
		storageError = false;
		existingRound.hidden = true;
		clearSavedDataButton.hidden = true;
		submitButton.disabled = false;
		showStatus('Saved data cleared. Choose your round settings.');
	} catch {
		showStatus('Browser storage is unavailable. Saved data could not be cleared.', true);
	}
});

async function loadCategories() {
	try {
		const data = await get('https://opentdb.com/api_category.php');
		if (!Array.isArray(data.trivia_categories) || data.trivia_categories.length === 0) {
			throw new Error('The topic list was not available.');
		}

		const categories = data.trivia_categories.filter((category) => (
			Number.isInteger(category.id) && typeof category.name === 'string'
		));
		if (categories.length === 0) {
			throw new Error('The topic list was not available.');
		}

		const selectedCategory = categorySelect.value;
		const options = document.createDocumentFragment();
		categories.forEach((category) => {
			const option = document.createElement('option');
			option.value = String(category.id);
			option.textContent = category.name;
			options.appendChild(option);
		});
		categoryOptions.replaceChildren(options);
		if (categories.some((category) => String(category.id) === selectedCategory)) {
			categorySelect.value = selectedCategory;
		}
		if (!storageError) {
			showStatus('Topics are ready. Any topic is also an option.');
		}
	} catch {
		if (!storageError) {
			showStatus('Topic service unavailable. Built-in topics remain available; starting a round still needs a connection.', true);
		}
	}
}

selectionForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (storageError || !selectionForm.reportValidity()) {
		return;
	}

	const amount = Number(questionCountSelect.value);
	if (!Number.isInteger(amount) || amount < 1 || amount > 15) {
		showStatus('Choose a question count between 1 and 15.', true);
		return;
	}

	try {
		if (store.load().activeQuiz && !window.confirm('Starting a new round will replace the unfinished one. Continue?')) {
			return;
		}
	} catch {
		storageError = true;
		showStatus('Saved data could not be read. Clear it below to start a new round.', true);
		clearSavedDataButton.hidden = false;
		submitButton.disabled = true;
		return;
	}

	const parameters = new URLSearchParams({
		amount: String(amount),
		type: 'multiple',
	});
	if (categorySelect.value) {
		parameters.set('category', categorySelect.value);
	}
	const difficulty = document.getElementById('difficulty').value;
	if (difficulty) {
		parameters.set('difficulty', difficulty);
	}

	submitButton.disabled = true;
	showStatus('Preparing your quiz…');
	try {
		const data = await get(`https://opentdb.com/api.php?${parameters.toString()}`);
		if (data.response_code !== 0 || !Array.isArray(data.results)) {
			const messages = {
				1: 'There are not enough questions for these settings. Try a different topic or a shorter round.',
				2: 'Those quiz settings were not accepted. Please adjust them and try again.',
				5: 'The question service is busy. Wait a few seconds and try again.',
			};
			showStatus(messages[data.response_code] || 'Questions are unavailable right now. Please try again.', true);
			return;
		}
		if (data.results.length !== amount || !isValidQuestions(data.results)) {
			showStatus('The question service returned an incomplete or invalid round. Please try again.', true);
			return;
		}

		const settings = {
			category: categorySelect.selectedOptions[0].textContent,
			difficulty: difficulty || 'Any difficulty',
		};
		const id = globalThis.crypto?.randomUUID
			? globalThis.crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const activeQuiz = createActiveQuiz({
			id,
			startedAt: new Date().toISOString(),
			questions: data.results,
			settings,
		});
		try {
			store.saveActive(activeQuiz);
			window.location.assign('gamescreen.html');
		} catch {
			showStatus('Your browser could not save this round. Check storage settings and try again.', true);
		}
	} catch (error) {
		const message = error.name === 'AbortError'
			? 'The question service took too long to respond. Please try again.'
			: 'Could not connect to the question service. Check your connection and try again.';
		showStatus(message, true);
	} finally {
		submitButton.disabled = false;
	}
});

loadCategories();
window.gecomtechSetupReady = true;
