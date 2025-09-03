<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
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
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            ></path>
          </svg>
        </div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Join Video Call</h1>
        <p class="text-gray-600 dark:text-gray-300">
          Room code: <span class="font-mono font-bold text-lg">{{ roomCode }}</span>
        </p>
      </div>

      <div v-if="isJoining" class="text-center py-8">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"
        ></div>
        <p class="text-gray-600 dark:text-gray-300">Joining room...</p>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <div
          class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Room Not Found</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-4">{{ error }}</p>
        <button @click="$router.push('/')" class="btn-primary px-6 py-2">Back to Dashboard</button>
      </div>

      <div v-else class="space-y-6">
        <div class="text-center">
          <button @click="joinRoom" class="btn-primary w-full py-4 text-lg">Join Call</button>
        </div>

        <div class="text-center">
          <button
            @click="$router.push('/')"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoomsStore } from '../stores/rooms'
import { useGlobalStore } from '../stores/global'

const route = useRoute()
const router = useRouter()
const roomsStore = useRoomsStore()
const globalStore = useGlobalStore()

const roomCode = ref('')
const isJoining = ref(false)
const error = ref('')

onMounted(() => {
  roomCode.value = route.params.shortCode
  if (!roomCode.value) {
    router.push('/')
  }
})

const joinRoom = async () => {
  try {
    isJoining.value = true
    const result = await roomsStore.joinRoom(roomCode.value)

    if (result.success) {
      router.push(`/call/${result.room.room_id}`)
    } else {
      error.value = result.error
    }
  } catch (err) {
    error.value = 'Failed to join room'
  } finally {
    isJoining.value = false
  }
}
</script>
