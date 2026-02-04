/**
 * Quiz Logic Module
 * Основна логика за изпита и въпросите
 */

import { EXAM_CONFIG, ROUND_TYPES } from './config.js';
import {
  getState, getQuestion, getCurrentQuestionId, getCurrentQuestion,
  getQuestionState, getAnswerOrder, setAnswerOrder,
  updateQuestionState, incrementWrongCount, markExamCompleted,
  addHistoryEntry, saveBaseState, initStack, nextQuestion, prevQuestion,
  isLastQuestion, isLearningMode, setRoundType, getCompletedExams,
  setExams, setSelectedExamIndex
} from './state.js';
import { shuffle, calcPercent } from './utils.js';
import { getQuestionElapsed, resetQuestionTimer } from './timer.js';
import { saveAll } from './storage.js';

/**
 * @typedef {Object} ExamStats
 * @property {number} correct - Correct answers count
 * @property {number[]} wrong - Wrong question IDs
 * @property {number[]} dk - "Don't know" question IDs
 * @property {number[]} ns - "Not sure" question IDs
 * @property {number[]} correctButNotSure - Correct but marked as not sure
 * @property {number} totalTime - Total time spent
 */

/**
 * Ensure answer order exists for a question (shuffle on first access)
 * @param {number} qid - Question ID
 */
export function ensureAnswerOrder(qid) {
  if (getAnswerOrder(qid)) return;
  
  const question = getQuestion(qid);
  if (!question) return;
  
  const shuffled = shuffle(Object.entries(question.answers));
  setAnswerOrder(qid, shuffled);
}

/**
 * Update draft state for current question (before checking)
 * @param {string|null} selectedAnswer - Selected answer letter
 * @param {boolean} dontKnow - "Don't know" flag
 * @param {boolean} notSure - "Not sure" flag
 */
export function updateDraftState(selectedAnswer, dontKnow, notSure) {
  const qid = getCurrentQuestionId();
  if (!qid) return;
  
  const existing = getQuestionState(qid);
  
  // In learning mode, don't update if already answered
  if (isLearningMode() && existing?.status && existing.status !== 'unanswered') {
    return;
  }
  
  updateQuestionState(qid, {
    selectedAnswer: selectedAnswer || existing?.selectedAnswer || null,
    status: existing?.status || 'unanswered',
    dontKnow,
    notSure,
    time: existing?.time || 0
  });
}

/**
 * Check the current question and record result
 * @param {string} selectedAnswer - Selected answer letter
 * @returns {boolean} - Whether question was answered (not skipped)
 */
export function checkCurrentQuestion(selectedAnswer) {
  if (!selectedAnswer) return false;
  
  const qid = getCurrentQuestionId();
  const question = getCurrentQuestion();
  if (!qid || !question) return false;
  
  const timeSpent = getQuestionElapsed();
  const isCorrect = question.correct.includes(selectedAnswer);
  
  const existing = getQuestionState(qid);
  
  updateQuestionState(qid, {
    selectedAnswer,
    status: isCorrect ? 'correct' : 'wrong',
    dontKnow: existing?.dontKnow || false,
    notSure: existing?.notSure || false,
    time: timeSpent
  });
  
  if (!isCorrect) {
    incrementWrongCount(qid);
  }
  
  return true;
}

/**
 * Compute statistics from question states
 * @param {Object} questionState - Question state object
 * @param {number[]} questionIds - Array of question IDs
 * @returns {ExamStats}
 */
export function computeStats(questionState, questionIds) {
  let correct = 0;
  const wrong = [];
  const dk = [];
  const ns = [];
  const correctButNotSure = [];
  let totalTime = 0;
  
  questionIds.forEach(qid => {
    const state = questionState[qid];
    if (!state?.status || state.status === 'unanswered') return;
    
    if (state.dontKnow) dk.push(qid);
    if (state.notSure) ns.push(qid);
    totalTime += state.time || 0;
    
    if (state.status === 'correct') {
      correct++;
      if (state.notSure) correctButNotSure.push(qid);
    } else {
      wrong.push(qid);
    }
  });
  
  return { correct, wrong, dk, ns, correctButNotSure, totalTime };
}

/**
 * Check if exam is passed based on score
 * @param {number} correct - Correct answers
 * @param {number} total - Total questions
 * @returns {boolean}
 */
export function isPassed(correct, total) {
  const percentage = calcPercent(correct, total);
  return percentage >= EXAM_CONFIG.PASS_THRESHOLD;
}

