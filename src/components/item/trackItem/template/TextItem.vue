<template>
  <div class="flex flex-col rounded overflow-hidden h-full">
    <div class="flex items-center text-xs pl-2 overflow-hidden h-6 leading-6 bg-red-900 bg-opacity-70 text-gray-300">
      <TextIcon class="inline-block mr-2 shrink-0" />
      <span class="mr-4 shrink-0">{{ props.trackItem.name }}</span>
    </div>
    <Loading v-show="loading" class="pl-12 bg-opacity-70" />
  </div>
</template>

<script setup lang="ts">
  import trackCheckPlaying from './trackCheckPlaying';
  import { usePlayerState } from '@/stores/playerState';
  import type FFManager from '@/utils/ffmpegManager';
  import type { TextTractItem } from '@/stores/trackState';
  import type { PropType } from 'vue';
  import { inject, watch, ref } from 'vue';
  const props = defineProps({
    trackItem: {
      type: Object as PropType<TextTractItem>,
      default() {
        return {
          width: '0px',
          left: '0px'
        };
      }
    }
  });
  const store = usePlayerState();
  store.ingLoadingCount++;
  const ffmpeg = inject('ffmpeg') as FFManager;
  const loading = ref(true);

  async function initText() {
    console.log(props.trackItem)
    const { name, source, format, frameCount } = props.trackItem;
    if (name && source && ffmpeg.isLoaded.value) {
      const textName = `${name}.${format}`;
      // 写文件 /fonts/fangsongGBK.ttf
      await ffmpeg.writeFile(ffmpeg.pathConfig.fontPath, textName, source, true);
      // await ffmpeg.loadFont('/fonts/fangsongGBK', '/font/fangsongGBK.ttf');
      // await ffmpeg.loadFont('/font/fangsongGBK');
      // ffmpeg.readDir('/fonts/');

      loading.value = false;
      store.ingLoadingCount--;
    }
  }

  watch(() => {
    return props.trackItem.source && ffmpeg.isLoaded.value;
  }, initText, {
    immediate: true,
    flush: 'post'
  });
  trackCheckPlaying(props);
</script>