// src/composables/useMediaDevices.js - Composable for media device management
import { ref, onMounted, onUnmounted } from 'vue'
import { mediaService } from '../services/media'

export function useMediaDevices() {
  const videoDevices = ref([])
  const audioDevices = ref([])
  const audioOutputDevices = ref([])
  const selectedVideoDevice = ref('')
  const selectedAudioDevice = ref('')
  const selectedAudioOutputDevice = ref('')

  let deviceChangeHandler = null

  const loadDevices = async () => {
    try {
      const devices = await mediaService.getMediaDevices()

      videoDevices.value = devices.videoDevices
      audioDevices.value = devices.audioDevices
      audioOutputDevices.value = devices.audioOutputDevices

      // Set default selected devices
      if (videoDevices.value.length > 0 && !selectedVideoDevice.value) {
        selectedVideoDevice.value = videoDevices.value[0].deviceId
      }

      if (audioDevices.value.length > 0 && !selectedAudioDevice.value) {
        selectedAudioDevice.value = audioDevices.value[0].deviceId
      }

      if (audioOutputDevices.value.length > 0 && !selectedAudioOutputDevice.value) {
        selectedAudioOutputDevice.value = audioOutputDevices.value[0].deviceId
      }
    } catch (error) {
      console.error('Failed to load media devices:', error)
    }
  }

  const switchVideoDevice = async () => {
    // This will be implemented in the component that uses this composable
    console.log('Switching to video device:', selectedVideoDevice.value)
  }

  const switchAudioDevice = async () => {
    // This will be implemented in the component that uses this composable
    console.log('Switching to audio device:', selectedAudioDevice.value)
  }

  const switchAudioOutputDevice = async () => {
    // This will be implemented in the component that uses this composable
    console.log('Switching to audio output device:', selectedAudioOutputDevice.value)
  }

  const refreshDevices = async () => {
    await loadDevices()
  }

  onMounted(() => {
    loadDevices()

    // Listen for device changes
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      deviceChangeHandler = () => {
        console.log('Media devices changed, reloading...')
        loadDevices()
      }
      navigator.mediaDevices.addEventListener('devicechange', deviceChangeHandler)
    }
  })

  onUnmounted(() => {
    if (
      deviceChangeHandler &&
      navigator.mediaDevices &&
      navigator.mediaDevices.removeEventListener
    ) {
      navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler)
    }
  })

  return {
    videoDevices,
    audioDevices,
    audioOutputDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    selectedAudioOutputDevice,
    switchVideoDevice,
    switchAudioDevice,
    switchAudioOutputDevice,
    refreshDevices,
    loadDevices,
  }
}
