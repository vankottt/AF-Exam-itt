/**
 * UI Module
 * Рендериране и манипулация на интерфейса
 */

import { MESSAGES, ROUND_TYPES, ROUND_TITLES, EXAM_CONFIG, MODES } from './config.js';
import {
  getState, getCurrentQuestionId, getCurrentQuestion,
  getQuestionState, getAnswerOrder, getCorrectText,
  getCompletedExams, isLearningMode, isSmartMode, isExamMode,
  getQuestionMeta
} from './state.js';
import { $, setText, setHtml, setStyle, toggleVisibility, addClass, removeClass, toggleClass, formatTimeVerbose, calcPercent } from './utils.js';
import { ensureAnswerOrder, getAnsweredCount, computeStats } from './quiz.js';

// ============ PANEL VISIBILITY ============

export function showSetupPanel() {
  toggleVisibility('setupPanel', true);
  toggleVisibility('examUI', false);
  toggleVisibility('resultsPanel', false);
}

export function showExamUI() {
  toggleVisibility('setupPanel', false);
  toggleVisibility('examUI', true);
  toggleVisibility('resultsPanel', false);
}

export function showResultsPanel() {
  toggleVisibility('examUI', false);
  toggleVisibility('resultsPanel', true);
}

export function showStatsPanel() {
  toggleVisibility('statsPanel', true);
}

export function hideStatsPanel() {
  toggleVisibility('statsPanel', false);
}

export function showSyncModal() {
  addClass('syncModal', 'show');
}

export function hideSyncModal() {
  removeClass('syncModal', 'show');
}

// ============ SETUP PANEL ============

/**
 * Update loading status
 * @param {number} count - Number of questions loaded
 * @param {boolean} success - Whether loading succeeded
 */
export function updateLoadStatus(count, success) {
  const statusEl = $('loadStatus');

  if (success) {
    setText(statusEl, MESSAGES.BG.LOADED(count));
    setStyle(statusEl, 'color', 'var(--success)');
    addClass('step1num', 'done');
    addClass('step2num', 'active');
    $('learningModeBtn').disabled = false;
    $('examModeBtn').disabled = false;
    $('smartModeBtn').disabled = false;
    setText('modeDesc', MESSAGES.BG.CHOOSE_MODE);
  } else {
    setText(statusEl, MESSAGES.BG.ERROR_LOAD);
    setStyle(statusEl, 'color', 'var(--danger)');
  }
}

/**
 * Update mode selection UI
 * @param {'learning'|'exam'|'smart'} mode - Selected mode
 */
export function updateModeUI(mode) {
  toggleClass('learningModeBtn', 'selected', mode === 'learning');
  toggleClass('examModeBtn', 'selected', mode === 'exam');
  toggleClass('smartModeBtn', 'selected', mode === 'smart');

  let desc;
  if (mode === 'learning') {
    desc = MESSAGES.BG.MODE_DESC_LEARNING;
  } else if (mode === 'exam') {
    desc = MESSAGES.BG.MODE_DESC_EXAM;
  } else {
    desc = MESSAGES.BG.MODE_DESC_SMART;
  }
  setText('modeDesc', desc);

  removeClass('step2num', 'active');
  addClass('step2num', 'done');
  addClass('step3num', 'active');

  // Show/hide smart stats
  toggleVisibility('smartStats', mode === 'smart');

  // Show/hide exam buttons based on mode
  if (mode === 'smart') {
    toggleVisibility('examButtons', false);
    toggleVisibility('examPlaceholder', false);
    toggleVisibility('reshuffleBtn', false);
    $('startBtn').disabled = false;
  } else {
    // Learning/Exam mode - will show exam buttons after loadOrGenerateExams()
    toggleVisibility('examButtons', true);
    toggleVisibility('examPlaceholder', true);
    $('startBtn').disabled = true;
  }
}

/**
 * Render exam buttons
 */
