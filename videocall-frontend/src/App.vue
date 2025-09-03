// src/App.vue - Main application component
<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <router-view />

    <!-- Global loading indicator -->
    <Teleport to="body">
      <div
        v-if="globalStore.isLoading"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-300 text-sm">{{ globalStore.loadingMessage }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Global notifications -->
    <Teleport to="body">
      <div class="fixed top-4 right-4 z-40 space-y-2">
        <div
          v-for="notification in globalStore.notifications"
          :key="notification.id"
          :class="[
            'notification',
            notification.type === 'error' ? 'bg-red-500' :
            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          ]"
          class="text-white p-4 rounded-lg shadow-lg max-w-sm animate-slide-in"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">{{ notification.message }}</p>
            <button
              @click="globalStore.removeNotification(notification.id)"
              class="ml-2 text-white hover:text-gray-200 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useGlobalStore } from './stores/global'

const globalStore = useGlobalStore()

onMounted(() => {
  // Check authentication on app load
  globalStore.checkAuthentication()

  // Set up dark mode detection
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  globalStore.setDarkMode(mediaQuery.matches)

  mediaQuery.addEventListener('change', (e) => {
    globalStore.setDarkMode(e.matches)
  })

  // Set up network status monitoring
  window.addEventListener('online', () => {
    globalStore.setNetworkStatus(true)
  })

  window.addEventListener('offline', () => {
    globalStore.setNetworkStatus(false)
  })
})
</script>

<style scoped>
.notification {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
