<!-- src/components/VideoPreview.vue - Complete local video preview component -->
<template>
  <div class="relative">
    <div class="video-container aspect-video max-w-2xl mx-auto">
      <!-- Video Element -->
      <video
        ref="videoRef"
        autoplay
        muted
        playsinline
        class="w-full h-full object-cover"
        :class="{ mirror: shouldMirror }"
      ></video>

      <!-- Overlay controls (show on hover) -->
      <div
        class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100"
      >
        <div class="flex space-x-4">
          <!-- Video Toggle -->
          <button
            @click="toggleVideo"
            :class="[
              'control-button transform hover:scale-110 transition-transform',
              webrtcStore.isVideoEnabled ? 'control-button-active' : 'control-button-inactive',
            ]"
            :title="webrtcStore.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'"
            :disabled="!webrtcStore.localStream"
          >
            <svg
              v-if="webrtcStore.isVideoEnabled"
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 21l-1.5-1.5m-6.364-6.364L8.5 14.5 7 13l1.636-1.636"
              ></path>
            </svg>
          </button>

          <!-- Audio Toggle -->
          <button
            @click="toggleAudio"
            :class="[
              'control-button transform hover:scale-110 transition-transform',
              webrtcStore.isAudioEnabled ? 'control-button-active' : 'control-button-inactive',
            ]"
            :title="webrtcStore.isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'"
            :disabled="!webrtcStore.localStream"
          >
            <svg
              v-if="webrtcStore.isAudioEnabled"
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              ></path>
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1m0 0V7a3 3 0 013-3h8a3 3 0 013 3v2M4 9h1m11 0h5m-9 0a1 1 0 011-1v-1a1 1 0 011-1m-1 1v1a1 1 0 001 1M9 7h8a3 3 0 013 3v2"
              ></path>
            </svg>
          </button>

          <!-- Settings Button -->
          <button
            @click="showSettings = !showSettings"
            class="control-button control-button-inactive transform hover:scale-110 transition-transform"
            title="Video settings"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- No video placeholder -->
      <div
        v-if="!webrtcStore.hasLocalVideo || !webrtcStore.isVideoEnabled"
        class="absolute inset-0 flex items-center justify-center bg-gray-800"
      >
        <div class="text-center">
          <div
            class="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow"
          >
            <svg
              class="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          </div>
          <p class="text-gray-400 text-lg font-medium">
            {{ !webrtcStore.hasLocalVideo ? 'No camera detected' : 'Camera is off' }}
          </p>
          <p class="text-gray-500 text-sm mt-2">
            {{
              !webrtcStore.hasLocalVideo
                ? 'Check your camera connection'
                : 'Click the camera button to turn on'
            }}
          </p>
        </div>
      </div>

      <!-- Loading overlay -->
      <div
        v-if="isInitializing"
        class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div class="text-center text-white">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"
          ></div>
          <p class="text-lg font-medium">{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- Video quality indicator -->
      <div
        v-if="webrtcStore.hasLocalVideo && showQualityIndicator"
        class="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-2 rounded-lg text-white text-sm"
      >
        <div
          :class="[
            'w-3 h-3 rounded-full',
            videoQuality === 'high'
              ? 'bg-green-400'
              : videoQuality === 'medium'
                ? 'bg-yellow-400'
                : 'bg-red-400',
          ]"
        ></div>
        <span>{{ videoQualityText }}</span>
      </div>
    </div>

    <!-- Media access error -->
    <div
      v-if="mediaError"
      class="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 animate-fade-in"
    >
      <div class="flex">
        <svg
          class="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          ></path>
        </svg>
        <div class="flex-1">
          <p class="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
            Camera access needed
          </p>
          <p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">{{ mediaError }}</p>
          <div class="mt-3 flex space-x-3">
            <button
              @click="initializeMedia"
              class="text-sm bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md font-medium transition-colors"
            >
              Try again
            </button>
            <button
              @click="showPermissionHelp = !showPermissionHelp"
              class="text-sm text-yellow-600 dark:text-yellow-400 underline hover:no-underline"
            >
              Need help?
            </button>
          </div>

          <!-- Permission help -->
          <div
            v-if="showPermissionHelp"
            class="mt-3 p-3 bg-yellow-100 dark:bg-yellow-800/30 rounded-md"
          >
            <p class="text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-2">
              To enable camera access:
            </p>
            <ul class="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
              <li>• Click the camera icon in your browser's address bar</li>
              <li>• Select "Allow" when prompted for camera permission</li>
              <li>• Refresh the page if needed</li>
              <li>• Make sure no other app is using your camera</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="mt-4 card p-4 animate-slide-up">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Video Settings</h3>

      <!-- Video Devices -->
      <div v-if="videoDevices.length > 0" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >Camera</label
        >
        <select v-model="selectedVideoDevice" @change="switchVideoDevice" class="input-field">
          <option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">
            {{ device.label || `Camera ${videoDevices.indexOf(device) + 1}` }}
          </option>
        </select>
      </div>

      <!-- Audio Devices -->
      <div v-if="audioDevices.length > 0" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >Microphone</label
        >
        <select v-model="selectedAudioDevice" @change="switchAudioDevice" class="input-field">
          <option v-for="device in audioDevices" :key="device.deviceId" :value="device.deviceId">
            {{ device.label || `Microphone ${audioDevices.indexOf(device) + 1}` }}
          </option>
        </select>
      </div>

      <!-- Video Quality Settings -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >Video Quality</label
        >
        <select v-model="selectedQuality" @change="changeVideoQuality" class="input-field">
          <option value="720p">HD (720p)</option>
          <option value="480p">SD (480p)</option>
          <option value="360p">Low (360p)</option>
        </select>
      </div>

      <!-- Mirror Video -->
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Mirror video</label>
        <button
          @click="shouldMirror = !shouldMirror"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
            shouldMirror ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600',
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              shouldMirror ? 'translate-x-6' : 'translate-x-1',
            ]"
          ></span>
        </button>
      </div>

      <!-- Close Settings -->
      <div class="mt-4 flex justify-end">
        <button @click="showSettings = false" class="btn-secondary px-4 py-2">Done</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useWebRTCStore } from '../stores/webrtc'
