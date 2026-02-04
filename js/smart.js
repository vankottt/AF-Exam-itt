/**
 * Smart Mode - Spaced Repetition Logic
 * Адаптивно учене с фокус върху слабите места
 */

import { SPACED_REP_CONFIG } from './config.js';
import {
    getState, getSpacedRepData, updateSpacedRepData,
    getAllSpacedRepData
} from './state.js';
import { shuffle } from './utils.js';

/**
 * Update spaced repetition level after answering
 * @param {number} qid - Question ID
 * @param {boolean} correct - Was answer correct
 * @param {boolean} notSure - Was marked as "not sure"
 */
export function updateSpacedRepLevel(qid, correct, notSure) {
    const data = getSpacedRepData(qid);
    let newLevel = data.level;

    if (correct) {
        if (notSure) {
            newLevel += SPACED_REP_CONFIG.CORRECT_NOT_SURE;
        } else {
            newLevel += SPACED_REP_CONFIG.CORRECT_SURE;
        }
    } else {
        newLevel += SPACED_REP_CONFIG.WRONG;
    }

    // Clamp level between 0 and MAX_LEVEL
    newLevel = Math.max(0, Math.min(SPACED_REP_CONFIG.MAX_LEVEL, newLevel));

    updateSpacedRepData(qid, {
        level: newLevel,
        lastSeen: Date.now(),
        seenCount: data.seenCount + 1
    });
}

/**
 * Calculate priority score for a question (lower = show sooner)
 * @param {number} qid - Question ID
 * @param {number} currentPosition - Current position in session
 * @returns {number} Priority score
 */
export function calculatePriority(qid, currentPosition = 0) {
    const data = getSpacedRepData(qid);
    const interval = SPACED_REP_CONFIG.INTERVALS[data.level] || 50;

    // Never seen = highest priority
    if (data.seenCount === 0) {
        return -1000 + Math.random() * 100; // Add randomness for new questions
    }

    // Calculate how "overdue" this question is
    const questionsSinceSeen = currentPosition - (data.lastSeenPosition || 0);
    const overdueScore = questionsSinceSeen - interval;

    // Lower level = higher priority (shown sooner)
    const levelPenalty = data.level * 10;

    return overdueScore - levelPenalty;
}

/**
 * Generate a smart session queue
 * @param {number} sessionSize - Number of questions for session
 * @returns {number[]} Array of question IDs in order
 */
export function generateSmartQueue(sessionSize = 20) {
    const state = getState();
    const allQids = state.allQuestionIds;

    if (!allQids.length) return [];

    // Score all questions
    const scored = allQids.map(qid => ({
        qid,
        priority: calculatePriority(qid, 0),
        data: getSpacedRepData(qid)
    }));

    // Sort by priority (lowest first = show first)
    scored.sort((a, b) => a.priority - b.priority);

    // Take top questions for session
    const selected = scored.slice(0, Math.min(sessionSize, allQids.length));

    // Shuffle slightly to avoid predictability
    return shuffleWithPriority(selected);
}

/**
 * Shuffle while respecting priority groups
 * @param {Array} scoredQuestions
 * @returns {number[]}
 */
function shuffleWithPriority(scoredQuestions) {
    // Group by priority tiers
    const urgent = [];    // Level 0-1 or never seen
    const moderate = [];  // Level 2-3
    const review = [];    // Level 4-5

    scoredQuestions.forEach(({ qid, data }) => {
        if (data.seenCount === 0 || data.level <= 1) {
            urgent.push(qid);
        } else if (data.level <= 3) {
            moderate.push(qid);
        } else {
            review.push(qid);
        }
    });

    // Shuffle within groups and combine
    return [
        ...shuffle(urgent),
        ...shuffle(moderate),
        ...shuffle(review)
    ];
}

/**
 * Get statistics for smart mode
 * @returns {Object}
 */
export function getSmartStats() {
    const state = getState();
    const allQids = state.allQuestionIds;
    const srData = getAllSpacedRepData();

    let mastered = 0;    // Level 4-5
    let learning = 0;    // Level 1-3
    let struggling = 0;  // Level 0 with seenCount > 0
    let notStarted = 0;  // Never seen

    allQids.forEach(qid => {
        const data = srData[qid];
        if (!data || data.seenCount === 0) {
            notStarted++;
        } else if (data.level >= 4) {
            mastered++;
        } else if (data.level >= 1) {
            learning++;
        } else {
            struggling++;
        }
    });

    return {
        total: allQids.length,
        mastered,
        learning,
        struggling,
        notStarted,
        masteredPct: allQids.length ? Math.round((mastered / allQids.length) * 100) : 0
    };
}

/**
 * Get questions that need review (due based on interval)
 * @returns {number[]}
 */
export function getDueQuestions() {
    const state = getState();
    const allQids = state.allQuestionIds;

    return allQids.filter(qid => {
        const data = getSpacedRepData(qid);
        if (data.seenCount === 0) return true; // Never seen

        const interval = SPACED_REP_CONFIG.INTERVALS[data.level];
        const timeSinceSeen = Date.now() - data.lastSeen;
        const hoursSinceSeen = timeSinceSeen / (1000 * 60 * 60);

        // Consider due if more than interval hours have passed
        return hoursSinceSeen >= interval;
    });
}

/**
 * Track position in current session for spacing
 * @param {number} qid - Question ID
 * @param {number} position - Position in session
 */
export function markQuestionSeen(qid, position) {
    const data = getSpacedRepData(qid);
    updateSpacedRepData(qid, {
        ...data,
        lastSeenPosition: position
    });
}