// src/stores/rooms.js - Complete room management state
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '../services/api'
import { useGlobalStore } from './global'
import { utils } from '../services/utils'

export const useRoomsStore = defineStore('rooms', () => {
  const globalStore = useGlobalStore()

  // State
  const currentRoom = ref(null)
  const roomHistory = ref([])
  const isCreatingRoom = ref(false)
  const isJoiningRoom = ref(false)
  const isLeavingRoom = ref(false)
  const roomParticipants = ref([])

  // Computed
  const hasActiveRoom = computed(() => currentRoom.value !== null)
  const currentRoomId = computed(() => currentRoom.value?.room_id || null)
  const currentRoomCode = computed(() => currentRoom.value?.short_code || null)
  const participantCount = computed(() => roomParticipants.value.length)
  const canJoinRoom = computed(() => !isJoiningRoom.value && !hasActiveRoom.value)

  // Actions
  const createRoom = async () => {
    try {
      isCreatingRoom.value = true
      globalStore.setLoading(true, 'Creating room...')

      const response = await apiService.createRoom()
      const roomData = response.data

      currentRoom.value = {
        room_id: roomData.room_id,
        short_code: roomData.short_code,
        room_url: roomData.room_url,
        qr_code: roomData.qr_code,
        expires_at: roomData.expires_at,
        max_participants: roomData.max_participants,
        created_at: new Date().toISOString(),
      }

      addToHistory(currentRoom.value)
      globalStore.addNotification('Room created successfully', 'success', 3000)

      return { success: true, room: currentRoom.value }
    } catch (error) {
      console.error('Failed to create room:', error)
      const errorMessage = error.response?.data?.error || 'Failed to create room'
      globalStore.addNotification(errorMessage, 'error', 5000)
      return { success: false, error: errorMessage }
    } finally {
      isCreatingRoom.value = false
      globalStore.setLoading(false)
    }
  }

  const joinRoom = async (roomIdentifier) => {
    try {
      isJoiningRoom.value = true
      globalStore.setLoading(true, 'Joining room...')

      // Clean room identifier (remove URL parts if present)
      let cleanIdentifier = roomIdentifier.trim()

      // Extract room code from URL if it's a full URL
      if (cleanIdentifier.includes('/join/')) {
        const match = cleanIdentifier.match(/\/join\/([A-Z0-9]+)/)
        if (match) {
          cleanIdentifier = match[1]
        }
      } else if (cleanIdentifier.includes('/call/')) {
        const match = cleanIdentifier.match(/\/call\/([a-f0-9-]+)/)
        if (match) {
          cleanIdentifier = match[1]
        }
      }

      const response = await apiService.joinRoom(cleanIdentifier)
      const roomData = response.data

      currentRoom.value = {
        room_id: roomData.room_id,
        short_code: roomData.short_code,
        participant_count: roomData.participant_count,
        participant_id: roomData.participant_id,
        joined_at: new Date().toISOString(),
      }

      addToHistory(currentRoom.value)
      globalStore.addNotification('Joined room successfully', 'success', 3000)

      return { success: true, room: currentRoom.value }
    } catch (error) {
      console.error('Failed to join room:', error)
      const errorMessage = error.response?.data?.error || 'Failed to join room'
      globalStore.addNotification(errorMessage, 'error', 5000)
      return { success: false, error: errorMessage }
    } finally {
      isJoiningRoom.value = false
      globalStore.setLoading(false)
    }
  }

  const leaveRoom = async (roomId) => {
    try {
      isLeavingRoom.value = true

      if (currentRoom.value && currentRoom.value.room_id === roomId) {
        await apiService.leaveRoom(roomId)

        // Clear current room and participants
        currentRoom.value = null
        roomParticipants.value = []

        globalStore.addNotification('Left room', 'info', 3000)
        return { success: true }
      }

      return { success: false, error: 'Room not found' }
    } catch (error) {
      console.error('Failed to leave room:', error)
      const errorMessage = error.response?.data?.error || 'Failed to leave room'
      return { success: false, error: errorMessage }
    } finally {
      isLeavingRoom.value = false
    }
  }

  const getRoomInfo = async (roomId) => {
    try {
      const response = await apiService.getRoomInfo(roomId)
      return { success: true, room: response.data }
    } catch (error) {
      console.error('Failed to get room info:', error)
      const errorMessage = error.response?.data?.error || 'Room not found'
      return { success: false, error: errorMessage }
    }
  }

  const deleteRoom = async (roomId) => {
    try {
      await apiService.deleteRoom(roomId)

      if (currentRoom.value && currentRoom.value.room_id === roomId) {
        currentRoom.value = null
        roomParticipants.value = []
      }

      globalStore.addNotification('Room deleted', 'info', 3000)
      return { success: true }
    } catch (error) {
      console.error('Failed to delete room:', error)
      const errorMessage = error.response?.data?.error || 'Failed to delete room'
      globalStore.addNotification(errorMessage, 'error', 5000)
      return { success: false, error: errorMessage }
    }
  }

  const updateParticipants = (participants) => {
    roomParticipants.value = participants || []
  }

  const addParticipant = (participant) => {
    const existingIndex = roomParticipants.value.findIndex((p) => p.id === participant.id)
    if (existingIndex === -1) {
      roomParticipants.value.push(participant)
    } else {
      // Update existing participant
      roomParticipants.value[existingIndex] = {
        ...roomParticipants.value[existingIndex],
        ...participant,
      }
    }
  }

  const removeParticipant = (participantId) => {
    roomParticipants.value = roomParticipants.value.filter((p) => p.id !== participantId)
  }

  const addToHistory = (roomData) => {
    const historyEntry = {
      room_id: roomData.room_id,
      short_code: roomData.short_code,
      joined_at: roomData.joined_at || new Date().toISOString(),
      room_url: roomData.room_url || `${window.location.origin}/join/${roomData.short_code}`,
      duration: null,
      status: 'active',
    }

    // Remove existing entry if it exists
    roomHistory.value = roomHistory.value.filter((entry) => entry.room_id !== roomData.room_id)

    // Add to beginning of array
    roomHistory.value.unshift(historyEntry)

    // Keep only last 20 rooms
    roomHistory.value = roomHistory.value.slice(0, 20)

    // Save to localStorage
    saveHistoryToStorage()
  }

  const updateHistoryEntry = (roomId, updates) => {
    const entryIndex = roomHistory.value.findIndex((entry) => entry.room_id === roomId)
    if (entryIndex !== -1) {
      roomHistory.value[entryIndex] = { ...roomHistory.value[entryIndex], ...updates }
      saveHistoryToStorage()
    }
  }

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('videocall_room_history')
      if (saved) {
        const parsedHistory = JSON.parse(saved)

        // Validate and clean history data
        roomHistory.value = parsedHistory
          .filter((entry) => entry.room_id && entry.short_code) // Filter invalid entries
          .map((entry) => ({
            room_id: entry.room_id,
            short_code: entry.short_code,
            joined_at: entry.joined_at || new Date().toISOString(),
            room_url: entry.room_url || `${window.location.origin}/join/${entry.short_code}`,
            duration: entry.duration || null,
            status: entry.status || 'completed',
          }))
          .slice(0, 20) // Keep only latest 20
      }
    } catch (error) {
      console.warn('Failed to load room history from localStorage:', error)
      roomHistory.value = []
    }
  }

  const saveHistoryToStorage = () => {
    try {
      localStorage.setItem('videocall_room_history', JSON.stringify(roomHistory.value))
    } catch (error) {
      console.warn('Failed to save room history to localStorage:', error)
    }
  }

  const clearHistory = () => {
    roomHistory.value = []
    try {
      localStorage.removeItem('videocall_room_history')
    } catch (error) {
      console.warn('Failed to clear room history from localStorage:', error)
    }
  }

  const getRecentRooms = (limit = 5) => {
    return roomHistory.value.filter((room) => room.short_code && room.room_id).slice(0, limit)
  }

  const searchHistory = (query) => {
    if (!query || query.trim() === '') {
      return roomHistory.value
    }

    const searchTerm = query.toLowerCase().trim()
    return roomHistory.value.filter(
      (room) =>
        room.short_code.toLowerCase().includes(searchTerm) ||
        room.room_id.toLowerCase().includes(searchTerm),
    )
  }

  const getRoomByCode = async (shortCode) => {
    try {
      // First try to find in current room
      if (currentRoom.value && currentRoom.value.short_code === shortCode) {
        return { success: true, room: currentRoom.value }
      }

      // Then try to join/get room info
      const result = await joinRoom(shortCode)
      return result
    } catch (error) {
      console.error('Failed to get room by code:', error)
      return { success: false, error: 'Room not found' }
    }
  }

  const validateRoomCode = (code) => {
    // Room codes should be 6-8 alphanumeric characters
    const codeRegex = /^[A-Z0-9]{6,8}$/
    return codeRegex.test(code.toUpperCase())
  }

  const validateRoomUrl = (url) => {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname.includes('/join/') || urlObj.pathname.includes('/call/')
    } catch {
      return false
    }
  }

  const cleanup = () => {
    currentRoom.value = null
    roomParticipants.value = []
    isCreatingRoom.value = false
    isJoiningRoom.value = false
    isLeavingRoom.value = false
  }

  // Auto-save history when it changes
  const startHistoryAutoSave = () => {
    // Save history every 30 seconds if there are changes
    setInterval(() => {
      if (roomHistory.value.length > 0) {
        saveHistoryToStorage()
      }
    }, 30000)
  }

  return {
    // State
    currentRoom,
    roomHistory,
    isCreatingRoom,
    isJoiningRoom,
    isLeavingRoom,
    roomParticipants,

    // Computed
    hasActiveRoom,
    currentRoomId,
    currentRoomCode,
    participantCount,
    canJoinRoom,

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomInfo,
    deleteRoom,
    updateParticipants,
    addParticipant,
    removeParticipant,
    addToHistory,
    updateHistoryEntry,
    loadHistory,
    saveHistoryToStorage,
    clearHistory,
    getRecentRooms,
    searchHistory,
    getRoomByCode,
    validateRoomCode,
    validateRoomUrl,
    cleanup,
    startHistoryAutoSave,
  }
})