import { useMediaDevices } from '../composables/useMediaDevices'
import { mediaService } from '../services/media'

const webrtcStore = useWebRTCStore()
const {
  videoDevices,
  audioDevices,
  selectedVideoDevice,
  selectedAudioDevice,
  switchVideoDevice: switchVideo,
  switchAudioDevice: switchAudio,
} = useMediaDevices()

// Template refs
const videoRef = ref(null)

// Reactive state
const mediaError = ref('')
const isInitializing = ref(false)
const loadingMessage = ref('')
const showPermissionHelp = ref(false)
const showSettings = ref(false)
const showQualityIndicator = ref(false)
const shouldMirror = ref(true)
const selectedQuality = ref('720p')
const videoQuality = ref('high')

// Computed
const videoQualityText = computed(() => {
  switch (videoQuality.value) {
    case 'high':
      return 'HD'
    case 'medium':
      return 'SD'
    case 'low':
      return 'Low'
    default:
      return 'Unknown'
  }
})

// Quality presets
const qualityPresets = {
  '720p': { width: 1280, height: 720 },
  '480p': { width: 640, height: 480 },
  '360p': { width: 480, height: 360 },
}

// Methods
const initializeMedia = async () => {
  try {
    isInitializing.value = true
    mediaError.value = ''
    loadingMessage.value = 'Accessing camera and microphone...'

    const result = await webrtcStore.initializeLocalMedia()

    if (!result.success) {
      mediaError.value = result.error
      showQualityIndicator.value = false
    } else {
      showQualityIndicator.value = true
      detectVideoQuality()
    }
  } catch (error) {
    console.error('Failed to initialize media:', error)
    mediaError.value = 'Failed to access camera or microphone'
  } finally {
    isInitializing.value = false
  }
}

const toggleVideo = () => {
  webrtcStore.toggleVideo()
  if (webrtcStore.isVideoEnabled) {
    detectVideoQuality()
  }
}

const toggleAudio = () => {
  webrtcStore.toggleAudio()
}

