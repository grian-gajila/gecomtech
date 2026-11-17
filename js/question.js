import { createCompletedResult, isValidActiveQuiz } from './quiz-core.js';
import { createQuizStore } from './quiz-store.js';

function startQuiz() {
	const questionTitle = document.getElementById('question');
	const questionCount = document.getElementById('counterSpan');
	const topic = document.getElementById('quizTopic');
	const answers = Array.from(document.querySelectorAll('.answer-button'));
	const progressBar = document.querySelector('[role="progressbar"]');
	const progressFill = document.getElementById('progressFill');
	const feedback = document.getElementById('result');
	const checkButton = document.getElementById('btnSubmit');
	const nextButton = document.getElementById('btnNext');

	let store;
	let quiz;
	try {
		store = createQuizStore(localStorage);
		quiz = store.load().activeQuiz;
	} catch {
		feedback.textContent = 'Saved round data could not be read. Return to setup to recover it.';
		feedback.className = 'answer-feedback is-error';
		checkButton.disabled = true;
		nextButton.disabled = true;
		return;
	}

	if (!isValidActiveQuiz(quiz)) {
		window.location.replace('selection.html');
		return;
	}

	topic.textContent = quiz.settings.category || 'YOUR QUIZ';

	function decodeHtml(value) {
		return new DOMParser().parseFromString(value, 'text/html').documentElement.textContent || value;
	}

	function shuffle(items) {
		for (let index = items.length - 1; index > 0; index -= 1) {
			const randomIndex = Math.floor(Math.random() * (index + 1));
			[items[index], items[randomIndex]] = [items[randomIndex], items[index]];
		}
		return items;
	}

	function saveProgress(nextQuiz) {
		try {
			store.saveActive(nextQuiz);
			quiz = nextQuiz;
			return true;
		} catch {
			feedback.textContent = 'Progress could not be saved. Check browser storage and try again.';
			feedback.className = 'answer-feedback is-error';
			return false;
		}
	}

	function updateProgress() {
		const completed = quiz.answers.filter((answer) => typeof answer === 'string').length;
		const percent = Math.round((completed / quiz.questions.length) * 100);
		progressBar.setAttribute('aria-valuenow', String(percent));
		progressFill.style.width = `${percent}%`;
		questionCount.textContent = `Question ${quiz.currentIndex + 1} of ${quiz.questions.length}`;
	}

	function showQuestion() {
		const question = quiz.questions[quiz.currentIndex];
		if (!question) {
			feedback.textContent = 'This question could not be displayed. Return to setup to start another round.';
			feedback.className = 'answer-feedback is-error';
			checkButton.disabled = true;
			nextButton.hidden = true;
			return;
		}

		questionTitle.textContent = decodeHtml(question.question);
		feedback.textContent = '';
		feedback.className = 'answer-feedback';
		checkButton.hidden = quiz.answered;
		checkButton.disabled = false;
		nextButton.hidden = !quiz.answered;
		nextButton.disabled = false;
		nextButton.textContent = quiz.currentIndex === quiz.questions.length - 1
			? 'See results'
			: 'Next question →';

		const correctAnswer = decodeHtml(question.correct_answer);
		const choices = shuffle([
			correctAnswer,
			...question.incorrect_answers.map(decodeHtml),
		]);
		answers.forEach((button, index) => {
			button.textContent = choices[index];
			button.dataset.answer = choices[index];
			button.disabled = quiz.answered;
			button.className = 'answer-button';
			button.setAttribute('aria-pressed', String(choices[index] === quiz.selectedAnswer));

			if (quiz.answered && choices[index] === correctAnswer) {
				button.classList.add('is-correct');
			} else if (quiz.answered && choices[index] === quiz.selectedAnswer) {
				button.classList.add('is-incorrect');
			}
		});

		if (quiz.answered) {
			const isCorrect = quiz.selectedAnswer === correctAnswer;
			feedback.textContent = isCorrect
				? 'Correct. Well done.'
				: `Not quite. The correct answer is ${correctAnswer}.`;
			feedback.className = `answer-feedback ${isCorrect ? 'is-correct' : 'is-incorrect'}`;
		}
		updateProgress();
	}

	answers.forEach((button) => {
		button.addEventListener('click', () => {
			if (quiz.answered) {
				return;
			}
			const nextQuiz = { ...quiz, selectedAnswer: button.dataset.answer };
			quiz = nextQuiz;
			answers.forEach((answerButton) => {
				answerButton.setAttribute('aria-pressed', String(answerButton === button));
			});
			feedback.textContent = '';
			feedback.className = 'answer-feedback';
			saveProgress(nextQuiz);
		});
	});

	checkButton.addEventListener('click', () => {
		if (quiz.answered) {
			return;
		}
		if (quiz.selectedAnswer === null) {
			feedback.textContent = 'Select an answer before checking.';
			feedback.className = 'answer-feedback is-error';
			return;
		}

		const answerHistory = quiz.answers.slice();
		answerHistory[quiz.currentIndex] = quiz.selectedAnswer;
		const nextQuiz = {
			...quiz,
			answers: answerHistory,
			answered: true,
		};
		if (saveProgress(nextQuiz)) {
			showQuestion();
		}
	});

	nextButton.addEventListener('click', () => {
		if (!quiz.answered) {
			return;
		}
		if (quiz.currentIndex === quiz.questions.length - 1) {
			nextButton.disabled = true;
			try {
				const result = createCompletedResult(
					quiz,
					new Date().toISOString(),
					decodeHtml,
				);
				store.complete(result);
				window.location.assign('results.html');
			} catch {
				nextButton.disabled = false;
				feedback.textContent = 'Results could not be saved. Check browser storage and try again.';
				feedback.className = 'answer-feedback is-error';
			}
			return;
		}

		const nextQuiz = {
			...quiz,
			currentIndex: quiz.currentIndex + 1,
			selectedAnswer: null,
			answered: false,
		};
		if (saveProgress(nextQuiz)) {
			showQuestion();
		}
	});

	showQuestion();
}

startQuiz();
