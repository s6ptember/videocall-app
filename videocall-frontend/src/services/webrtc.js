// src/services/webrtc.js - WebRTC utility functions
export const webrtcService = {
  /**
   * Get STUN/TURN server configuration
   */
  getIceServerConfig() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Add TURN servers for production
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'password'
        // }
      ],
      iceCandidatePoolSize: 10,
    }
  },

  /**
   * Test WebRTC support
   */
  isWebRTCSupported() {
    return !!(
      window.RTCPeerConnection ||
      window.webkitRTCPeerConnection ||
      window.mozRTCPeerConnection
    )
  },

  /**
   * Get WebRTC statistics
   */
  async getConnectionStats(peerConnection) {
    if (!peerConnection) return null

    try {
      const stats = await peerConnection.getStats()
      const result = {
        video: {},
        audio: {},
        connection: {},
      }

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          result.video.inbound = {
            bytesReceived: report.bytesReceived,
            packetsReceived: report.packetsReceived,
            packetsLost: report.packetsLost,
            frameWidth: report.frameWidth,
            frameHeight: report.frameHeight,
            framesPerSecond: report.framesPerSecond,
          }
        } else if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
          result.video.outbound = {
            bytesSent: report.bytesSent,
            packetsSent: report.packetsSent,
            frameWidth: report.frameWidth,
            frameHeight: report.frameHeight,
            framesPerSecond: report.framesPerSecond,
          }
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          result.connection = {
            currentRoundTripTime: report.currentRoundTripTime,
            availableOutgoingBitrate: report.availableOutgoingBitrate,
            bytesReceived: report.bytesReceived,
            bytesSent: report.bytesSent,
          }
        }
      })

      return result
    } catch (error) {
      console.error('Failed to get connection stats:', error)
      return null
    }
  },

  /**
   * Monitor connection quality
   */
  createQualityMonitor(peerConnection, callback, interval = 5000) {
    if (!peerConnection || typeof callback !== 'function') {
      return null
    }

    const monitor = setInterval(async () => {
      try {
        const stats = await this.getConnectionStats(peerConnection)
        if (stats) {
          const quality = this.calculateQuality(stats)
          callback(quality, stats)
        }
      } catch (error) {
        console.error('Quality monitoring error:', error)
      }
    }, interval)

    return monitor
  },

  /**
   * Calculate connection quality score (0-100)
   */
  calculateQuality(stats) {
    let score = 100

    // Reduce score based on packet loss
    if (stats.video.inbound?.packetsLost && stats.video.inbound?.packetsReceived) {
      const lossRate = stats.video.inbound.packetsLost / stats.video.inbound.packetsReceived
      score -= lossRate * 50 // Up to 50 points for packet loss
    }

    // Reduce score based on round trip time
    if (stats.connection?.currentRoundTripTime) {
      const rtt = stats.connection.currentRoundTripTime * 1000 // Convert to ms
      if (rtt > 150) {
        score -= Math.min(30, (rtt - 150) / 10) // Up to 30 points for high latency
      }
    }

    // Reduce score based on low frame rate
    if (stats.video.inbound?.framesPerSecond) {
      const fps = stats.video.inbound.framesPerSecond
      if (fps < 15) {
        score -= (15 - fps) * 2 // Up to 30 points for low FPS
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  },
}
