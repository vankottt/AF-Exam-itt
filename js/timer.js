/**
 * Timer Module
 * Управление на таймерите за изпит и въпроси
 */

import { EXAM_CONFIG } from './config.js';
import { 
  setExamStartTime, getExamStartTime,
  setQuestionStartTime, getQuestionStartTime,
  setTimerInterval, getTimerInterval,
  setQuestionTimerInterval, getQuestionTimerInterval,
  isLearningMode
} from './state.js';
import { $, formatTime, toggleVisibility } from './utils.js';

// Callback for time expiration
let onTimeExpiredCallback = null;

/**
 * Update exam timer display
 */
function updateExamTimer() {
  const startTime = getExamStartTime();
  if (!startTime) return;
  
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(EXAM_CONFIG.TIME_LIMIT_SECONDS - elapsed, 0);
  
  const timerEl = $('timer');
  if (timerEl) {
    timerEl.textContent = `Time: ${formatTime(remaining)}`;
  }
  
  if (remaining === 0 && typeof onTimeExpiredCallback === 'function') {
    onTimeExpiredCallback();
  }
}

/**
 * Update question timer display
 */
function updateQuestionTimer() {
  const startTime = getQuestionStartTime();
  if (!startTime) return;
  
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  
  const timerEl = $('questionTime');
  if (timerEl) {
    timerEl.innerHTML = `⏱️ ${elapsed}s`;
  }
}

/**
 * Start exam timer
 * @param {Function} onExpired - Callback when time expires
 */
export function startExamTimer(onExpired) {
  stopExamTimer();
  
  onTimeExpiredCallback = onExpired;
  setExamStartTime(Date.now());
  
  // Hide timer in learning mode
  if (isLearningMode()) {
    toggleVisibility('timer', false);
    return;
  }
  
  toggleVisibility('timer', true);
  
  const timerEl = $('timer');
  if (timerEl) {
    timerEl.textContent = `Time: ${formatTime(EXAM_CONFIG.TIME_LIMIT_SECONDS)}`;
  }
  
  const interval = setInterval(updateExamTimer, 1000);
  setTimerInterval(interval);
}

/**
 * Stop exam timer
 */
export function stopExamTimer() {
  const interval = getTimerInterval();
  if (interval) {
    clearInterval(interval);
    setTimerInterval(null);
  }
}

/**
 * Start question timer
 */
export function startQuestionTimer() {
  stopQuestionTimer();
  
  setQuestionStartTime(Date.now());
  
  const timerEl = $('questionTime');
  if (timerEl) {
    timerEl.innerHTML = '⏱️ 0s';
  }
  
  const interval = setInterval(updateQuestionTimer, 1000);
  setQuestionTimerInterval(interval);
}

/**
 * Stop question timer
 */
export function stopQuestionTimer() {
  const interval = getQuestionTimerInterval();
  if (interval) {
    clearInterval(interval);
    setQuestionTimerInterval(null);
  }
}

/**
 * Reset question timer (for new question)
 */
export function resetQuestionTimer() {
  setQuestionStartTime(Date.now());
  updateQuestionTimer();
}

/**
 * Get elapsed time for current question (in seconds)
 * @returns {number}
 */
export function getQuestionElapsed() {
  const startTime = getQuestionStartTime();
  if (!startTime) return 0;
  return Math.round((Date.now() - startTime) / 1000);
}

/**
 * Get total elapsed exam time (in seconds)
 * @returns {number}
 */
export function getExamElapsed() {
  const startTime = getExamStartTime();
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Display stored time for a question
 * @param {number} timeInSeconds - Stored time
 */
export function displayStoredTime(timeInSeconds) {
  const timerEl = $('questionTime');
  if (timerEl && timeInSeconds) {
    timerEl.textContent = `⏱️ ${timeInSeconds}s`;
  }
}

/**
 * Stop all timers
 */
export function stopAllTimers() {
  stopExamTimer();
  stopQuestionTimer();
}
