// src/utils/dateUtils.js

/**
 * Converts a date string to a JavaScript Date object safely
 * @param {string} dateStr - date string in 'YYYY-MM-DD' or ISO format
 * @returns {Date|null} - Date object or null if invalid
 */
function convertToDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = { convertToDate };
