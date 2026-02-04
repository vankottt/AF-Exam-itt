/**
 * Centralized State Management
 * Единно място за цялото състояние на приложението
 */

import { ROUND_TYPES } from './config.js';

/**
 * @typedef {Object} QuestionData
 * @property {number} number - Question ID
 * @property {string} question - Question text
 * @property {Object.<string, string>} answers - Answer options
 * @property {string[]} correct - Correct answer letters
 */

/**
 * @typedef {Object} QuestionState
 * @property {string|null} selectedAnswer - Selected answer letter
 * @property {'unanswered'|'correct'|'wrong'} status - Answer status
 * @property {boolean} dontKnow - "Don't know" flag
 * @property {boolean} notSure - "Not sure" flag
 * @property {number} time - Time spent on question (seconds)
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} date - ISO date string
 * @property {'learning'|'exam'} mode - Exam mode
 * @property {number} total - Total questions
 * @property {number} correct - Correct answers
 * @property {number} pct - Percentage score
 * @property {number} avgTime - Average time per question
 */

// ============ APPLICATION STATE ============
const state = {
  // Questions data
  questions: {},
  allQuestionIds: [],
  exams: [],

  // Current exam state
  stack: [],
  currentIndex: 0,
  questionState: {},
  answerOrder: {},

  // Base exam state (for review)
  baseStack: null,
  baseState: null,

  // Timing
  examStartTime: null,
  questionStartTime: null,
  timerInterval: null,

  // Mode and navigation
  currentMode: null, // 'learning' | 'exam'
  currentRoundType: ROUND_TYPES.BASE,
  selectedExamIndex: null,

  // Progress tracking (persisted)
  completedLearning: new Set(),
  completedExam: new Set(),
  history: [],
  wrongCounts: {},

  // NEW: Question metadata (flags & notes)
  questionMeta: {},  // { qid: { flagged: bool, note: string } }

  // NEW: Spaced Repetition data
  spacedRepetition: {},  // { qid: { level: 0-5, lastSeen: timestamp, seenCount: number } }

  // NEW: Detailed exam history
  examHistory: [],  // Array of detailed exam results

  // Sync state
  syncId: null,
  isOnline: false,
  isSaving: false,
  lastCloudTimestamp: 0
};

// ============ STATE GETTERS ============

/**
 * Get current question ID
 * @returns {number|undefined}
 */
export function getCurrentQuestionId() {
  return state.stack[state.currentIndex];
}

/**
 * Get question by ID
 * @param {number} qid - Question ID
 * @returns {QuestionData|undefined}
 */
export function getQuestion(qid) {
  return state.questions[qid];
}

/**
 * Get current question
 * @returns {QuestionData|undefined}
 */
export function getCurrentQuestion() {
  const qid = getCurrentQuestionId();
  return qid ? state.questions[qid] : undefined;
}

/**
 * Get state for a specific question
 * @param {number} qid - Question ID
 * @returns {QuestionState|undefined}
 */
export function getQuestionState(qid) {
  return state.questionState[qid];
}

/**
 * Get completed exams set based on current mode
 * @returns {Set<number>}
 */
export function getCompletedExams() {
  return state.currentMode === 'exam'
    ? state.completedExam
    : state.completedLearning;
}

/**
 * Check if currently in learning mode
 * @returns {boolean}
 */
export function isLearningMode() {
  return state.currentMode === 'learning';
}

/**
 * Check if currently in smart mode
 * @returns {boolean}
 */
export function isSmartMode() {
  return state.currentMode === 'smart';
}

/**
 * Check if currently in exam mode
 * @returns {boolean}
 */
export function isExamMode() {
  return state.currentMode === 'exam';
}

/**
 * Get correct answer text for a question
 * @param {number} qid - Question ID
 * @returns {string}
 */
export function getCorrectText(qid) {
  const q = state.questions[qid];
  if (!q) return '';
  return q.correct.map(a => q.answers[a]).join(', ');
}

// ============ STATE SETTERS ============

/**
 * Load questions from data
 * @param {QuestionData[]} questionsArray
 */
export function loadQuestions(questionsArray) {
  state.questions = {};
  state.allQuestionIds = [];
  questionsArray.forEach(q => {
    state.questions[q.number] = q;
    state.allQuestionIds.push(q.number);
  });
}

