/**
 * Main Application Entry Point
 * Инициализация и свързване на всички модули
 */

import { ROUND_TYPES, DELAYS, MESSAGES, MODES } from './config.js';
import * as state from './state.js';
import * as storage from './storage.js';
import * as timer from './timer.js';
import * as quiz from './quiz.js';
import * as stats from './stats.js';
import * as ui from './ui.js';
import * as smart from './smart.js';
import { $, shuffle, confirmAction, showAlert, copyToClipboard } from './utils.js';

// ============ INITIALIZATION ============

async function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => { });
  }

  // Initialize dark mode
  if (storage.isDarkMode()) {
    ui.setDarkModeUI(true);
  }

  // Load questions
  try {
    const response = await fetch('./agentforce_questions.json');
    if (!response.ok) throw new Error('Failed to load questions');

    const data = await response.json();
    state.loadQuestions(data.questions);
    ui.updateLoadStatus(state.getState().allQuestionIds.length, true);
  } catch (error) {
    console.error('Error loading questions:', error);
    ui.updateLoadStatus(0, false);
    return;
  }

  // Initialize Firebase sync
  setTimeout(() => {
    storage.initFirebase(onCloudDataChange);
  }, DELAYS.FIREBASE_INIT);

  // Set up event listeners
  setupEventListeners();
}

/**
 * Callback when cloud data changes
 */
function onCloudDataChange() {
  const s = state.getState();

  // Update exam buttons if on setup screen
  if (!$('setupPanel').classList.contains('hidden') && s.exams.length > 0 && s.currentMode) {
    ui.renderExamButtons();
  }

  // Update stats panel if visible
  if (!$('statsPanel').classList.contains('hidden')) {
    stats.updateStatsPanel();
  }
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
  // Dark mode toggle
  $('darkModeBtn').onclick = () => {
    const isDark = ui.toggleDarkMode();
    storage.setDarkMode(isDark);
  };

  // Mode selection
  $('learningModeBtn').onclick = () => selectMode(MODES.LEARNING);
  $('examModeBtn').onclick = () => selectMode(MODES.EXAM);
  $('smartModeBtn').onclick = () => selectMode(MODES.SMART);

  // Exam selection
  $('examButtons').onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const idx = Number(btn.dataset.exam);
    state.setSelectedExamIndex(idx);
    ui.selectExamButton(idx);
  };

  // Reshuffle exams
  $('reshuffleBtn').onclick = reshuffleExams;

  // Start exam
  $('startBtn').onclick = startExam;

  // Exit exam
  $('exitBtn').onclick = exitExam;

  // Navigation
  $('nextBtn').onclick = handleNext;
  $('backBtn').onclick = handleBack;

  // Answer selection
  $('answers').onchange = handleAnswerChange;
  $('answers').onclick = handleAnswerClick;
  $('dontKnow').onchange = handleConfidenceChange;
  $('notSure').onchange = handleConfidenceChange;

  // Help toggle
  $('helpToggle').onclick = ui.toggleHelpBox;

  // Flag button
  $('flagBtn').onclick = handleFlag;

  // Notes
  $('saveNoteBtn').onclick = handleSaveNote;

  // Keyboard shortcuts
  document.onkeydown = handleKeyboard;

  // Stats panel
  $('statsBtn').onclick = openStatsPanel;
  $('closeStatsBtn').onclick = ui.hideStatsPanel;
  $('clearStatsBtn').onclick = clearStats;
  $('resetAllBtn').onclick = resetAll;
  $('reviewWeakBtn').onclick = reviewWeakPoints;
  $('reviewFlaggedBtn').onclick = reviewFlaggedQuestions;

  // Exam details modal
  $('closeExamDetails').onclick = () => {
    $('examDetailsModal').classList.remove('show');
  };
  $('examDetailsModal').onclick = (e) => {
    if (e.target === $('examDetailsModal')) {
      $('examDetailsModal').classList.remove('show');
    }
  };

  // Sync modal
  $('syncBtn').onclick = () => {
    $('currentSyncId').value = storage.getCurrentSyncId() || '';
    ui.showSyncModal();
  };
  $('closeSyncModal').onclick = ui.hideSyncModal;
  $('syncModal').onclick = (e) => {
    if (e.target === $('syncModal')) ui.hideSyncModal();
  };
  $('copySyncIdBtn').onclick = copySyncId;
  $('connectSyncBtn').onclick = connectToSync;
  $('resetSyncBtn').onclick = resetSyncProfile;
}

