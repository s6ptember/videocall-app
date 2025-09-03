// src/stores/webrtc.js - WebRTC and media state management
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGlobalStore } from './global'

export const useWebRTCStore = defineStore('webrtc', () => {
  const globalStore = useGlobalStore()

  // State
  const localStream = ref(null)
  const remoteStream = ref(null)
  const peerConnection = ref(null)
  const websocket = ref(null)
  const isConnected = ref(false)
  const isVideoEnabled = ref(true)
  const isAudioEnabled = ref(true)
  const connectionState = ref('new') // new, connecting, connected, disconnected, failed
  const remoteParticipants = ref([])
  const localParticipantId = ref(null)

  // Media constraints
  const mediaConstraints = ref({
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  // Computed
  const hasLocalVideo = computed(() => localStream.value !== null)
  const hasRemoteVideo = computed(() => remoteStream.value !== null)
  const isCallActive = computed(
    () => isConnected.value && (hasLocalVideo.value || hasRemoteVideo.value),
  )

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers here for production
    ],
    iceCandidatePoolSize: 10,
  }

  // Actions
  const initializeLocalMedia = async () => {
    try {
      globalStore.setLoading(true, 'Accessing camera and microphone...')

      localStream.value = await navigator.mediaDevices.getUserMedia(mediaConstraints.value)

      // Set initial media states based on stream tracks
      const videoTrack = localStream.value.getVideoTracks()[0]
      const audioTrack = localStream.value.getAudioTracks()[0]

      if (videoTrack) {
        isVideoEnabled.value = videoTrack.enabled
      }
      if (audioTrack) {
        isAudioEnabled.value = audioTrack.enabled
      }

      return { success: true }
    } catch (error) {
      let errorMessage = 'Failed to access camera or microphone'

      if (error.name === 'NotAllowedError') {
        errorMessage =
          'Camera and microphone access denied. Please allow permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found on this device.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is already in use by another application.'
      }

      globalStore.addNotification(errorMessage, 'error', 8000)
      return { success: false, error: errorMessage }
    } finally {
      globalStore.setLoading(false)
    }
  }

  const createPeerConnection = () => {
    try {
      peerConnection.value = new RTCPeerConnection(rtcConfiguration)

      // Add local stream tracks to peer connection
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => {
          peerConnection.value.addTrack(track, localStream.value)
        })
      }

      // Handle remote stream
      peerConnection.value.ontrack = (event) => {
        console.log('Received remote track:', event)
        remoteStream.value = event.streams[0]
      }

      // Handle ICE candidates
      peerConnection.value.onicecandidate = (event) => {
        if (event.candidate && websocket.value) {
          sendWebSocketMessage({
            type: 'ice_candidate',
            candidate: event.candidate,
          })
        }
      }

      // Handle connection state changes
      peerConnection.value.onconnectionstatechange = () => {
        connectionState.value = peerConnection.value.connectionState
        console.log('Connection state:', connectionState.value)

        if (connectionState.value === 'connected') {
          isConnected.value = true
          globalStore.addNotification('Video call connected', 'success', 3000)
        } else if (connectionState.value === 'disconnected' || connectionState.value === 'failed') {
          isConnected.value = false
          if (connectionState.value === 'failed') {
            globalStore.addNotification('Call connection failed', 'error', 5000)
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to create peer connection:', error)
      return { success: false, error: error.message }
    }
  }

  const connectWebSocket = (roomId) => {
    return new Promise((resolve, reject) => {
      try {
        // WebSocket должен подключаться к бэкенду (порт 8000), а не к фронтенду
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = import.meta.env.VITE_WS_HOST || window.location.host
        const wsUrl = `${protocol}//${wsHost}/ws/room/${roomId}/`

        console.log('Connecting to WebSocket:', wsUrl)
        websocket.value = new WebSocket(wsUrl)

        websocket.value.onopen = () => {
          console.log('WebSocket connected')
          resolve()
        }

        websocket.value.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            await handleWebSocketMessage(data)
          } catch (error) {
            console.error('Failed to handle WebSocket message:', error)
          }
        }

        websocket.value.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          isConnected.value = false

          if (event.code !== 1000) {
            // Not a normal closure
            globalStore.addNotification('Connection lost', 'error', 5000)
          }
        }

        websocket.value.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        // Set timeout for connection
        setTimeout(() => {
          if (websocket.value && websocket.value.readyState !== WebSocket.OPEN) {
            websocket.value.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 10000) // 10 second timeout
      } catch (error) {
        reject(error)
      }
    })
  }

  const handleWebSocketMessage = async (data) => {
    console.log('Received WebSocket message:', data.type)

    switch (data.type) {
      case 'user_joined':
        handleUserJoined(data)
        break

      case 'user_left':
        handleUserLeft(data)
        break

      case 'webrtc_offer':
        await handleWebRTCOffer(data)
        break

      case 'webrtc_answer':
        await handleWebRTCAnswer(data)
        break

      case 'ice_candidate':
        await handleICECandidate(data)
        break

      case 'media_state_update':
        handleMediaStateUpdate(data)
        break

      case 'pong':
        // Handle ping response
        break

      case 'error':
        globalStore.addNotification(data.message, 'error', 5000)
        break
    }
  }

  const handleUserJoined = (data) => {
    const participantId = data.participant_id

    if (!remoteParticipants.value.find((p) => p.id === participantId)) {
      remoteParticipants.value.push({
        id: participantId,
        joined_at: data.timestamp,
        stream: null,
      })
    }

    globalStore.addNotification('Someone joined the call', 'info', 3000)

    // If we are already in the room, send an offer to the new participant
    if (peerConnection.value && localStream.value) {
      createOffer()
    }
  }

  const handleUserLeft = (data) => {
    const participantId = data.participant_id

    remoteParticipants.value = remoteParticipants.value.filter((p) => p.id !== participantId)

    globalStore.addNotification('Someone left the call', 'info', 3000)

    // Clear remote stream if this was the connected peer
    if (remoteStream.value) {
      remoteStream.value = null
    }
  }

  const handleWebRTCOffer = async (data) => {
    try {
      if (!peerConnection.value) {
        createPeerConnection()
      }

      await peerConnection.value.setRemoteDescription(new RTCSessionDescription(data.offer))
      const answer = await peerConnection.value.createAnswer()
      await peerConnection.value.setLocalDescription(answer)

      sendWebSocketMessage({
        type: 'answer',
        answer: answer,
        target: data.sender,
      })
    } catch (error) {
      console.error('Failed to handle WebRTC offer:', error)
    }
  }

  const handleWebRTCAnswer = async (data) => {
    try {
      await peerConnection.value.setRemoteDescription(new RTCSessionDescription(data.answer))
    } catch (error) {
      console.error('Failed to handle WebRTC answer:', error)
    }
  }

  const handleICECandidate = async (data) => {
    try {
      await peerConnection.value.addIceCandidate(new RTCIceCandidate(data.candidate))
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error)
    }
  }

  const handleMediaStateUpdate = (data) => {
    const participant = remoteParticipants.value.find((p) => p.id === data.participant_id)
    if (participant) {
      participant.mediaState = data.state
    }
  }

  const createOffer = async () => {
    try {
      if (!peerConnection.value) {
        createPeerConnection()
      }

      const offer = await peerConnection.value.createOffer()
      await peerConnection.value.setLocalDescription(offer)

      sendWebSocketMessage({
        type: 'offer',
        offer: offer,
      })
    } catch (error) {
      console.error('Failed to create offer:', error)
    }
  }

  const sendWebSocketMessage = (message) => {
    if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
      websocket.value.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  const toggleVideo = () => {
    if (localStream.value) {
      const videoTrack = localStream.value.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        isVideoEnabled.value = videoTrack.enabled

        // Notify other participants
        sendWebSocketMessage({
          type: 'media_state',
          state: {
            video: isVideoEnabled.value,
            audio: isAudioEnabled.value,
          },
        })

        globalStore.addNotification(
          isVideoEnabled.value ? 'Camera turned on' : 'Camera turned off',
          'info',
          2000,
        )
      }
    }
  }

  const toggleAudio = () => {
    if (localStream.value) {
      const audioTrack = localStream.value.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        isAudioEnabled.value = audioTrack.enabled

        // Notify other participants
        sendWebSocketMessage({
          type: 'media_state',
          state: {
            video: isVideoEnabled.value,
            audio: isAudioEnabled.value,
          },
        })

        globalStore.addNotification(
          isAudioEnabled.value ? 'Microphone turned on' : 'Microphone turned off',
          'info',
          2000,
        )
      }
    }
  }

  const endCall = async () => {
    try {
      // Close peer connection
      if (peerConnection.value) {
        peerConnection.value.close()
        peerConnection.value = null
      }

      // Close WebSocket
      if (websocket.value) {
        websocket.value.close(1000, 'Call ended') // Normal closure
        websocket.value = null
      }

      // Stop local media tracks
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => track.stop())
        localStream.value = null
      }

      // Clear remote stream
      remoteStream.value = null

      // Reset state
      isConnected.value = false
      connectionState.value = 'new'
      remoteParticipants.value = []

      console.log('Call ended successfully')
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }

  return {
    // State
    localStream,
    remoteStream,
    peerConnection,
    websocket,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    remoteParticipants,
    localParticipantId,
    mediaConstraints,

    // Computed
    hasLocalVideo,
    hasRemoteVideo,
    isCallActive,

    // Actions
    initializeLocalMedia,
    createPeerConnection,
    connectWebSocket,
    createOffer,
    sendWebSocketMessage,
    toggleVideo,
    toggleAudio,
    endCall,
  }
})