/**
 * Set exams array
 * @param {number[][]} exams
 */
export function setExams(exams) {
  state.exams = exams;
}

/**
 * Set current mode
 * @param {'learning'|'exam'} mode
 */
export function setMode(mode) {
  state.currentMode = mode;
}

/**
 * Set selected exam index
 * @param {number|null} idx
 */
export function setSelectedExamIndex(idx) {
  state.selectedExamIndex = idx;
}

/**
 * Set current round type
 * @param {string} type
 */
export function setRoundType(type) {
  state.currentRoundType = type;
}

/**
 * Update question state
 * @param {number} qid - Question ID
 * @param {Partial<QuestionState>} updates
 */
export function updateQuestionState(qid, updates) {
  state.questionState[qid] = {
    ...state.questionState[qid],
    ...updates
  };
}

/**
 * Set answer order for a question
 * @param {number} qid - Question ID
 * @param {Array<[string, string]>} order - Shuffled answers
 */
export function setAnswerOrder(qid, order) {
  state.answerOrder[qid] = order;
}

/**
 * Get answer order for a question
 * @param {number} qid - Question ID
 * @returns {Array<[string, string]>|undefined}
 */
export function getAnswerOrder(qid) {
  return state.answerOrder[qid];
}

/**
 * Mark exam as completed
 */
export function markExamCompleted() {
  if (state.selectedExamIndex !== null) {
    getCompletedExams().add(state.selectedExamIndex);
  }
}

/**
 * Add history entry
 * @param {HistoryEntry} entry
 */
export function addHistoryEntry(entry) {
  state.history.push(entry);
}

/**
 * Increment wrong count for a question
 * @param {number} qid - Question ID
 */
export function incrementWrongCount(qid) {
  state.wrongCounts[qid] = (state.wrongCounts[qid] || 0) + 1;
}

/**
 * Save base state for review
 */
export function saveBaseState() {
  state.baseState = JSON.parse(JSON.stringify(state.questionState));
  state.baseStack = [...state.stack];
}

/**
 * Restore base state
 */
export function restoreBaseState() {
  if (state.baseState && state.baseStack) {
    state.questionState = JSON.parse(JSON.stringify(state.baseState));
    state.stack = [...state.baseStack];
  }
}

/**
 * Reset all progress data
 */
export function resetAllData() {
  state.history = [];
  state.wrongCounts = {};
  state.completedLearning.clear();
  state.completedExam.clear();
  state.exams = [];
  state.currentMode = null;
  state.selectedExamIndex = null;
  state.questionMeta = {};
  state.spacedRepetition = {};
  state.examHistory = [];
}

/**
 * Clear stats only (keep exams)
 */
export function clearStats() {
  state.history = [];
  state.wrongCounts = {};
}

// ============ QUESTION META (FLAGS & NOTES) ============

/**
 * Get meta for a question
 * @param {number} qid - Question ID
 * @returns {{flagged: boolean, note: string}}
 */
export function getQuestionMeta(qid) {
  return state.questionMeta[qid] || { flagged: false, note: '' };
}

/**
 * Toggle flag for a question
 * @param {number} qid - Question ID
 * @returns {boolean} - New flag state
 */
export function toggleQuestionFlag(qid) {
  if (!state.questionMeta[qid]) {
    state.questionMeta[qid] = { flagged: false, note: '' };
  }
  state.questionMeta[qid].flagged = !state.questionMeta[qid].flagged;
  return state.questionMeta[qid].flagged;
}

/**
 * Set note for a question
 * @param {number} qid - Question ID
 * @param {string} note - Note text
 */
export function setQuestionNote(qid, note) {
  if (!state.questionMeta[qid]) {
    state.questionMeta[qid] = { flagged: false, note: '' };
  }
  state.questionMeta[qid].note = note;
}

/**
 * Get all flagged question IDs
 * @returns {number[]}
 */
export function getFlaggedQuestionIds() {
  return Object.entries(state.questionMeta)
    .filter(([_, meta]) => meta.flagged)
    .map(([qid, _]) => Number(qid));
}

// ============ SPACED REPETITION ============

/**
 * Get spaced repetition data for a question
 * @param {number} qid - Question ID
 * @returns {{level: number, lastSeen: number, seenCount: number}}
 */
