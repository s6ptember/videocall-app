// src/router/index.js - Complete Vue Router configuration with auth guards and transitions
import { createRouter, createWebHistory } from 'vue-router'
import { useGlobalStore } from '../stores/global'
import { useRoomsStore } from '../stores/rooms'

// Lazy load components for better performance
const LoginForm = () => import('../components/LoginForm.vue')
const Dashboard = () => import('../components/Dashboard.vue')
const VideoCall = () => import('../components/VideoCall.vue')
const NotFound = () => import('../components/NotFound.vue')
const JoinRoom = () => import('../components/JoinRoom.vue')

// Route definitions with comprehensive metadata
const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true,
      title: 'Video Call Dashboard',
      description: 'Create or join video calls',
      showInNav: true,
      icon: 'home',
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginForm,
    meta: {
      requiresAuth: false,
      title: 'Sign In - Video Call',
      description: 'Access the video calling platform',
      hideForAuth: true, // Hide this route if user is already authenticated
      showInNav: false,
    },
  },
  {
    path: '/call/:roomId',
    name: 'VideoCall',
    component: VideoCall,
    meta: {
      requiresAuth: true,
      title: 'Video Call',
      description: 'Active video call session',
      showInNav: false,
      fullScreen: true,
      preventLeave: true, // Show confirmation before leaving
    },
    props: true,
    beforeEnter: async (to, from, next) => {
      // Validate room ID format (UUID v4)
      const roomIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      if (!roomIdPattern.test(to.params.roomId)) {
        console.warn('Invalid room ID format:', to.params.roomId)
        next({ name: 'NotFound' })
        return
      }

      next()
    },
  },
  {
    path: '/join/:shortCode',
    name: 'JoinRoom',
    component: JoinRoom,
    meta: {
      requiresAuth: true,
      title: 'Join Room',
      description: 'Join video call by room code',
      showInNav: false,
    },
    props: true,
    beforeEnter: (to, from, next) => {
      // Validate short code format (6-8 alphanumeric characters)
      const shortCodePattern = /^[A-Z0-9]{6,8}$/i

      if (!shortCodePattern.test(to.params.shortCode)) {
        console.warn('Invalid short code format:', to.params.shortCode)
        next({ name: 'NotFound' })
        return
      }

      next()
    },
  },
  {
    path: '/room/:identifier',
    redirect: (to) => {
      // Redirect old room URLs to appropriate new format
      const identifier = to.params.identifier

      // Check if it looks like a UUID (room ID)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (uuidPattern.test(identifier)) {
        return { name: 'VideoCall', params: { roomId: identifier } }
      }

      // Otherwise assume it's a short code
      return { name: 'JoinRoom', params: { shortCode: identifier } }
    },
  },
  // {
  //   path: '/privacy',
  //   name: 'Privacy',
  //   component: () => import('../components/Privacy.vue'),
  //   meta: {
  //     requiresAuth: false,
  //     title: 'Privacy Policy',
  //     description: 'Our privacy policy and data handling practices',
  //     showInNav: true,
  //     icon: 'shield',
  //   },
  // },
  // {
  //   path: '/terms',
  //   name: 'Terms',
  //   component: () => import('../components/Terms.vue'),
  //   meta: {
  //     requiresAuth: false,
  //     title: 'Terms of Service',
  //     description: 'Terms and conditions of use',
  //     showInNav: true,
  //     icon: 'document',
  //   },
  // },
  // {
  //   path: '/help',
  //   name: 'Help',
  //   component: () => import('../components/Help.vue'),
  //   meta: {
  //     requiresAuth: false,
  //     title: 'Help & Support',
  //     description: 'Get help with using the video calling platform',
  //     showInNav: true,
  //     icon: 'question',
  //   },
  // },
  // Catch-all route for 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      requiresAuth: false,
      title: '404 - Page Not Found',
      description: 'The requested page could not be found',
      showInNav: false,
    },
  },
]

// Create router instance with configuration
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Handle scroll behavior for different scenarios
    if (savedPosition) {
      // When using browser back/forward buttons
      return savedPosition
    } else if (to.hash) {
      // When navigating to an anchor
      return { el: to.hash, behavior: 'smooth' }
    } else if (to.name !== from.name) {
      // When navigating to a different page
      return { top: 0, behavior: 'smooth' }
    }
    // Otherwise maintain current scroll position
    return {}
  },
  // Configure link active classes
  linkActiveClass: 'router-link-active',
  linkExactActiveClass: 'router-link-exact-active',
})