// ============ MODE & EXAM SELECTION ============

function selectMode(mode) {
  state.setMode(mode);
  ui.updateModeUI(mode);

  if (mode === MODES.SMART) {
    // Update smart stats
    const smartStats = smart.getSmartStats();
    ui.updateSmartStats(smartStats);
  } else {
    loadOrGenerateExams();
  }
}

function loadOrGenerateExams() {
  const s = state.getState();

  if (!s.exams.length || s.exams[0]?.length === 0) {
    const exams = quiz.generateExams(s.allQuestionIds);
    state.setExams(exams);
    storage.saveAll();
  }

  ui.renderExamButtons();
}

function reshuffleExams() {
  if (state.getCompletedExams().size > 0) {
    if (!confirmAction(MESSAGES.BG.CONFIRM_RESHUFFLE)) return;
  }

  const s = state.getState();
  const exams = quiz.generateExams(s.allQuestionIds);
  state.setExams(exams);
  state.getState().completedLearning.clear();
  state.getState().completedExam.clear();
  storage.saveAll();
  ui.renderExamButtons();
}

// ============ EXAM FLOW ============

function startExam() {
  const s = state.getState();

  let examQuestions;

  if (s.currentMode === MODES.SMART) {
    // Smart mode: generate adaptive queue
    examQuestions = smart.generateSmartQueue(30);
    if (!examQuestions.length) {
      showAlert('Няма заредени въпроси за Smart режим.');
      return;
    }
  } else {
    // Learning/Exam mode: use selected exam
    if (s.selectedExamIndex === null) return;
    examQuestions = s.exams[s.selectedExamIndex];
  }

  if (!examQuestions || !examQuestions.length) return;
  if (!quiz.startRound(ROUND_TYPES.BASE, examQuestions)) return;

  ui.showExamUI();
  ui.initExamUI();
  timer.startExamTimer(finishExam);
  timer.resetQuestionTimer();
  ui.renderQuestion();
}

function exitExam() {
  if (!confirmAction(MESSAGES.BG.CONFIRM_EXIT)) return;

  timer.stopAllTimers();
  ui.showSetupPanel();

  const s = state.getState();
  if (s.currentMode === MODES.SMART) {
    ui.updateModeUI(MODES.SMART);
    const smartStats = smart.getSmartStats();
    ui.updateSmartStats(smartStats);
  } else {
    ui.renderExamButtons();
  }
}

function handleNext() {
  const selected = ui.getSelectedAnswer();
  quiz.handleNext(finishExam, ui.renderQuestion, selected);
}

function handleBack() {
  quiz.handleBack(ui.renderQuestion);
}

function handleAnswerChange(e) {
  if (e.target?.name !== 'answer') return;
  const { dontKnow, notSure } = ui.getConfidenceValues();
  quiz.updateDraftState(e.target.value, dontKnow, notSure);
}

function handleAnswerClick(e) {
  const answerDiv = e.target.closest('.answer');
  if (!answerDiv) return;

  const radio = answerDiv.querySelector('input[type="radio"]');
  if (radio && !radio.disabled) {
    radio.checked = true;
    const { dontKnow, notSure } = ui.getConfidenceValues();
    quiz.updateDraftState(radio.value, dontKnow, notSure);
  }
}

function handleConfidenceChange() {
  const selected = ui.getSelectedAnswer();
  const { dontKnow, notSure } = ui.getConfidenceValues();
  quiz.updateDraftState(selected, dontKnow, notSure);
}

