// src/services/media.js - Media handling utilities
export const mediaService = {
  /**
   * Get available media devices
   */
  async getMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()

      return {
        videoDevices: devices.filter((device) => device.kind === 'videoinput'),
        audioDevices: devices.filter((device) => device.kind === 'audioinput'),
        audioOutputDevices: devices.filter((device) => device.kind === 'audiooutput'),
      }
    } catch (error) {
      console.error('Failed to get media devices:', error)
      return {
        videoDevices: [],
        audioDevices: [],
        audioOutputDevices: [],
      }
    }
  },

  /**
   * Check if user has granted media permissions
   */
  async checkMediaPermissions() {
    try {
      const permissions = await Promise.all([
        navigator.permissions.query({ name: 'camera' }),
        navigator.permissions.query({ name: 'microphone' }),
      ])

      return {
        camera: permissions[0].state,
        microphone: permissions[1].state,
      }
    } catch (error) {
      console.error('Failed to check media permissions:', error)
      return {
        camera: 'unknown',
        microphone: 'unknown',
      }
    }
  },

  /**
   * Get optimal media constraints based on device capabilities
   */
  async getOptimalConstraints() {
    try {
      const devices = await this.getMediaDevices()

      // Default constraints
      let constraints = {
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
      }

      // Adjust constraints based on available devices
      if (devices.videoDevices.length === 0) {
        constraints.video = false
      }

      if (devices.audioDevices.length === 0) {
        constraints.audio = false
      }

      return constraints
    } catch (error) {
      console.error('Failed to get optimal constraints:', error)
      return {
        video: true,
        audio: true,
      }
    }
  },

  /**
   * Test media access without keeping the stream
   */
  async testMediaAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      // Immediately stop all tracks
      stream.getTracks().forEach((track) => track.stop())

      return {
        success: true,
        hasVideo: stream.getVideoTracks().length > 0,
        hasAudio: stream.getAudioTracks().length > 0,
      }
    } catch (error) {
      return {
        success: false,
        error: error.name,
        message: this.getMediaErrorMessage(error),
      }
    }
  },

  /**
   * Get user-friendly error message for media errors
   */
  getMediaErrorMessage(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera and microphone access denied. Please allow permissions and try again.'
      case 'NotFoundError':
        return 'No camera or microphone found on this device.'
      case 'NotReadableError':
        return 'Camera or microphone is already in use by another application.'
      case 'OverconstrainedError':
        return 'Camera or microphone does not support the requested settings.'
      case 'SecurityError':
        return 'Media access blocked due to security restrictions.'
      case 'AbortError':
        return 'Media access was aborted.'
      default:
        return 'Failed to access camera or microphone.'
    }
  },

  /**
   * Create media stream with fallback options
   */
  async createStreamWithFallback(preferredConstraints) {
    const fallbackOptions = [
      preferredConstraints,
      { video: true, audio: true }, // Basic constraints
      { video: { width: 640, height: 480 }, audio: true }, // Lower resolution
      { video: false, audio: true }, // Audio only
    ]

    for (const constraints of fallbackOptions) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        return { success: true, stream, constraints }
      } catch (error) {
        console.warn('Failed to create stream with constraints:', constraints, error)
        continue
      }
    }

    throw new Error('Failed to create media stream with any constraints')
  },
}