export function renderExamButtons() {
  const state = getState();
  const completed = getCompletedExams();

  $('examPlaceholder').style.display = 'none';
  toggleVisibility('reshuffleBtn', true);
  toggleVisibility('examButtons', true);

  const html = state.exams.map((exam, i) => {
    const done = completed.has(i);
    const style = done
      ? 'background:var(--success);color:#fff;border-color:var(--success);'
      : '';
    return `<button data-exam="${i}" style="${style}">Изпит ${i + 1} (${exam.length})</button>`;
  }).join('');

  setHtml('examButtons', html);
}

/**
 * Update smart mode stats display
 * @param {Object} smartStats - Stats from getSmartStats()
 */
export function updateSmartStats(smartStats) {
  setText('smartMastered', smartStats.mastered);
  setText('smartLearning', smartStats.learning);
  setText('smartStruggling', smartStats.struggling);
  setText('smartNew', smartStats.notStarted);

  const progressBar = $('smartProgressBar');
  if (progressBar) {
    progressBar.style.width = `${smartStats.masteredPct}%`;
  }

  setText('smartProgressText', `${smartStats.masteredPct}% овладени`);
}

/**
 * Select exam button
 * @param {number} index - Exam index
 */
export function selectExamButton(index) {
  $('examButtons').querySelectorAll('button').forEach(btn => {
    btn.classList.remove('selected');
  });

  const btn = $('examButtons').querySelector(`[data-exam="${index}"]`);
  if (btn) btn.classList.add('selected');

  removeClass('step3num', 'active');
  addClass('step3num', 'done');
  $('startBtn').disabled = false;
}

/**
 * Reset setup panel to initial state
 */
export function resetSetupPanel() {
  removeClass('learningModeBtn', 'selected');
  removeClass('examModeBtn', 'selected');
  removeClass('smartModeBtn', 'selected');
  removeClass('step2num', 'done');
  addClass('step2num', 'active');
  removeClass('step3num', 'done');
  removeClass('step3num', 'active');
  setHtml('examButtons', '');
  $('examPlaceholder').style.display = '';
  toggleVisibility('reshuffleBtn', false);
  toggleVisibility('smartStats', false);
  toggleVisibility('examButtons', true);
  $('startBtn').disabled = true;
  setText('modeDesc', MESSAGES.BG.CHOOSE_MODE);
}

// ============ EXAM UI ============

/**
 * Initialize exam UI
 */
export function initExamUI() {
  const state = getState();
  let modeLabel;

  if (isLearningMode()) {
    modeLabel = MESSAGES.BG.MODE_LEARNING;
  } else if (isSmartMode()) {
    modeLabel = MESSAGES.BG.MODE_SMART;
  } else {
    modeLabel = MESSAGES.BG.MODE_EXAM;
  }

  setText('modeIndicator', modeLabel);
  $('modeIndicator').className = state.currentMode;
  setStyle('progressFill', 'width', '0%');
}

/**
 * Render current question
 */