function handleKeyboard(e) {
  if ($('examUI').classList.contains('hidden')) return;

  // Number keys for answer selection
  if (['1', '2', '3', '4'].includes(e.key)) {
    const radios = document.querySelectorAll('input[name="answer"]');
    const idx = parseInt(e.key) - 1;
    if (radios[idx] && !radios[idx].disabled) {
      radios[idx].checked = true;
      const { dontKnow, notSure } = ui.getConfidenceValues();
      quiz.updateDraftState(radios[idx].value, dontKnow, notSure);
    }
  }

  // Arrow keys for navigation
  if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
  if (e.key === 'ArrowLeft') handleBack();

  // F key for flag
  if (e.key === 'f' || e.key === 'F') handleFlag();
}

// ============ FLAG & NOTES ============

function handleFlag() {
  const qid = state.getCurrentQuestionId();
  if (!qid) return;

  const newState = state.toggleQuestionFlag(qid);
  const flagBtn = $('flagBtn');
  if (flagBtn) {
    flagBtn.classList.toggle('flagged', newState);
  }
  storage.saveAll();
}

function handleSaveNote() {
  const qid = state.getCurrentQuestionId();
  const noteTextarea = $('questionNote');
  if (!qid || !noteTextarea) return;

  state.setQuestionNote(qid, noteTextarea.value);
  storage.saveAll();

  // Visual feedback
  const btn = $('saveNoteBtn');
  const originalText = btn.textContent;
  btn.textContent = '✓ Запазено';
  setTimeout(() => {
    btn.textContent = originalText;
  }, 1500);
}

function finishExam() {
  timer.stopAllTimers();

  const s = state.getState();

  // Update spaced repetition data for smart mode
  if (s.currentMode === MODES.SMART || s.currentMode === MODES.LEARNING) {
    s.stack.forEach(qid => {
      const qState = state.getQuestionState(qid);
      if (qState && qState.status !== 'unanswered') {
        smart.updateSpacedRepLevel(qid, qState.status === 'correct', qState.notSure);
      }
    });
  }

  // Record detailed history
  if (s.currentRoundType === ROUND_TYPES.BASE) {
    const examStats = quiz.computeStats(s.questionState, s.stack);

    state.addExamHistory({
      date: new Date().toISOString(),
      mode: s.currentMode,
      examIndex: s.selectedExamIndex,
      duration: timer.getExamElapsed(),
      results: {
        total: s.stack.length,
        correct: examStats.correct,
        pct: s.stack.length ? Math.round((examStats.correct / s.stack.length) * 100) : 0,
        passed: s.stack.length ? Math.round((examStats.correct / s.stack.length) * 100) >= 72 : false
      },
      questions: s.stack.map(qid => {
        const qs = state.getQuestionState(qid);
        return {
          qid,
          answer: qs?.selectedAnswer || null,
          correct: qs?.status === 'correct'
        };
      })
    });
  }

  quiz.finishExam(
    s.currentRoundType,
    s.questionState,
    s.stack,
    s.currentMode,
    s.selectedExamIndex
  );

  renderResultsScreen();
}

// ============ RESULTS ============

function renderResultsScreen() {
  const s = state.getState();

  ui.showResultsPanel();
  ui.renderResults({
    roundType: s.currentRoundType,
    questionState: s.questionState,
    stack: s.stack,
    mode: s.currentMode,
    baseState: s.baseState,
    baseStack: s.baseStack,
    onReviewAll: () => startReview(ROUND_TYPES.REVIEW_ALL),
    onReviewWrong: () => startReview(ROUND_TYPES.REVIEW_WRONG),
    onReviewNotSure: () => startReview(ROUND_TYPES.REVIEW_NOT_SURE),
    onReviewDontKnow: () => startReview(ROUND_TYPES.REVIEW_DONT_KNOW),
    onBackToBase: backToBaseResults,
    onNewExam: resetToSetup,
    onViewStats: openStatsPanel
  });
}

function startReview(reviewType) {
  const s = state.getState();
  const questions = quiz.getReviewQuestions(s.baseState, s.baseStack, reviewType);

  if (!questions.length) return;

  if (!quiz.startRound(reviewType, questions)) return;

  ui.showExamUI();
  ui.initExamUI();
  timer.startExamTimer(finishExam);
  timer.resetQuestionTimer();
  ui.renderQuestion();
}

