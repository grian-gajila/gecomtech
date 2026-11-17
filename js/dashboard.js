import { createQuizStore } from './quiz-store.js';

const summary = document.getElementById('activitySummary');
const resumeRound = document.getElementById('resumeRound');
const resumeDetail = document.getElementById('resumeDetail');
const recentRounds = document.getElementById('recentRounds');

function formatDate(value) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(value));
}

function renderRound(result) {
	const item = document.createElement('li');
	item.className = 'recent-item';

	const details = document.createElement('div');
	const link = document.createElement('a');
	link.className = 'recent-link';
	link.href = `results.html?attempt=${encodeURIComponent(result.id)}`;
	link.textContent = result.settings.category;

	const meta = document.createElement('p');
	meta.className = 'recent-meta';
	meta.textContent = `${result.settings.difficulty} · ${formatDate(result.completedAt)}`;
	details.append(link, meta);

	const score = document.createElement('span');
	score.className = 'recent-score';
	score.textContent = `${result.correctCount}/${result.total}`;
	item.append(details, score);
	return item;
}

try {
	const state = createQuizStore(localStorage).load();
	if (state.history.length === 0) {
		summary.textContent = 'No completed rounds yet. Your history will appear here.';
	} else {
		const average = Math.round(
			state.history.reduce((total, result) => total + result.percentage, 0) / state.history.length,
		);
		summary.textContent = `${state.history.length} completed rounds · ${average}% average accuracy`;
		state.history.slice(0, 5).forEach((result) => {
			recentRounds.appendChild(renderRound(result));
		});
	}

	if (state.activeQuiz) {
		const answered = state.activeQuiz.answers
			.filter((answer) => typeof answer === 'string').length;
		resumeDetail.textContent = `${state.activeQuiz.settings.category} · ${answered} of ${state.activeQuiz.questions.length} answered`;
		resumeRound.hidden = false;
	}
} catch {
	summary.textContent = 'Saved activity could not be read. Open quiz setup to recover it.';
	summary.classList.add('is-error');
}