export function renderQuestion() {
  const qid = getCurrentQuestionId();
  const question = getCurrentQuestion();
  const state = getState();
  const qState = getQuestionState(qid);
  const qMeta = getQuestionMeta(qid);

  if (!question) return;

  ensureAnswerOrder(qid);
  const answerOrder = getAnswerOrder(qid);

  // Update progress
  const answered = getAnsweredCount(state.questionState);
  const progress = (answered / state.stack.length) * 100;
  setStyle('progressFill', 'width', `${progress}%`);

  // Update counter
  setText('counter', `[Q${qid}] ${state.currentIndex + 1}/${state.stack.length}`);

  // Update question text
  setText('question', question.question);

  // Clear result line
  const resultLine = $('resultLine');
  setHtml(resultLine, '');
  setStyle(resultLine, 'background', '');
  setStyle(resultLine, 'color', '');

  // Update confidence checkboxes
  $('dontKnow').checked = qState?.dontKnow || false;
  $('notSure').checked = qState?.notSure || false;

  // Update flag button
  const flagBtn = $('flagBtn');
  if (flagBtn) {
    toggleClass(flagBtn, 'flagged', qMeta.flagged);
  }

  // Update note
  const noteTextarea = $('questionNote');
  if (noteTextarea) {
    noteTextarea.value = qMeta.note || '';
  }

  // Close notes section if empty
  const notesSection = $('notesSection');
  if (notesSection && !qMeta.note) {
    notesSection.removeAttribute('open');
  } else if (notesSection && qMeta.note) {
    notesSection.setAttribute('open', '');
  }

  // Render answers
  const answersHtml = answerOrder.map(([letter, text]) => `
    <div class="answer" data-letter="${letter}">
      <label>
        <input type="radio" name="answer" value="${letter}">
        ${text}
      </label>
    </div>
  `).join('');

  setHtml('answers', answersHtml);

  // Restore selected answer
  if (qState?.selectedAnswer) {
    const radio = document.querySelector(`input[name="answer"][value="${qState.selectedAnswer}"]`);
    if (radio) radio.checked = true;
  }

  // Show result in learning/smart mode if already answered
  if ((isLearningMode() || isSmartMode()) && qState?.status && qState.status !== 'unanswered') {
    showQuestionResult(qState);
  } else {
    enableAnswerSelection();
  }
}

/**
 * Show question result (learning mode)
 * @param {Object} qState - Question state
 */
function showQuestionResult(qState) {
  const qid = getCurrentQuestionId();

  // Disable inputs
  document.querySelectorAll('input[name="answer"]').forEach(r => r.disabled = true);
  $('dontKnow').disabled = true;
  $('notSure').disabled = true;

  // Highlight answer
  const selectedWrapper = document.querySelector(
    `input[name="answer"][value="${qState.selectedAnswer}"]`
  )?.closest('.answer');

  const resultLine = $('resultLine');

  if (qState.status === 'correct') {
    selectedWrapper?.classList.add('correct');
    setHtml(resultLine, '✅ Вярно');
    setStyle(resultLine, 'background', 'var(--success)');
    setStyle(resultLine, 'color', '#fff');
  } else {
    selectedWrapper?.classList.add('wrong');
    setHtml(resultLine, `❌ Грешно → ${getCorrectText(qid)}`);
    setStyle(resultLine, 'background', 'var(--danger)');
    setStyle(resultLine, 'color', '#fff');
  }
}

/**
 * Enable answer selection
 */
function enableAnswerSelection() {
  document.querySelectorAll('input[name="answer"]').forEach(r => r.disabled = false);
  $('dontKnow').disabled = false;
  $('notSure').disabled = false;
}

/**
 * Get currently selected answer
 * @returns {string|null}
 */
export function getSelectedAnswer() {
  const radio = document.querySelector('input[name="answer"]:checked');
  return radio?.value || null;
}

/**
 * Get confidence checkbox values
 * @returns {{dontKnow: boolean, notSure: boolean}}
 */
export function getConfidenceValues() {
  return {
    dontKnow: $('dontKnow')?.checked || false,
    notSure: $('notSure')?.checked || false
  };
}

// ============ RESULTS PANEL ============

/**
 * Render results screen
 * @param {Object} options - Render options
 */
