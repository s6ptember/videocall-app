// src/services/utils.js - Utility functions
export const utils = {
  /**
   * Generate random string
   */
  generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return { success: true }
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const success = document.execCommand('copy')
        textArea.remove()

        return { success }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  },

  /**
   * Format time duration
   */
  formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
  },

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days === 1 ? '' : 's'} ago`
    }
  },

  /**
   * Validate URL
   */
  isValidUrl(string) {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  },

  /**
   * Generate QR code data URL
   */
  async generateQRCode(text, options = {}) {
    const QRCode = await import('qrcode')

    const defaultOptions = {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    }

    try {
      const dataURL = await QRCode.toDataURL(text, { ...defaultOptions, ...options })
      return { success: true, dataURL }
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Detect mobile device
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  },

  /**
   * Detect iOS device
   */
  isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  },

  /**
   * Get browser info
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent
    let browserName = 'Unknown'
    let browserVersion = 'Unknown'

    if (userAgent.indexOf('Chrome') > -1) {
      browserName = 'Chrome'
      browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown'
    } else if (userAgent.indexOf('Safari') > -1) {
      browserName = 'Safari'
      browserVersion = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown'
    } else if (userAgent.indexOf('Firefox') > -1) {
      browserName = 'Firefox'
      browserVersion = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown'
    } else if (userAgent.indexOf('Edge') > -1) {
      browserName = 'Edge'
      browserVersion = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown'
    }

    return {
      name: browserName,
      version: browserVersion,
      userAgent: userAgent,
      isMobile: this.isMobileDevice(),
      isIOS: this.isIOSDevice(),
    }
  },
}
