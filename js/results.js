import { isValidResult } from './quiz-core.js';
import { createQuizStore } from './quiz-store.js';

function showResults() {
	let result;
	let attemptId;
	try {
		const state = createQuizStore(localStorage).load();
		attemptId = new URLSearchParams(window.location.search).get('attempt');
		result = attemptId
			? state.history.find((entry) => entry.id === attemptId)
			: state.lastResult;
	} catch {
		window.location.replace('index.html');
		return;
	}

	if (!isValidResult(result)) {
		window.location.replace('index.html');
		return;
	}

	function decodeHtml(value) {
		return new DOMParser().parseFromString(value, 'text/html').documentElement.textContent || value;
	}

	const resultDisplay = document.getElementById('result');
	const resultContext = document.getElementById('resultContext');
	const message = document.getElementById('funny');
	const scoreFill = document.getElementById('scoreMeterFill');
	const details = document.getElementById('fullResults');
	const reviewButton = document.getElementById('moreResults');
	const percentage = result.percentage;

	document.getElementById('resultsTitle').textContent = attemptId ? 'Round review' : 'Round complete';
	resultDisplay.textContent = `${result.correctCount} / ${result.total} correct · ${percentage}%`;
	resultContext.textContent = `${result.settings.category} · ${result.settings.difficulty} · ${new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
	}).format(new Date(result.completedAt))}`;
	scoreFill.style.width = `${percentage}%`;

	if (percentage === 100) {
		message.textContent = 'Perfect round. You answered every question correctly.';
	} else if (percentage >= 70) {
		message.textContent = 'Strong work. You have a solid grasp of this topic.';
	} else if (percentage >= 40) {
		message.textContent = 'Good progress. Review the answers and keep building your knowledge.';
	} else {
		message.textContent = 'Every round is a chance to learn. Review the answers and try again.';
	}

	const tableBody = document.getElementById('tableBody');
	result.questions.forEach((question, index) => {
		const correctAnswer = decodeHtml(question.correct_answer);
		const row = document.createElement('tr');
		row.className = result.answers[index] === correctAnswer ? 'right' : 'wrong';
		[
			decodeHtml(question.question),
			result.answers[index],
			correctAnswer,
		].forEach((value) => {
			const cell = document.createElement('td');
			cell.textContent = value;
			row.appendChild(cell);
		});
		tableBody.appendChild(row);
	});

	reviewButton.addEventListener('click', () => {
		const isExpanded = reviewButton.getAttribute('aria-expanded') === 'true';
		details.hidden = isExpanded;
		reviewButton.setAttribute('aria-expanded', String(!isExpanded));
		reviewButton.textContent = isExpanded ? 'Review answers' : 'Hide answer review';
	});
}

showResults();
