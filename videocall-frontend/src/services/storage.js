// src/services/storage.js - Local storage utilities
export const storageService = {
  /**
   * Safely get item from localStorage
   */
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Failed to get item from localStorage: ${key}`, error)
      return defaultValue
    }
  },

  /**
   * Safely set item in localStorage
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`Failed to set item in localStorage: ${key}`, error)
      return false
    }
  },

  /**
   * Safely remove item from localStorage
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`Failed to remove item from localStorage: ${key}`, error)
      return false
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear() {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.warn('Failed to clear localStorage', error)
      return false
    }
  },

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    try {
      const used = new Blob(Object.values(localStorage)).size
      return {
        used: used,
        usedFormatted: this.formatBytes(used),
        available: 5 * 1024 * 1024 - used, // Assuming 5MB limit
        availableFormatted: this.formatBytes(5 * 1024 * 1024 - used),
      }
    } catch (error) {
      console.warn('Failed to get storage info', error)
      return null
    }
  },

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },
}
