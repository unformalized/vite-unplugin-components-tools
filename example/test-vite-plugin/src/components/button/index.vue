<script lang="ts" setup>
import { ref } from 'vue';
const props = withDefaults(
  defineProps<{
    text?: string;
  }>(),
  {
    text: 'This a button component!',
  },
);
const count = ref(0);
const handleClick = () => {
  count.value++;
};
</script>

<template>
  <a-button px-5 @click="handleClick">
    {{ props.text }}
  </a-button>
</template>
