<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
    <div class="text-center max-w-md mx-auto">
      <div
        class="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <svg
          class="w-12 h-12 text-red-500 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      </div>

      <h1 class="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Page Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <div class="space-y-4">
        <button @click="$router.push('/')" class="btn-primary px-8 py-3 w-full">
          Back to Dashboard
        </button>
        <button @click="$router.go(-1)" class="btn-secondary px-8 py-3 w-full">Go Back</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Component logic can be added here if needed
</script>
