/**
 * Statistics Module
 * Статистики, история и графики
 */

import { EXAM_CONFIG, MESSAGES } from './config.js';
import { getState } from './state.js';
import { $, calcPercent } from './utils.js';

/**
 * Calculate overall statistics
 * @returns {Object} Statistics object
 */
export function calculateOverallStats() {
  const state = getState();
  const { history } = state;
  
  const total = history.length;
  
  if (total === 0) {
    return {
      totalExams: 0,
      avgScore: 0,
      avgTime: 0,
      passRate: 0
    };
  }
  
  const avgScore = Math.round(
    history.reduce((sum, h) => sum + h.pct, 0) / total
  );
  
  const avgTime = Math.round(
    history.reduce((sum, h) => sum + h.avgTime, 0) / total
  );
  
  const passed = history.filter(h => h.pct >= EXAM_CONFIG.PASS_THRESHOLD).length;
  const passRate = calcPercent(passed, total);
  
  return {
    totalExams: total,
    avgScore,
    avgTime,
    passRate
  };
}

/**
 * Get weak points (most wrong questions)
 * @param {number} limit - Maximum items to return
 * @returns {Array<{qid: number, count: number}>}
 */
export function getWeakPoints(limit = 10) {
  const state = getState();
  const { wrongCounts } = state;
  
  return Object.entries(wrongCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([qid, count]) => ({ qid: Number(qid), count }));
}

/**
 * Get all weak question IDs
 * @returns {number[]}
 */
export function getAllWeakQuestionIds() {
  const state = getState();
  return Object.keys(state.wrongCounts).map(Number);
}

/**
 * Get last N history entries
 * @param {number} n - Number of entries
 * @returns {Array}
 */
export function getRecentHistory(n = 10) {
  const state = getState();
  return state.history.slice(-n);
}

/**
 * Draw history chart on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
export function drawHistoryChart(canvas) {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = 120;
  
  ctx.clearRect(0, 0, w, h);
  
  const cs = getComputedStyle(document.body);
  const history = getRecentHistory(10);
  
  // Not enough data
  if (history.length < 2) {
    ctx.fillStyle = cs.getPropertyValue('--text2');
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(MESSAGES.BG.NEED_MORE_EXAMS, w / 2, h / 2);
    return;
  }
  
  const padding = 30;
  const chartWidth = w - padding * 2;
  const chartHeight = h - padding;
  const stepX = chartWidth / (history.length - 1);
  
  // Draw pass threshold line (72%)
  ctx.strokeStyle = cs.getPropertyValue('--danger');
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  const y72 = padding + chartHeight * (1 - EXAM_CONFIG.PASS_THRESHOLD / 100);
  ctx.moveTo(padding, y72);
  ctx.lineTo(w - padding, y72);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw score line
  ctx.strokeStyle = cs.getPropertyValue('--accent');
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  history.forEach((entry, i) => {
    const x = padding + i * stepX;
    const y = padding + chartHeight * (1 - entry.pct / 100);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Draw points
  ctx.fillStyle = cs.getPropertyValue('--accent');
  history.forEach((entry, i) => {
    const x = padding + i * stepX;
    const y = padding + chartHeight * (1 - entry.pct / 100);
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Update stats panel UI
 */
export function updateStatsPanel() {
  const stats = calculateOverallStats();
  const weakPoints = getWeakPoints();
  
  // Update stat cards
  const totalEl = $('statTotalExams');
  const avgScoreEl = $('statAvgScore');
  const avgTimeEl = $('statAvgTime');
  const passRateEl = $('statPassRate');
  
  if (totalEl) totalEl.textContent = stats.totalExams;
  if (avgScoreEl) avgScoreEl.textContent = `${stats.avgScore}%`;
  if (avgTimeEl) avgTimeEl.textContent = `${stats.avgTime}s`;
  if (passRateEl) passRateEl.textContent = `${stats.passRate}%`;
  
  // Update weak points list
  const weakList = $('weakPointsList');
  if (weakList) {
    if (weakPoints.length === 0) {
      weakList.innerHTML = '<div style="padding:8px;color:var(--text2);">Няма данни</div>';
    } else {
      weakList.innerHTML = weakPoints.map(({ qid, count }) => 
        `<div class="weak-item"><span>Q${qid}</span><span>${count}x</span></div>`
      ).join('');
    }
  }
  
  // Update review weak button
  const weakBtn = $('reviewWeakBtn');
  const allWeak = getAllWeakQuestionIds();
  
  if (weakBtn) {
    if (allWeak.length > 0) {
      weakBtn.disabled = false;
      weakBtn.textContent = `🎯 Преговори слаби точки (${allWeak.length})`;
    } else {
      weakBtn.disabled = true;
      weakBtn.textContent = '🎯 Преговори слаби точки';
    }
  }
  
  // Draw chart
  const canvas = $('historyChart');
  if (canvas) {
    drawHistoryChart(canvas);
  }
}

/**
 * Format exam result for display
 * @param {Object} stats - Computed stats
 * @param {number} total - Total questions
 * @returns {Object} Formatted result data
 */
export function formatExamResult(stats, total) {
  const pct = calcPercent(stats.correct, total);
  const passed = pct >= EXAM_CONFIG.PASS_THRESHOLD;
  const avgTime = total ? Math.round(stats.totalTime / total) : 0;
  
  return {
    passed,
    pct,
    correct: stats.correct,
    total,
    wrong: stats.wrong,
    correctButNotSure: stats.correctButNotSure,
    dontKnow: stats.dk,
    totalTime: stats.totalTime,
    avgTime
  };
}
