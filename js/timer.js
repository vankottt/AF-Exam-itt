/**
 * Timer Module
 * Управление на таймера за изпит
 */

import { EXAM_CONFIG } from './config.js';
import {
  setExamStartTime, getExamStartTime,
  setQuestionStartTime, getQuestionStartTime,
  setTimerInterval, getTimerInterval,
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
 * Reset question start time (for tracking time spent)
 */
export function resetQuestionTimer() {
  setQuestionStartTime(Date.now());
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
 * Stop all timers
 */
export function stopAllTimers() {
  stopExamTimer();
}