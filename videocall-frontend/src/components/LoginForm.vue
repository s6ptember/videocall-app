<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4"
  >
    <div class="card w-full max-w-md p-8 animate-fade-in">
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            ></path>
          </svg>
        </div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Video Call</h1>
        <p class="text-gray-600 dark:text-gray-300">Enter the access password to continue</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label
            for="password"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter password"
            class="input-field"
            :disabled="isLoading"
            required
          />
        </div>

        <div>
          <button
            type="submit"
            :disabled="!password.trim() || isLoading"
            class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading" class="flex items-center justify-center">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Signing in...
            </span>
            <span v-else>Sign In</span>
          </button>
        </div>
      </form>

      <div class="mt-6 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Secure video calling without registration
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '../stores/global'

const router = useRouter()
const globalStore = useGlobalStore()

const password = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  if (!password.value.trim()) return

  try {
    isLoading.value = true
    const result = await globalStore.login(password.value)

    if (result.success) {
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/'
      router.push(redirectTo)
    }
  } catch (error) {
    console.error('Login failed:', error)
  } finally {
    isLoading.value = false
  }
}
</script>