// Global navigation guards
router.beforeEach(async (to, from, next) => {
  const globalStore = useGlobalStore()
  const roomsStore = useRoomsStore()

  console.log(`Navigating from ${from.name} to ${to.name}`)

  // Set document title and meta tags
  updateDocumentMeta(to)

  // Handle loading state
  if (to.name !== from.name) {
    globalStore.setLoading(true, 'Loading page...')
  }

  // Check authentication requirement
  const requiresAuth = to.meta.requiresAuth
  const hideForAuth = to.meta.hideForAuth
  const isAuthenticated = globalStore.isAuthenticated

  // If route should be hidden for authenticated users
  if (hideForAuth && isAuthenticated) {
    const redirectTo = to.query.redirect || from.fullPath || '/'
    next(redirectTo)
    return
  }

  // If route requires auth and user is not authenticated
  if (requiresAuth && !isAuthenticated) {
    // Try to check auth status from server first
    await globalStore.checkAuthentication()

    if (!globalStore.isAuthenticated) {
      // Store intended destination
      const redirectQuery = to.fullPath !== '/' ? { redirect: to.fullPath } : {}
      next({ name: 'Login', query: redirectQuery })
      return
    }
  }

  // Handle special route logic
  await handleSpecialRoutes(to, from, next, { globalStore, roomsStore })
})

router.beforeResolve(async (to, from, next) => {
  // This runs after all in-component guards and async route components are resolved
  console.log(`Resolving route: ${to.name}`)
  next()
})

router.afterEach((to, from, failure) => {
  const globalStore = useGlobalStore()

  // Clear loading state
  globalStore.setLoading(false)

  if (failure) {
    console.error('Navigation failed:', failure)
    globalStore.addNotification('Navigation failed', 'error', 3000)
  } else {
    console.log(`Successfully navigated to ${to.name}`)

    // Track page view (could integrate with analytics here)
    trackPageView(to)
  }

  // Handle route-specific post-navigation logic
  handlePostNavigation(to, from)
})

// Route-specific handlers
async function handleSpecialRoutes(to, from, next, { globalStore, roomsStore }) {
  switch (to.name) {
    case 'VideoCall':
      // Special handling for video call routes
      if (from.name !== 'JoinRoom' && from.name !== 'Dashboard') {
        // If coming from external source, show warning about media permissions
        globalStore.addNotification(
          'Please allow camera and microphone access when prompted',
          'info',
          5000,
        )
      }
      break

    case 'JoinRoom':
      // Check if we already have room info
      const shortCode = to.params.shortCode
      if (roomsStore.currentRoom?.short_code === shortCode) {
        // Redirect directly to video call if already in this room
        next({ name: 'VideoCall', params: { roomId: roomsStore.currentRoom.room_id } })
        return
      }
      break

    case 'Dashboard':
      // Load room history when entering dashboard
      roomsStore.loadHistory()
      break
  }

  next()
}

function updateDocumentMeta(to) {
  // Update document title
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // Update meta description
  if (to.meta.description) {
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', to.meta.description)
  }

  // Update Open Graph tags
  updateOpenGraphTags(to)
}

function updateOpenGraphTags(to) {
  const ogTags = [
    { property: 'og:title', content: to.meta.title },
    { property: 'og:description', content: to.meta.description },
    { property: 'og:url', content: window.location.href },
  ]

  ogTags.forEach(({ property, content }) => {
    if (!content) return

    let tag = document.querySelector(`meta[property="${property}"]`)
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('property', property)
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', content)
  })
}

function trackPageView(to) {
  // Basic page view tracking (could be enhanced with analytics)
  if (typeof gtag !== 'undefined') {
    gtag('config', 'GA_MEASUREMENT_ID', {
      page_title: to.meta.title,
      page_location: window.location.href,
      page_path: to.path,
    })
  }

  // Custom analytics could go here
  console.log('Page view:', {
    path: to.path,
    name: to.name,
    title: to.meta.title,
    timestamp: new Date().toISOString(),
  })
}

function handlePostNavigation(to, from) {
  // Handle route-specific post-navigation tasks

  // Add body classes for styling
  document.body.className = document.body.className
    .replace(/route-\S+/g, '') // Remove existing route classes
    .trim()

  if (to.name) {
    document.body.classList.add(`route-${to.name.toLowerCase()}`)
  }

  // Handle full-screen routes
  if (to.meta.fullScreen) {
    document.body.classList.add('fullscreen-route')
  } else {
    document.body.classList.remove('fullscreen-route')
  }

  // Handle prevent leave for important routes
  if (to.meta.preventLeave) {
    setupBeforeUnloadHandler()
  } else {
    removeBeforeUnloadHandler()
  }
}

// Prevent leaving important pages accidentally
let beforeUnloadHandler = null

function setupBeforeUnloadHandler() {
  beforeUnloadHandler = (event) => {
    const message = 'Are you sure you want to leave this video call?'
    event.preventDefault()
    event.returnValue = message
    return message
  }

  window.addEventListener('beforeunload', beforeUnloadHandler)
}