export function getSpacedRepData(qid) {
  return state.spacedRepetition[qid] || { level: 0, lastSeen: 0, seenCount: 0 };
}

/**
 * Update spaced repetition data for a question
 * @param {number} qid - Question ID
 * @param {Object} data - Data to update
 */
export function updateSpacedRepData(qid, data) {
  state.spacedRepetition[qid] = {
    ...getSpacedRepData(qid),
    ...data
  };
}

/**
 * Get all spaced repetition data
 * @returns {Object}
 */
export function getAllSpacedRepData() {
  return state.spacedRepetition;
}

// ============ DETAILED EXAM HISTORY ============

/**
 * Add detailed exam result
 * @param {Object} examResult
 */
export function addExamHistory(examResult) {
  state.examHistory.push({
    id: 'exam_' + Date.now(),
    ...examResult
  });

  // Keep only last 50 exams
  if (state.examHistory.length > 50) {
    state.examHistory = state.examHistory.slice(-50);
  }
}

/**
 * Get exam history
 * @returns {Array}
 */
export function getExamHistory() {
  return state.examHistory;
}

/**
 * Get specific exam by ID
 * @param {string} examId
 * @returns {Object|undefined}
 */
export function getExamById(examId) {
  return state.examHistory.find(e => e.id === examId);
}

// ============ NAVIGATION ============

/**
 * Initialize exam stack
 * @param {number[]} questionIds
 */
export function initStack(questionIds) {
  state.stack = [...questionIds];
  state.currentIndex = 0;
  state.questionState = {};
  state.answerOrder = {};
}

/**
 * Go to next question
 * @returns {boolean} - True if moved, false if at end
 */
export function nextQuestion() {
  if (state.currentIndex < state.stack.length - 1) {
    state.currentIndex++;
    return true;
  }
  return false;
}

/**
 * Go to previous question
 * @returns {boolean} - True if moved, false if at start
 */
export function prevQuestion() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    return true;
  }
  return false;
}

/**
 * Check if at last question
 * @returns {boolean}
 */
export function isLastQuestion() {
  return state.currentIndex >= state.stack.length - 1;
}

// ============ SYNC STATE ============

export function setSyncId(id) { state.syncId = id; }
export function getSyncId() { return state.syncId; }
export function setOnline(online) { state.isOnline = online; }
export function setSaving(saving) { state.isSaving = saving; }
export function isSaving() { return state.isSaving; }
export function setLastCloudTimestamp(ts) { state.lastCloudTimestamp = ts; }
export function getLastCloudTimestamp() { return state.lastCloudTimestamp; }

// ============ TIMING ============

export function setExamStartTime(time) { state.examStartTime = time; }
export function getExamStartTime() { return state.examStartTime; }
export function setQuestionStartTime(time) { state.questionStartTime = time; }
export function getQuestionStartTime() { return state.questionStartTime; }
export function setTimerInterval(interval) { state.timerInterval = interval; }
export function getTimerInterval() { return state.timerInterval; }

// ============ DATA EXPORT/IMPORT ============

/**
 * Get all persistable data for cloud sync
 * @returns {Object}
 */
export function getAllData() {
  return {
    timestamp: Date.now(),
    completedLearning: [...state.completedLearning],
    completedExam: [...state.completedExam],
    history: state.history,
    wrongCounts: state.wrongCounts,
    exams: state.exams,
    questionMeta: state.questionMeta,
    spacedRepetition: state.spacedRepetition,
    examHistory: state.examHistory
  };
}

/**
 * Apply data from cloud sync
 * @param {Object} data
 */
export function applyData(data) {
  if (!data) return;
  if (data.completedLearning) state.completedLearning = new Set(data.completedLearning);
  if (data.completedExam) state.completedExam = new Set(data.completedExam);
  if (data.history) state.history = data.history;
  if (data.wrongCounts) state.wrongCounts = data.wrongCounts;
  if (data.exams?.length) state.exams = data.exams;
  if (data.questionMeta) state.questionMeta = data.questionMeta;
  if (data.spacedRepetition) state.spacedRepetition = data.spacedRepetition;
  if (data.examHistory) state.examHistory = data.examHistory;
  state.lastCloudTimestamp = data.timestamp || 0;
}

// Export raw state for debugging (read-only access)
export function getState() {
  return { ...state };
}