const switchVideoDevice = async () => {
  try {
    if (selectedVideoDevice.value) {
      loadingMessage.value = 'Switching camera...'
      isInitializing.value = true

      // Stop current stream
      if (webrtcStore.localStream) {
        webrtcStore.localStream.getVideoTracks().forEach((track) => track.stop())
      }

      // Create new stream with selected device
      const constraints = {
        video: {
          deviceId: selectedVideoDevice.value,
          ...qualityPresets[selectedQuality.value],
        },
        audio: selectedAudioDevice.value
          ? {
              deviceId: selectedAudioDevice.value,
            }
          : true,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      webrtcStore.localStream = stream

      detectVideoQuality()
    }
  } catch (error) {
    console.error('Failed to switch video device:', error)
    mediaError.value = 'Failed to switch camera'
  } finally {
    isInitializing.value = false
  }
}

const switchAudioDevice = async () => {
  try {
    if (selectedAudioDevice.value) {
      loadingMessage.value = 'Switching microphone...'
      isInitializing.value = true

      // Similar logic for audio device switching
      if (webrtcStore.localStream) {
        webrtcStore.localStream.getAudioTracks().forEach((track) => track.stop())
      }

      const constraints = {
        video: selectedVideoDevice.value
          ? {
              deviceId: selectedVideoDevice.value,
              ...qualityPresets[selectedQuality.value],
            }
          : true,
        audio: {
          deviceId: selectedAudioDevice.value,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      webrtcStore.localStream = stream
    }
  } catch (error) {
    console.error('Failed to switch audio device:', error)
    mediaError.value = 'Failed to switch microphone'
  } finally {
    isInitializing.value = false
  }
}

const changeVideoQuality = async () => {
  try {
    if (webrtcStore.localStream && selectedQuality.value) {
      loadingMessage.value = 'Changing video quality...'
      isInitializing.value = true

      const videoTrack = webrtcStore.localStream.getVideoTracks()[0]
      if (videoTrack) {
        const constraints = qualityPresets[selectedQuality.value]
        await videoTrack.applyConstraints(constraints)
        detectVideoQuality()
      }
    }
  } catch (error) {
    console.error('Failed to change video quality:', error)
    mediaError.value = 'Failed to change video quality'
  } finally {
    isInitializing.value = false
  }
}

const detectVideoQuality = () => {
  if (!webrtcStore.localStream) return

  const videoTrack = webrtcStore.localStream.getVideoTracks()[0]
  if (videoTrack) {
    const settings = videoTrack.getSettings()
    const width = settings.width || 0

    if (width >= 1280) {
      videoQuality.value = 'high'
    } else if (width >= 640) {
      videoQuality.value = 'medium'
    } else {
      videoQuality.value = 'low'
    }
  }
}

const handlePermissionDenied = () => {
  mediaError.value =
    'Camera and microphone access denied. Please allow permissions in your browser settings and refresh the page.'
  showPermissionHelp.value = true
}

const checkMediaPermissions = async () => {
  try {
    const permissions = await mediaService.checkMediaPermissions()
    if (permissions.camera === 'denied' || permissions.microphone === 'denied') {
      handlePermissionDenied()
    }
  } catch (error) {
    console.warn('Could not check media permissions:', error)
  }
}

// Watch for local stream changes
watch(
  () => webrtcStore.localStream,
  (newStream) => {
    if (videoRef.value && newStream) {
      videoRef.value.srcObject = newStream
    }
  },
  { immediate: true },
)

// Watch for video enabled changes
watch(
  () => webrtcStore.isVideoEnabled,
  (enabled) => {
    if (enabled) {
      detectVideoQuality()
    }
  },
)

// Lifecycle
onMounted(async () => {
  await initializeMedia()
  await checkMediaPermissions()

  // Show quality indicator after 2 seconds
  setTimeout(() => {
    if (webrtcStore.hasLocalVideo) {
      showQualityIndicator.value = true
    }
  }, 2000)
})

onUnmounted(() => {
  // Cleanup is handled by the WebRTC store
})
</script>

<style scoped>
.mirror {
  transform: scaleX(-1);
}

.video-container {
  position: relative;
  overflow: hidden;
}

.control-button {
  transition: all 0.2s ease-in-out;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* Custom animations */
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

/* Custom scrollbar for settings */
.settings-scroll::-webkit-scrollbar {
  width: 4px;
}

.settings-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.settings-scroll::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 2px;
}

.settings-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}
</style>