function backToBaseResults() {
  state.setRoundType(ROUND_TYPES.BASE);
  state.restoreBaseState();
  renderResultsScreen();
}

function resetToSetup() {
  ui.showSetupPanel();

  const s = state.getState();

  // Handle different modes
  if (s.currentMode === MODES.SMART) {
    // Smart mode - restore smart stats view
    ui.updateModeUI(MODES.SMART);
    const smartStats = smart.getSmartStats();
    ui.updateSmartStats(smartStats);
  } else if (s.exams.length > 0 && s.currentMode) {
    // Learning/Exam mode - show exam buttons
    ui.renderExamButtons();
    state.setSelectedExamIndex(null);
    $('startBtn').disabled = true;
  } else {
    // No mode selected - reset everything
    ui.resetSetupPanel();
  }
}

// ============ STATS ============

function openStatsPanel() {
  stats.updateStatsPanel(showExamDetails);
  ui.showStatsPanel();
}

function showExamDetails(examId) {
  stats.renderExamDetails(examId);
}

function clearStats() {
  if (!confirmAction(MESSAGES.BG.CONFIRM_CLEAR_STATS)) return;
  state.clearStats();
  storage.saveAll();
  stats.updateStatsPanel();
}

function resetAll() {
  if (!confirmAction(MESSAGES.BG.CONFIRM_RESET_ALL)) return;
  state.resetAllData();
  storage.saveAll();
  ui.hideStatsPanel();
  ui.resetSetupPanel();
}

function reviewWeakPoints() {
  const weakIds = stats.getAllWeakQuestionIds();
  if (!weakIds.length) return;

  const s = state.getState();
  if (!s.currentMode) state.setMode('learning');

  ui.hideStatsPanel();

  if (!quiz.startRound(ROUND_TYPES.REVIEW_WEAK, weakIds)) return;

  ui.showExamUI();
  ui.initExamUI();
  timer.startExamTimer(finishExam);
  timer.resetQuestionTimer();
  ui.renderQuestion();
}

function reviewFlaggedQuestions() {
  const flaggedIds = state.getFlaggedQuestionIds();
  if (!flaggedIds.length) return;

  const s = state.getState();
  if (!s.currentMode) state.setMode('learning');

  ui.hideStatsPanel();

  if (!quiz.startRound(ROUND_TYPES.REVIEW_ALL, flaggedIds)) return;

  ui.showExamUI();
  ui.initExamUI();
  timer.startExamTimer(finishExam);
  timer.resetQuestionTimer();
  ui.renderQuestion();
}

// ============ SYNC ============

async function copySyncId() {
  const id = $('currentSyncId').value;
  if (!id) return;

  const success = await copyToClipboard(id);
  if (success) {
    $('copySyncIdBtn').textContent = '✓';
    setTimeout(() => {
      $('copySyncIdBtn').textContent = '📋';
    }, DELAYS.COPY_FEEDBACK);
  }
}

async function connectToSync() {
  const newId = $('otherSyncId').value.trim();
  if (!newId) {
    showAlert(MESSAGES.BG.ENTER_SYNC_ID);
    return;
  }

  if (!confirmAction(MESSAGES.BG.CONFIRM_CONNECT)) return;

  const success = await storage.connectToSyncId(newId);

  if (success) {
    showAlert(MESSAGES.BG.CONNECTED);
    ui.hideSyncModal();

    const s = state.getState();
    if (s.exams.length > 0 && s.currentMode) {
      ui.renderExamButtons();
    }
  } else {
    showAlert(MESSAGES.BG.SYNC_ID_NOT_FOUND);
  }
}

async function resetSyncProfile() {
  if (!confirmAction(MESSAGES.BG.CONFIRM_NEW_PROFILE)) return;

  state.resetAllData();
  await storage.createNewProfile();

  showAlert(MESSAGES.BG.NEW_PROFILE);
  ui.hideSyncModal();
  location.reload();
}

// ============ START APPLICATION ============

document.addEventListener('DOMContentLoaded', init);