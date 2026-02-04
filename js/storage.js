/**
 * Firebase Storage & Sync Module
 * Real-time синхронизация с Firebase
 */

import { FIREBASE_CONFIG, STORAGE_KEYS, SYNC_STATUS, DELAYS } from './config.js';
import { 
  getAllData, applyData, setSyncId, getSyncId,
  setOnline, setSaving, isSaving, 
  setLastCloudTimestamp, getLastCloudTimestamp 
} from './state.js';
import { $, debounce, generateId } from './utils.js';

// Firebase references
let db = null;
let dataRef = null;

// UI update callback
let onDataChangeCallback = null;

/**
 * Set sync status icon in UI
 * @param {string} icon - Status icon
 */
function setSyncStatus(icon) {
  const el = $('syncStatus');
  if (el) el.textContent = icon;
}

/**
 * Generate new sync ID
 * @returns {string}
 */
function generateSyncId() {
  return generateId('ivan');
}

/**
 * Get sync ID from localStorage or generate new one
 * @returns {string}
 */
function getOrCreateSyncId() {
  let syncId = localStorage.getItem(STORAGE_KEYS.SYNC_ID);
  if (!syncId) {
    syncId = generateSyncId();
    localStorage.setItem(STORAGE_KEYS.SYNC_ID, syncId);
  }
  return syncId;
}

/**
 * Save data to Firebase
 * @returns {Promise<void>}
 */
async function saveToCloud() {
  if (!dataRef || isSaving()) return;
  
  setSaving(true);
  setSyncStatus(SYNC_STATUS.SYNCING);
  
  try {
    const data = getAllData();
    await dataRef.set(data);
    setLastCloudTimestamp(data.timestamp);
    setSyncStatus(SYNC_STATUS.CONNECTED);
    console.log('☁️ Saved to cloud');
  } catch (error) {
    console.error('Save error:', error);
    setSyncStatus(SYNC_STATUS.ERROR);
  } finally {
    setSaving(false);
  }
}

/**
 * Debounced save function
 */
const debouncedSave = debounce(saveToCloud, DELAYS.SAVE_DEBOUNCE);

/**
 * Handle incoming data changes from Firebase
 * @param {Object} snapshot - Firebase snapshot
 */
function onCloudDataChange(snapshot) {
  if (isSaving()) return; // Ignore our own saves
  
  const data = snapshot.val();
  if (!data) return;
  
  // Only apply if cloud data is newer
  if (data.timestamp && data.timestamp > getLastCloudTimestamp()) {
    console.log('📥 Received update from cloud');
    applyData(data);
    
    // Notify UI to update
    if (typeof onDataChangeCallback === 'function') {
      onDataChangeCallback();
    }
  }
}

/**
 * Initialize Firebase connection
 * @param {Function} onDataChange - Callback when data changes
 * @returns {Promise<void>}
 */
export async function initFirebase(onDataChange) {
  onDataChangeCallback = onDataChange;
  setSyncStatus(SYNC_STATUS.LOADING);
  
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded');
      setSyncStatus(SYNC_STATUS.ERROR);
      return;
    }
    
    // Initialize Firebase app
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.database();
    
    // Get or create sync ID
    const syncId = getOrCreateSyncId();
    setSyncId(syncId);
    
    // Update UI with current sync ID
    const syncIdInput = $('currentSyncId');
    if (syncIdInput) syncIdInput.value = syncId;
    
    // Set up database reference
    dataRef = db.ref('users/' + syncId);
    
    // Monitor connection status
    db.ref('.info/connected').on('value', (snap) => {
      const online = snap.val() === true;
      setOnline(online);
      
      if (online) {
        console.log('🔥 Firebase connected!');
        setSyncStatus(SYNC_STATUS.CONNECTED);
      } else {
        console.log('📡 Firebase disconnected');
        setSyncStatus(SYNC_STATUS.OFFLINE);
      }
    });
    
    // Listen for real-time updates
    dataRef.on('value', onCloudDataChange);
    
    // Initial load
    const snapshot = await dataRef.once('value');
    if (snapshot.exists()) {
      applyData(snapshot.val());
      console.log('📥 Loaded data from cloud');
    } else {
      // First time - save current data
      await saveToCloud();
    }
    
  } catch (error) {
    console.error('Firebase init error:', error);
    setSyncStatus(SYNC_STATUS.ERROR);
  }
}

/**
 * Save all data (triggers debounced cloud save)
 */
export function saveAll() {
  debouncedSave();
}

/**
 * Connect to different sync ID
 * @param {string} newSyncId - New sync ID to connect to
 * @returns {Promise<boolean>} - Success status
 */
export async function connectToSyncId(newSyncId) {
  if (!newSyncId || !db) return false;
  
  try {
    // Remove old listener
    if (dataRef) dataRef.off();
    
    // Update sync ID
    setSyncId(newSyncId);
    localStorage.setItem(STORAGE_KEYS.SYNC_ID, newSyncId);
    
    // Update UI
    const syncIdInput = $('currentSyncId');
    if (syncIdInput) syncIdInput.value = newSyncId;
    
    // Set up new reference and listener
    dataRef = db.ref('users/' + newSyncId);
    dataRef.on('value', onCloudDataChange);
    
    // Load data from new sync ID
    const snapshot = await dataRef.once('value');
    if (snapshot.exists()) {
      applyData(snapshot.val());
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Connect error:', error);
    return false;
  }
}

/**
 * Create new sync profile
 * @returns {Promise<string>} - New sync ID
 */
export async function createNewProfile() {
  // Remove old listener
  if (dataRef) dataRef.off();
  
  // Generate new sync ID
  const newSyncId = generateSyncId();
  setSyncId(newSyncId);
  localStorage.setItem(STORAGE_KEYS.SYNC_ID, newSyncId);
  
  // Update UI
  const syncIdInput = $('currentSyncId');
  if (syncIdInput) syncIdInput.value = newSyncId;
  
  // Set up new reference
  dataRef = db.ref('users/' + newSyncId);
  dataRef.on('value', onCloudDataChange);
  
  // Save empty state
  await saveToCloud();
  
  return newSyncId;
}

/**
 * Get current sync ID
 * @returns {string|null}
 */
export function getCurrentSyncId() {
  return getSyncId();
}

/**
 * Check if dark mode is enabled
 * @returns {boolean}
 */
export function isDarkMode() {
  return localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
}

/**
 * Set dark mode preference
 * @param {boolean} enabled
 */
export function setDarkMode(enabled) {
  localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(enabled));
}
