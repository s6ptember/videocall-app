// src/components/Dashboard.vue - Main dashboard component
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"
    >
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
          </div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Video Call</h1>
        </div>

        <button
          @click="handleLogout"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            ></path>
          </svg>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Video Preview -->
      <div class="mb-8">
        <VideoPreview />
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ActionCard
          title="Create Link"
          description="Start a new video call and share the link"
          icon="plus"
          :loading="roomsStore.isCreatingRoom"
          @click="handleCreateRoom"
        />

        <ActionCard
          title="Join Call"
          description="Enter a room code or link to join"
          icon="login"
          @click="showJoinModal = true"
        />
      </div>

      <!-- Room History -->
      <div v-if="roomsStore.roomHistory.length > 0" class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Rooms</h2>
        <div class="space-y-2">
          <div
            v-for="room in roomsStore.roomHistory.slice(0, 5)"
            :key="room.room_id"
            class="card p-4 flex items-center justify-between"
          >
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-white">{{ room.short_code }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ utils.formatRelativeTime(new Date(room.joined_at)) }}
              </p>
            </div>
            <button
              @click="handleJoinRoom(room.short_code)"
              :disabled="roomsStore.isJoiningRoom"
              class="btn-secondary px-4 py-2 text-sm"
            >
              Rejoin
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Join Room Modal -->
    <Teleport to="body">
      <div
        v-if="showJoinModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click="showJoinModal = false"
      >
        <div class="card w-full max-w-md p-6 animate-slide-up" @click.stop>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Join Video Call</h3>

          <form @submit.prevent="handleJoinSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Code or Link
              </label>
              <input
                v-model="joinInput"
                type="text"
                placeholder="Enter room code or paste link"
                class="input-field"
                :disabled="roomsStore.isJoiningRoom"
              />
            </div>

            <div class="flex space-x-3">
              <button
                type="button"
                @click="showJoinModal = false"
                class="btn-secondary flex-1"
                :disabled="roomsStore.isJoiningRoom"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!joinInput.trim() || roomsStore.isJoiningRoom"
                class="btn-primary flex-1 disabled:opacity-50"
              >
                <span v-if="roomsStore.isJoiningRoom">Joining...</span>
                <span v-else>Join</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Room Created Modal -->
    <RoomCreatedModal
      v-if="showRoomCreatedModal && createdRoom"
      :room="createdRoom"
      @close="showRoomCreatedModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '../stores/global'
import { useRoomsStore } from '../stores/rooms'
import { utils } from '../services/utils'
import VideoPreview from './VideoPreview.vue'
import ActionCard from './ActionCard.vue'
import RoomCreatedModal from './RoomCreatedModal.vue'

const router = useRouter()
const globalStore = useGlobalStore()
const roomsStore = useRoomsStore()

// Reactive state
const showJoinModal = ref(false)
const showRoomCreatedModal = ref(false)
const joinInput = ref('')
const createdRoom = ref(null)

// Methods
const handleLogout = async () => {
  await globalStore.logout()
  router.push('/login')
}

const handleCreateRoom = async () => {
  const result = await roomsStore.createRoom()

  if (result.success) {
    createdRoom.value = result.room
    showRoomCreatedModal.value = true
  }
}

const handleJoinRoom = async (roomIdentifier) => {
  const result = await roomsStore.joinRoom(roomIdentifier)

  if (result.success) {
    router.push(`/call/${result.room.room_id}`)
  }
}

const handleJoinSubmit = async () => {
  if (!joinInput.value.trim()) return

  // Extract room code from URL if needed
  let roomIdentifier = joinInput.value.trim()

  // If it's a full URL, extract the room code
  if (roomIdentifier.includes('/join/')) {
    const match = roomIdentifier.match(/\/join\/([A-Z0-9]+)/)
    if (match) {
      roomIdentifier = match[1]
    }
  }

  showJoinModal.value = false
  await handleJoinRoom(roomIdentifier)
  joinInput.value = ''
}

onMounted(() => {
  roomsStore.loadHistory()
})
</script>
