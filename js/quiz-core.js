export const STORE_VERSION = 1;
export const HISTORY_LIMIT = 20;

export function isValidQuestions(questions) {
	return Array.isArray(questions)
		&& questions.length > 0
		&& questions.length <= 15
		&& questions.every((question) => (
			question
			&& typeof question.question === 'string'
			&& typeof question.correct_answer === 'string'
			&& Array.isArray(question.incorrect_answers)
			&& question.incorrect_answers.length === 3
			&& question.incorrect_answers.every((answer) => typeof answer === 'string')
		));
}

function isValidSettings(settings) {
	return settings
		&& typeof settings.category === 'string'
		&& typeof settings.difficulty === 'string';
}

export function isValidActiveQuiz(quiz) {
	if (
		!quiz
		|| quiz.version !== STORE_VERSION
		|| typeof quiz.id !== 'string'
		|| !quiz.id
		|| typeof quiz.startedAt !== 'string'
		|| Number.isNaN(Date.parse(quiz.startedAt))
		|| !isValidSettings(quiz.settings)
		|| !isValidQuestions(quiz.questions)
		|| !Number.isInteger(quiz.currentIndex)
		|| quiz.currentIndex < 0
		|| quiz.currentIndex >= quiz.questions.length
		|| !Array.isArray(quiz.answers)
		|| quiz.answers.length !== quiz.questions.length
		|| !quiz.answers.every((answer) => answer === null || typeof answer === 'string')
		|| typeof quiz.answered !== 'boolean'
		|| !(quiz.selectedAnswer === null || typeof quiz.selectedAnswer === 'string')
	) {
		return false;
	}

	for (let index = 0; index < quiz.currentIndex; index += 1) {
		if (typeof quiz.answers[index] !== 'string') {
			return false;
		}
	}
	for (let index = quiz.currentIndex + 1; index < quiz.answers.length; index += 1) {
		if (quiz.answers[index] !== null) {
			return false;
		}
	}

	if (quiz.answered) {
		return typeof quiz.selectedAnswer === 'string'
			&& quiz.answers[quiz.currentIndex] === quiz.selectedAnswer;
	}

	return quiz.answers[quiz.currentIndex] === null;
}

export function isValidResult(result) {
	return Boolean(
		result
		&& result.version === STORE_VERSION
		&& typeof result.id === 'string'
		&& result.id
		&& typeof result.startedAt === 'string'
		&& !Number.isNaN(Date.parse(result.startedAt))
		&& typeof result.completedAt === 'string'
		&& !Number.isNaN(Date.parse(result.completedAt))
		&& isValidSettings(result.settings)
		&& isValidQuestions(result.questions)
		&& Array.isArray(result.answers)
		&& result.answers.length === result.questions.length
		&& result.answers.every((answer) => typeof answer === 'string')
		&& result.total === result.questions.length
		&& Number.isInteger(result.correctCount)
		&& result.correctCount >= 0
		&& result.correctCount <= result.total
		&& result.percentage === Math.round((result.correctCount / result.total) * 100),
	);
}

export function isValidStoreState(state) {
	return Boolean(
		state
		&& state.version === STORE_VERSION
		&& (state.activeQuiz === null || isValidActiveQuiz(state.activeQuiz))
		&& Array.isArray(state.history)
		&& state.history.length <= HISTORY_LIMIT
		&& state.history.every(isValidResult)
		&& (state.lastResult === null || isValidResult(state.lastResult)),
	);
}

export function createActiveQuiz({ id, startedAt, questions, settings }) {
	const quiz = {
		version: STORE_VERSION,
		id,
		startedAt,
		settings,
		questions,
		currentIndex: 0,
		answers: Array(questions.length).fill(null),
		selectedAnswer: null,
		answered: false,
	};
	if (!isValidActiveQuiz(quiz)) {
		throw new TypeError('Cannot create a quiz from invalid questions or settings.');
	}
	return quiz;
}

export function calculateScore(questions, answers, decode = (value) => value) {
	if (
		!isValidQuestions(questions)
		|| !Array.isArray(answers)
		|| answers.length !== questions.length
		|| !answers.every((answer) => typeof answer === 'string')
	) {
		throw new TypeError('Cannot score an incomplete quiz.');
	}
	return questions.reduce(
		(score, question, index) => score + (answers[index] === decode(question.correct_answer) ? 1 : 0),
		0,
	);
}

export function createCompletedResult(quiz, completedAt, decode = (value) => value) {
	if (
		!isValidActiveQuiz(quiz)
		|| !quiz.answered
		|| quiz.currentIndex !== quiz.questions.length - 1
		|| !quiz.answers.every((answer) => typeof answer === 'string')
	) {
		throw new TypeError('Cannot complete a quiz that still has unanswered questions.');
	}

	const correctCount = calculateScore(quiz.questions, quiz.answers, decode);
	const result = {
		version: STORE_VERSION,
		id: quiz.id,
		startedAt: quiz.startedAt,
		completedAt,
		settings: quiz.settings,
		questions: quiz.questions,
		answers: quiz.answers,
		total: quiz.questions.length,
		correctCount,
		percentage: Math.round((correctCount / quiz.questions.length) * 100),
	};
	if (!isValidResult(result)) {
		throw new TypeError('Could not create a valid quiz result.');
	}
	return result;
}
