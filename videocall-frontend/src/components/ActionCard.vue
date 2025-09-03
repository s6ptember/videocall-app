// src/components/ActionCard.vue - Reusable action card component
<template>
  <div class="card p-6 hover:shadow-lg transition-shadow cursor-pointer" @click="handleClick">
    <div class="flex items-center justify-between mb-4">
      <div
        :class="[
          'w-12 h-12 rounded-full flex items-center justify-center',
          loading ? 'bg-gray-200 dark:bg-gray-700' : 'bg-green-100 dark:bg-green-900',
        ]"
      >
        <div
          v-if="loading"
          class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"
        ></div>
        <svg
          v-else-if="icon === 'plus'"
          class="w-6 h-6 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          ></path>
        </svg>
        <svg
          v-else-if="icon === 'login'"
          class="w-6 h-6 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
          ></path>
        </svg>
      </div>
    </div>

    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ title }}</h3>
    <p class="text-gray-600 dark:text-gray-300 text-sm">{{ description }}</p>

    <div class="mt-4 flex justify-end">
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5l7 7-7 7"
        ></path>
      </svg>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>
