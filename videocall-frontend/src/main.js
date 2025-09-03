// src/main.js - Vue.js application entry point with PWA support
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { apiService } from './services/api'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize API service with CSRF token
apiService
  .initialize()
  .then(() => {
    console.log('API service initialized')
  })
  .catch((error) => {
    console.warn('Failed to initialize API service:', error)
  })

app.mount('#app')

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  // Use dynamic import to handle virtual modules
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          // Show update available notification
          console.log('App update available')

          // You can show a custom notification here
          const shouldUpdate = confirm('New version available! Click OK to update.')
          if (shouldUpdate) {
            updateSW(true)
          }
        },
        onOfflineReady() {
          console.log('App ready for offline use')

          // Optional: Show offline ready notification
          // You can integrate this with your notification system
        },
        onRegisterError(error) {
          console.error('Service Worker registration failed:', error)
        },
      })

      // Optional: Periodic update checks (every 60 seconds)
      setInterval(() => {
        updateSW()
      }, 60000)
    })
    .catch((error) => {
      console.error('Failed to register service worker:', error)
    })
}

// Network status monitoring for PWA
window.addEventListener('online', () => {
  console.log('App is online')
})

window.addEventListener('offline', () => {
  console.log('App is offline')
})

// Install prompt handling
let deferredPrompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault()
  // Stash the event so it can be triggered later
  deferredPrompt = e
  console.log('PWA install prompt available')
})

// Handle app installation
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed')
  deferredPrompt = null
})

// Export install prompt function for components to use
window.showInstallPrompt = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)
    deferredPrompt = null
    return outcome === 'accepted'
  }
  return false
}