/**
 * Generate exams by splitting questions into groups
 * @param {number[]} allQuestionIds - All question IDs
 * @returns {number[][]}
 */
export function generateExams(allQuestionIds) {
  const shuffled = shuffle([...allQuestionIds]);
  const exams = [];
  const size = Math.ceil(shuffled.length / EXAM_CONFIG.TOTAL_EXAMS);
  
  for (let i = 0; i < EXAM_CONFIG.TOTAL_EXAMS; i++) {
    exams.push(shuffled.slice(i * size, (i + 1) * size));
  }
  
  return exams;
}

/**
 * Start a new exam round
 * @param {string} roundType - Type of round
 * @param {number[]} questionIds - Questions to include
 */
export function startRound(roundType, questionIds) {
  if (!questionIds?.length) return false;
  
  setRoundType(roundType);
  initStack(questionIds);
  resetQuestionTimer();
  
  return true;
}

/**
 * Finish exam and record results
 * @param {string} roundType - Type of round
 * @param {Object} questionState - Question state object
 * @param {number[]} stack - Question stack
 * @param {string} mode - Current mode (learning/exam)
 * @param {number|null} selectedExamIndex - Selected exam index
 */
export function finishExam(roundType, questionState, stack, mode, selectedExamIndex) {
  // Only record for base rounds
  if (roundType === ROUND_TYPES.BASE) {
    saveBaseState();
    
    if (selectedExamIndex !== null) {
      markExamCompleted();
    }
    
    const stats = computeStats(questionState, stack);
    const total = stack.length;
    const pct = calcPercent(stats.correct, total);
    const avgTime = total ? Math.round(stats.totalTime / total) : 0;
    
    addHistoryEntry({
      date: new Date().toISOString(),
      mode,
      total,
      correct: stats.correct,
      pct,
      avgTime
    });
    
    saveAll();
  }
}

/**
 * Move to next question or finish
 * @param {Function} onFinish - Callback when exam finishes
 * @param {Function} onShowQuestion - Callback to show question
 * @param {string|null} selectedAnswer - Currently selected answer
 * @returns {boolean} - True if moved to next, false if finished
 */
export function handleNext(onFinish, onShowQuestion, selectedAnswer) {
  if (!selectedAnswer) return false;
  
  const qid = getCurrentQuestionId();
  const state = getQuestionState(qid);
  
  if (isLearningMode()) {
    // In learning mode, first show result, then move to next
    if (!state || state.status === 'unanswered') {
      checkCurrentQuestion(selectedAnswer);
      onShowQuestion(); // Show result
      return true;
    }
    
    // Already shown result, move to next
    if (!isLastQuestion()) {
      nextQuestion();
      resetQuestionTimer();
      onShowQuestion();
      return true;
    } else {
      onFinish();
      return false;
    }
  } else {
    // In exam mode, check and move immediately
    checkCurrentQuestion(selectedAnswer);
    
    if (!isLastQuestion()) {
      nextQuestion();
      resetQuestionTimer();
      onShowQuestion();
      return true;
    } else {
      onFinish();
      return false;
    }
  }
}

/**
 * Move to previous question
 * @param {Function} onShowQuestion - Callback to show question
 * @returns {boolean} - True if moved
 */
export function handleBack(onShowQuestion) {
  if (prevQuestion()) {
    onShowQuestion();
    return true;
  }
  return false;
}

/**
 * Get questions for review based on type
 * @param {Object} baseState - Base question state
 * @param {number[]} baseStack - Base question stack
 * @param {string} reviewType - Type of review
 * @returns {number[]}
 */
export function getReviewQuestions(baseState, baseStack, reviewType) {
  if (!baseState || !baseStack) return [];
  
  const stats = computeStats(baseState, baseStack);
  
  switch (reviewType) {
    case ROUND_TYPES.REVIEW_WRONG:
      return stats.wrong;
    case ROUND_TYPES.REVIEW_NOT_SURE:
      return stats.ns;
    case ROUND_TYPES.REVIEW_DONT_KNOW:
      return stats.dk;
    case ROUND_TYPES.REVIEW_ALL:
      return [...new Set([...stats.wrong, ...stats.dk, ...stats.ns])];
    default:
      return [];
  }
}

/**
 * Get count of answered questions
 * @param {Object} questionState - Question state object
 * @returns {number}
 */
export function getAnsweredCount(questionState) {
  return Object.values(questionState).filter(
    s => s.status && s.status !== 'unanswered'
  ).length;
}
