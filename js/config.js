/**
 * Application Configuration
 * Централизирани константи и настройки
 */

// ============ EXAM SETTINGS ============
export const EXAM_CONFIG = {
  TOTAL_EXAMS: 5,
  PASS_THRESHOLD: 72,
  TIME_LIMIT_MINUTES: 105,
  get TIME_LIMIT_SECONDS() {
    return this.TIME_LIMIT_MINUTES * 60;
  }
};

// ============ SPACED REPETITION SETTINGS ============
export const SPACED_REP_CONFIG = {
  // Levels: 0 = new, 1-5 = learning stages
  MAX_LEVEL: 5,

  // How many questions before showing again based on level
  INTERVALS: {
    0: 2,    // New/wrong: show after 2 questions
    1: 4,    // Level 1: show after 4 questions
    2: 8,    // Level 2: show after 8 questions
    3: 15,   // Level 3: show after 15 questions
    4: 25,   // Level 4: show after 25 questions
    5: 50    // Mastered: show after 50 questions
  },

  // Level changes
  CORRECT_SURE: 2,      // +2 levels if correct and sure
  CORRECT_NOT_SURE: 1,  // +1 level if correct but not sure
  WRONG: -2             // -2 levels if wrong (min 0)
};

// ============ FIREBASE CONFIG ============
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBJaaT_pLFyNixluOqop8IXrLity9FWjk4",
  authDomain: "agentforce-ivan.firebaseapp.com",
  databaseURL: "https://agentforce-ivan-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "agentforce-ivan",
  storageBucket: "agentforce-ivan.firebasestorage.app",
  messagingSenderId: "934030998938",
  appId: "1:934030998938:web:b6883c298be0baecbc8e23"
};

// ============ STORAGE KEYS ============
export const STORAGE_KEYS = {
  DARK_MODE: 'darkMode',
  SYNC_ID: 'ivan_sync_id'
};

// ============ UI MESSAGES ============
export const MESSAGES = {
  BG: {
    LOADING: '⏳ Зареждане...',
    LOADED: (count) => `✅ ${count} въпроса`,
    ERROR_LOAD: '❌ Грешка',
    MODE_LEARNING: '📚 Learning',
    MODE_EXAM: '📝 Exam',
    MODE_SMART: '🧠 Smart',
    MODE_DESC_LEARNING: '📚 Виждаш верния отговор веднага.',
    MODE_DESC_EXAM: '📝 Резултатите се показват накрая.',
    MODE_DESC_SMART: '🧠 Адаптивно учене - фокус върху слабите места.',
    CHOOSE_MODE: 'Избери как искаш да се упражняваш.',
    WAIT_QUESTIONS: 'Първо изчакай въпросите да се заредят.',
    CHOOSE_MODE_FIRST: 'Първо избери режим.',
    CONFIRM_EXIT: 'Сигурен ли си, че искаш да излезеш?',
    CONFIRM_RESHUFFLE: 'Ще нулираш прогреса на изпитите. Сигурен ли си?',
    CONFIRM_CLEAR_STATS: 'Изтрий история и слаби точки?',
    CONFIRM_RESET_ALL: '⚠️ Това ще изтрие ВСИЧКО. Сигурен ли си?',
    CONFIRM_CONNECT: '⚠️ Това ще замени локалните данни. Продължи?',
    CONFIRM_NEW_PROFILE: '⚠️ Ще създадеш нов профил. Сигурен ли си?',
    ENTER_SYNC_ID: 'Въведи Sync ID',
    SYNC_ID_NOT_FOUND: '❌ Не е намерен такъв Sync ID',
    CONNECTED: '✅ Свързано успешно!',
    NEW_PROFILE: '✅ Нов профил създаден!',
    PASSED: '✅ ВЗЕТ',
    FAILED: '❌ НЕ Е ВЗЕТ',
    MIN_THRESHOLD: '(мин. 72%)',
    CORRECT_ANSWERS: 'Верни:',
    WRONG_ANSWERS: 'Грешни:',
    CORRECT_NOT_SURE: 'Верни, но несигурни:',
    DONT_KNOW: 'Не знам:',
    TIME: 'Време:',
    NO_DATA: '—',
    NEED_MORE_EXAMS: 'Нужни са поне 2 изпита'
  }
};

// ============ MODES ============
export const MODES = {
  LEARNING: 'learning',
  EXAM: 'exam',
  SMART: 'smart'
};

// ============ ROUND TYPES ============
export const ROUND_TYPES = {
  BASE: 'base',
  REVIEW_WRONG: 'reviewWrong',
  REVIEW_NOT_SURE: 'reviewNotSure',
  REVIEW_DONT_KNOW: 'reviewDontKnow',
  REVIEW_ALL: 'reviewAll',
  REVIEW_WEAK: 'reviewWeak'
};

export const ROUND_TITLES = {
  [ROUND_TYPES.BASE]: 'Резултат',
  [ROUND_TYPES.REVIEW_WRONG]: 'Грешни',
  [ROUND_TYPES.REVIEW_NOT_SURE]: 'Несигурни',
  [ROUND_TYPES.REVIEW_DONT_KNOW]: 'Не знам',
  [ROUND_TYPES.REVIEW_ALL]: 'Всички за преглед',
  [ROUND_TYPES.REVIEW_WEAK]: 'Слаби точки'
};

// ============ SYNC STATUS ICONS ============
export const SYNC_STATUS = {
  LOADING: '⏳',
  SYNCING: '🔄',
  CONNECTED: '✅',
  OFFLINE: '📡',
  ERROR: '❌'
};

// ============ DEBOUNCE DELAYS ============
export const DELAYS = {
  SAVE_DEBOUNCE: 500,
  FIREBASE_INIT: 300,
  COPY_FEEDBACK: 1500
};