function removeBeforeUnloadHandler() {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    beforeUnloadHandler = null
  }
}

// Navigation helpers
export const navigationHelpers = {
  /**
   * Navigate to room by code or ID
   */
  async goToRoom(identifier, options = {}) {
    const { replace = false } = options

    // Determine if it's a room ID (UUID) or short code
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    const route = uuidPattern.test(identifier)
      ? { name: 'VideoCall', params: { roomId: identifier } }
      : { name: 'JoinRoom', params: { shortCode: identifier } }

    if (replace) {
      return router.replace(route)
    } else {
      return router.push(route)
    }
  },

  /**
   * Navigate back with fallback
   */
  goBack(fallbackRoute = { name: 'Dashboard' }) {
    if (window.history.length > 1) {
      router.go(-1)
    } else {
      router.push(fallbackRoute)
    }
  },

  /**
   * Get navigation items for menus
   */
  getNavigationItems(authenticated = false) {
    return routes
      .filter((route) => route.meta?.showInNav)
      .filter((route) => {
        if (route.meta?.requiresAuth && !authenticated) return false
        if (route.meta?.hideForAuth && authenticated) return false
        return true
      })
      .map((route) => ({
        name: route.name,
        path: route.path,
        title: route.meta?.title || route.name,
        icon: route.meta?.icon,
        description: route.meta?.description,
      }))
  },

  /**
   * Check if current route matches
   */
  isCurrentRoute(routeName) {
    return router.currentRoute.value.name === routeName
  },

  /**
   * Get current route info
   */
  getCurrentRoute() {
    const route = router.currentRoute.value
    return {
      name: route.name,
      path: route.path,
      params: route.params,
      query: route.query,
      meta: route.meta,
    }
  },
}

// Route transition configurations
export const routeTransitions = {
  // Default transition
  default: {
    name: 'fade',
    mode: 'out-in',
  },

  // Slide transition for mobile
  slide: {
    name: 'slide',
    mode: 'out-in',
  },

  // No transition for video calls
  none: {
    name: '',
    mode: 'out-in',
  },
}

// Route middleware system
const middlewares = {
  auth: async (to, from, next) => {
    const globalStore = useGlobalStore()

    if (!globalStore.isAuthenticated) {
      await globalStore.checkAuthentication()

      if (!globalStore.isAuthenticated) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }

    next()
  },

  guest: (to, from, next) => {
    const globalStore = useGlobalStore()

    if (globalStore.isAuthenticated) {
      next({ name: 'Dashboard' })
      return
    }

    next()
  },

  validateRoom: async (to, from, next) => {
    const roomsStore = useRoomsStore()
    const roomId = to.params.roomId

    if (roomId) {
      const result = await roomsStore.getRoomInfo(roomId)

      if (!result.success) {
        next({ name: 'NotFound' })
        return
      }
    }

    next()
  },
}

// Apply middleware to routes
function applyMiddleware(to, from, next, middlewareList = []) {
  if (middlewareList.length === 0) {
    next()
    return
  }

  const middleware = middlewares[middlewareList[0]]

  if (!middleware) {
    console.warn(`Middleware ${middlewareList[0]} not found`)
    applyMiddleware(to, from, next, middlewareList.slice(1))
    return
  }

  middleware(to, from, (nextArg) => {
    if (nextArg) {
      next(nextArg)
    } else {
      applyMiddleware(to, from, next, middlewareList.slice(1))
    }
  })
}

// Error handling for navigation
router.onError((error, to, from) => {
  console.error('Router error:', error)

  const globalStore = useGlobalStore()
  globalStore.setLoading(false)

  // Handle specific error types
  if (error.name === 'ChunkLoadError') {
    // Handle code splitting errors
    globalStore.addNotification('Failed to load page. Please refresh and try again.', 'error', 8000)

    // Retry navigation after a short delay
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  } else {
    globalStore.addNotification('Navigation error occurred', 'error', 5000)
  }
})

// Cleanup on app unmount
export function cleanupRouter() {
  removeBeforeUnloadHandler()
  document.body.className = document.body.className
    .replace(/route-\S+/g, '')
    .replace('fullscreen-route', '')
    .trim()
}

// Development helpers
if (import.meta.env.DEV) {
  // Add router debugging in development
  router.beforeEach((to, from, next) => {
    console.group('🧭 Router Navigation')
    console.log('From:', from.name, from.path)
    console.log('To:', to.name, to.path)
    console.log('Query:', to.query)
    console.log('Params:', to.params)
    console.log('Meta:', to.meta)
    console.groupEnd()
    next()
  })

  // Expose router to global scope for debugging
  window.__router__ = router
  window.__navigationHelpers__ = navigationHelpers
}

// Export router instance
export default router

// Export route configurations for testing
export { routes, middlewares }
