<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <g v-html="topicIcons[icon]"></g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { topicIcons } from '../data/topicIcons'
import { topicIcon } from '../utils/discussion'
const props = defineProps({ name: { type: String, default: '' }, size: { type: [String, Number], default: 21 }, stroke: { type: [String, Number], default: 1.7 } })
const icon = computed(() => topicIcon(props.name))
</script>
