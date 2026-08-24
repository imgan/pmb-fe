<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useKampusStore } from '@/stores/kampus';

const kampusStore = useKampusStore();
const open = ref(false);

onMounted(() => {
  kampusStore.load();
});

const namaKampus = computed(() => kampusStore.kampus?.namaKampus ?? 'Kami');
const whatsappNumber = computed(() => kampusStore.kampus?.whatsappNumber);

const chatLink = computed(() => {
  const message = `Halo ${namaKampus.value}, saya ingin bertanya seputar pendaftaran mahasiswa baru.`;
  return `https://wa.me/${whatsappNumber.value}?text=${encodeURIComponent(message)}`;
});
</script>

<template>
  <div v-if="whatsappNumber" class="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
    <Transition name="fab-fade">
      <div
        v-if="open"
        class="w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0px_8px_24px_rgba(27,54,93,0.2)] overflow-hidden"
      >
        <div class="bg-[#25D366] text-white px-4 py-3 flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined filled" style="font-size: 20px">school</span>
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-label-md truncate">{{ namaKampus }}</p>
            <p class="text-label-sm opacity-90">Biasanya membalas dalam beberapa menit</p>
          </div>
          <button type="button" class="ml-auto text-white/80 hover:text-white shrink-0" aria-label="Tutup" @click="open = false">
            <span class="material-symbols-outlined" style="font-size: 20px">close</span>
          </button>
        </div>
        <div class="p-4">
          <p class="text-body-sm text-on-surface-variant bg-surface-container rounded-lg rounded-tl-none p-3 mb-4">
            Halo! 👋 Ada yang bisa kami bantu seputar pendaftaran mahasiswa baru?
          </p>
          <a
            :href="chatLink"
            target="_blank"
            rel="noopener"
            class="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white font-semibold text-label-md py-2.5 rounded-lg hover:brightness-95 transition-all"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">chat</span>
            Mulai Chat di WhatsApp
          </a>
        </div>
      </div>
    </Transition>

    <button
      type="button"
      class="w-14 h-14 rounded-full bg-[#25D366] text-white shadow-[0px_4px_16px_rgba(37,211,102,0.5)] flex items-center justify-center hover:scale-105 transition-transform"
      :aria-label="open ? 'Tutup chat WhatsApp' : 'Buka chat WhatsApp'"
      @click="open = !open"
    >
      <span class="material-symbols-outlined filled" style="font-size: 28px">{{ open ? 'close' : 'chat' }}</span>
    </button>
  </div>
</template>

<style scoped>
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
