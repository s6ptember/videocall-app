// src/stores/global.js - Global application state management
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '../services/api'

export const useGlobalStore = defineStore('global', () => {
  // State
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const loadingMessage = ref('')
  const notifications = ref([])
  const isDarkMode = ref(false)
  const isOnline = ref(navigator.onLine)

  // Computed
  const canUseApp = computed(() => isAuthenticated.value && isOnline.value)

  // Actions
  const setAuthenticated = (value) => {
    isAuthenticated.value = value
  }

  const setLoading = (loading, message = '') => {
    isLoading.value = loading
    loadingMessage.value = message
  }

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random()
    const notification = { id, message, type }

    notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  const setDarkMode = (dark) => {
    isDarkMode.value = dark
    document.documentElement.classList.toggle('dark', dark)
  }

  const setNetworkStatus = (online) => {
    isOnline.value = online
    if (online) {
      addNotification('Connection restored', 'success', 3000)
    } else {
      addNotification('Connection lost. Some features may not work.', 'error', 0)
    }
  }

  const checkAuthentication = async () => {
    try {
      setLoading(true, 'Checking authentication...')
      const response = await apiService.checkAuth()
      setAuthenticated(response.data.authenticated)
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (password) => {
    try {
      setLoading(true, 'Authenticating...')
      const response = await apiService.login(password)

      if (response.data.success) {
        setAuthenticated(true)
        addNotification('Login successful', 'success', 3000)
        return { success: true }
      } else {
        return { success: false, error: 'Login failed' }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Authentication failed'
      addNotification(errorMessage, 'error', 5000)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiService.logout()
      setAuthenticated(false)
      addNotification('Logged out successfully', 'info', 3000)
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout even if API call fails
      setAuthenticated(false)
      addNotification('Logged out', 'info', 3000)
    }
  }

  return {
    // State
    isAuthenticated,
    isLoading,
    loadingMessage,
    notifications,
    isDarkMode,
    isOnline,

    // Computed
    canUseApp,

    // Actions
    setAuthenticated,
    setLoading,
    addNotification,
    removeNotification,
    clearNotifications,
    setDarkMode,
    setNetworkStatus,
    checkAuthentication,
    login,
    logout,
  }
})
