/**
 * Utility Functions
 * Помощни функции за общо ползване
 */

/**
 * Get element by ID (shorthand)
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
export const $ = (id) => document.getElementById(id);

/**
 * Shuffle array using Fisher-Yates algorithm
 * @template T
 * @param {T[]} array - Array to shuffle
 * @returns {T[]} - New shuffled array
 */
export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Deep clone an object using JSON serialization
 * @template T
 * @param {T} obj - Object to clone
 * @returns {T} - Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Format time in mm:ss format
 * @param {number} seconds - Total seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format time in Xm Xs format
 * @param {number} seconds - Total seconds
 * @returns {string} - Formatted time string
 */
export function formatTimeVerbose(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Create debounced function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} - Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId = null;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Generate unique ID
 * @param {string} prefix - ID prefix
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe JSON parse with fallback
 * @param {string} str - JSON string
 * @param {*} fallback - Fallback value
 * @returns {*}
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} - Rounded percentage
 */
export function calcPercent(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Show/hide element
 * @param {HTMLElement|string} el - Element or ID
 * @param {boolean} show - Show or hide
 */
export function toggleVisibility(el, show) {
  const element = typeof el === 'string' ? $(el) : el;
  if (element) {
    element.classList.toggle('hidden', !show);
  }
}

/**
 * Add class to element
 * @param {HTMLElement|string} el - Element or ID
 * @param {string} className - Class name
 */
export function addClass(el, className) {
  const element = typeof el === 'string' ? $(el) : el;
  element?.classList.add(className);
}

/**
 * Remove class from element
 * @param {HTMLElement|string} el - Element or ID
 * @param {string} className - Class name
 */
export function removeClass(el, className) {
  const element = typeof el === 'string' ? $(el) : el;
  element?.classList.remove(className);
}

/**
 * Toggle class on element
 * @param {HTMLElement|string} el - Element or ID
 * @param {string} className - Class name
 * @param {boolean} [force] - Force add or remove
 */
export function toggleClass(el, className, force) {
  const element = typeof el === 'string' ? $(el) : el;
  element?.classList.toggle(className, force);
}

/**
 * Set text content of element
 * @param {HTMLElement|string} el - Element or ID
 * @param {string} text - Text content
 */
export function setText(el, text) {
  const element = typeof el === 'string' ? $(el) : el;
  if (element) {
    element.textContent = text;
  }
}

/**
 * Set inner HTML of element
 * @param {HTMLElement|string} el - Element or ID
 * @param {string} html - HTML content
 */
export function setHtml(el, html) {
  const element = typeof el === 'string' ? $(el) : el;
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Set element style property
 * @param {HTMLElement|string} el - Element or ID
 * @param {string} prop - CSS property
 * @param {string} value - Value
 */
export function setStyle(el, prop, value) {
  const element = typeof el === 'string' ? $(el) : el;
  if (element) {
    element.style[prop] = value;
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - Tag name
 * @param {Object} attrs - Attributes
 * @param {string|HTMLElement|HTMLElement[]} content - Content
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, content = '') {
  const el = document.createElement(tag);
  
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([k, v]) => {
        el.dataset[k] = v;
      });
    } else {
      el.setAttribute(key, value);
    }
  });
  
  if (typeof content === 'string') {
    el.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    el.appendChild(content);
  } else if (Array.isArray(content)) {
    content.forEach(child => el.appendChild(child));
  }
  
  return el;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Confirm dialog wrapper
 * @param {string} message - Confirmation message
 * @returns {boolean}
 */
export function confirmAction(message) {
  return window.confirm(message);
}

/**
 * Alert wrapper
 * @param {string} message - Alert message
 */
export function showAlert(message) {
  window.alert(message);
}
