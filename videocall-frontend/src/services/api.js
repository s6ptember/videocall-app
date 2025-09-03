// src/services/api.js - API service layer with CSRF support
import axios from 'axios'

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include session cookies
})

// Get CSRF token from cookie
const getCSRFToken = () => {
  const name = 'csrftoken'
  let cookieValue = null
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

// Request interceptor for adding auth headers and logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)

    // Add CSRF token for non-GET requests
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const csrfToken = getCSRFToken()
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken
      }
    }

    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  },
)

// Response interceptor for handling errors and logging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`)
    return response
  },
  async (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url,
    })

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login if needed
      console.log('Unauthorized access detected')
    } else if (error.response?.status === 403) {
      // Forbidden - might be CSRF issue, try to get new token
      console.log('Forbidden access - possible CSRF issue')

      // Try to refresh CSRF token and retry once
      if (!error.config._retry) {
        error.config._retry = true
        try {
          await getCsrfToken()
          return apiClient(error.config)
        } catch (retryError) {
          console.error('Failed to retry with new CSRF token:', retryError)
        }
      }
    } else if (error.response?.status === 429) {
      // Rate limited
      console.log('Rate limit exceeded')
    } else if (error.response?.status >= 500) {
      // Server error
      console.log('Server error occurred')
    }

    return Promise.reject(error)
  },
)

// Get CSRF token endpoint
const getCsrfToken = async () => {
  try {
    const response = await apiClient.get('/csrf/')
    const token = response.data.csrfToken
    if (token) {
      // Set token for future requests
      apiClient.defaults.headers.common['X-CSRFToken'] = token
    }
    return token
  } catch (error) {
    console.warn('Failed to get CSRF token:', error)
    return null
  }
}

// Initialize CSRF token
let csrfInitialized = false

const initializeCSRF = async () => {
  if (!csrfInitialized) {
    const token = await getCsrfToken()
    csrfInitialized = !!token
  }
}

// API service object with all endpoint methods
export const apiService = {
  // Initialize CSRF
  async initialize() {
    await initializeCSRF()
  },

  // Authentication endpoints
  async login(password) {
    await initializeCSRF()
    return apiClient.post('/auth/login/', { password })
  },

  async logout() {
    return apiClient.post('/auth/logout/')
  },

  async checkAuth() {
    return apiClient.get('/auth/check/')
  },

  // Room management endpoints
  async createRoom() {
    await initializeCSRF()
    return apiClient.post('/rooms/create/')
  },

  async getRoomInfo(roomId) {
    return apiClient.get(`/rooms/${roomId}/`)
  },

  async joinRoom(roomIdentifier) {
    await initializeCSRF()
    return apiClient.post('/rooms/join/', {
      room_identifier: roomIdentifier,
    })
  },

  async leaveRoom(roomId) {
    await initializeCSRF()
    return apiClient.post(`/rooms/${roomId}/leave/`)
  },

  async deleteRoom(roomId) {
    await initializeCSRF()
    return apiClient.delete(`/rooms/${roomId}/delete/`)
  },

  // System endpoints
  async healthCheck() {
    return apiClient.get('/health/')
  },
}

// Utility functions for API handling
export const apiUtils = {
  /**
   * Extract error message from API response
   */
  getErrorMessage(error) {
    if (error.response?.data?.error) {
      return error.response.data.error
    } else if (error.response?.data?.message) {
      return error.response.data.message
    } else if (error.message) {
      return error.message
    } else {
      return 'An unexpected error occurred'
    }
  },

  /**
   * Check if error is due to network issues
   */
  isNetworkError(error) {
    return !error.response || error.code === 'NETWORK_ERROR'
  },

  /**
   * Check if error is due to authentication
   */
  isAuthError(error) {
    return error.response?.status === 401
  },

  /**
   * Check if error is due to CSRF
   */
  isCSRFError(error) {
    return error.response?.status === 403
  },

  /**
   * Check if error is due to rate limiting
   */
  isRateLimitError(error) {
    return error.response?.status === 429
  },

  /**
   * Retry API call with exponential backoff
   */
  async retryWithBackoff(apiCall, maxRetries = 3, baseDelay = 1000) {
    let lastError

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await apiCall()
      } catch (error) {
        lastError = error

        // Retry CSRF errors once
        if (this.isCSRFError(error) && attempt === 0) {
          await initializeCSRF()
          continue
        }

        // Don't retry on client errors (4xx) except CSRF
        if (
          error.response?.status >= 400 &&
          error.response?.status < 500 &&
          !this.isCSRFError(error)
        ) {
          break
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  },
}