export function renderResults(options) {
  const {
    roundType,
    questionState,
    stack,
    mode,
    baseState,
    baseStack,
    onReviewAll,
    onReviewWrong,
    onReviewNotSure,
    onReviewDontKnow,
    onBackToBase,
    onNewExam,
    onViewStats
  } = options;

  const stats = computeStats(questionState, stack);
  const total = stack.length;
  const pct = calcPercent(stats.correct, total);
  const passed = pct >= EXAM_CONFIG.PASS_THRESHOLD;
  const avgTime = total ? Math.round(stats.totalTime / total) : 0;

  let modeLabel;
  if (mode === 'learning') {
    modeLabel = MESSAGES.BG.MODE_LEARNING;
  } else if (mode === 'smart') {
    modeLabel = MESSAGES.BG.MODE_SMART;
  } else {
    modeLabel = MESSAGES.BG.MODE_EXAM;
  }

  // Build review buttons
  let reviewHtml = '';
  if (baseState && baseStack) {
    const bs = computeStats(baseState, baseStack);
    const allForReview = [...new Set([...bs.wrong, ...bs.dk, ...bs.ns])];

    reviewHtml = `
      <div id="reviewButtons">
        <button id="reviewAllBtn" ${allForReview.length ? '' : 'disabled'}>
          📋 Всички за преглед (${allForReview.length})
        </button>
        <button id="reviewWrongBtn" ${bs.wrong.length ? '' : 'disabled'}>
          🔁 Грешни (${bs.wrong.length})
        </button>
        <button id="reviewNotSureBtn" ${bs.ns.length ? '' : 'disabled'}>
          ⚠️ Несигурни (${bs.ns.length})
        </button>
        <button id="reviewDontKnowBtn" ${bs.dk.length ? '' : 'disabled'}>
          ❓ Не знам (${bs.dk.length})
        </button>
        ${roundType !== ROUND_TYPES.BASE
        ? '<button id="backToBaseResultsBtn">⬅️ Основен</button>'
        : ''}
      </div>
    `;
  }

  const html = `
    <h3>${ROUND_TITLES[roundType]} 
      <small style="font-weight:normal;color:var(--text2);">(${modeLabel})</small>
    </h3>
    <p style="font-size:20px;">
      <strong>${passed ? MESSAGES.BG.PASSED : MESSAGES.BG.FAILED}</strong> 
      ${MESSAGES.BG.MIN_THRESHOLD}
    </p>
    <p><strong>${MESSAGES.BG.CORRECT_ANSWERS}</strong> ${stats.correct}/${total} (${pct}%)</p>
    <p>❌ <strong>${MESSAGES.BG.WRONG_ANSWERS}</strong> ${stats.wrong.length ? stats.wrong.join(', ') : MESSAGES.BG.NO_DATA}</p>
    <p>⚠️ <strong>${MESSAGES.BG.CORRECT_NOT_SURE}</strong> ${stats.correctButNotSure.length ? stats.correctButNotSure.join(', ') : MESSAGES.BG.NO_DATA}</p>
    <p>❓ <strong>${MESSAGES.BG.DONT_KNOW}</strong> ${stats.dk.length ? stats.dk.join(', ') : MESSAGES.BG.NO_DATA}</p>
    <p>⏱️ <strong>${MESSAGES.BG.TIME}</strong> ${formatTimeVerbose(stats.totalTime)} (${avgTime}s/въпр.)</p>
    ${reviewHtml}
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
      <button id="newExamBtn" style="flex:1;">🔄 Нов изпит</button>
      <button id="viewStatsBtn" style="flex:1;">📊 Статистики</button>
    </div>
  `;

  setHtml('resultsPanel', html);

  // Attach event handlers
  $('newExamBtn')?.addEventListener('click', onNewExam);
  $('viewStatsBtn')?.addEventListener('click', onViewStats);
  $('reviewAllBtn')?.addEventListener('click', onReviewAll);
  $('reviewWrongBtn')?.addEventListener('click', onReviewWrong);
  $('reviewNotSureBtn')?.addEventListener('click', onReviewNotSure);
  $('reviewDontKnowBtn')?.addEventListener('click', onReviewDontKnow);
  $('backToBaseResultsBtn')?.addEventListener('click', onBackToBase);
}

// ============ DARK MODE ============

/**
 * Toggle dark mode
 * @returns {boolean} - New dark mode state
 */
export function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  setText('darkModeBtn', isDark ? '☀️' : '🌙');
  return isDark;
}

/**
 * Set dark mode
 * @param {boolean} enabled
 */
export function setDarkModeUI(enabled) {
  toggleClass(document.body, 'dark', enabled);
  setText('darkModeBtn', enabled ? '☀️' : '🌙');
}

// ============ HELP BOX ============

export function toggleHelpBox() {
  toggleClass('helpBox', 'hidden');
}