<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useKampusStore } from '@/stores/kampus';
import { publicApi } from '@/api/public';
import type { Beasiswa, BiayaKuliah } from '@/types/entities';

const kampusStore = useKampusStore();
const year = new Date().getFullYear();
const beasiswaList = ref<Beasiswa[]>([]);
const biayaKuliahList = ref<BiayaKuliah[]>([]);

onMounted(async () => {
  kampusStore.load();
  try {
    beasiswaList.value = await publicApi.beasiswaList();
  } catch {
    beasiswaList.value = [];
  }
  try {
    biayaKuliahList.value = await publicApi.biayaKuliahList();
  } catch {
    biayaKuliahList.value = [];
  }
});
</script>

<template>
  <footer class="w-full bg-primary-container text-on-primary py-12 md:py-16">
    <div class="max-w-7xl mx-auto px-4 md:px-12">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        <!-- Brand & Contact -->
        <div class="md:col-span-4 flex flex-col gap-6">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-headline-md font-bold">
              <img
                v-if="kampusStore.kampus?.logoUrl"
                :src="kampusStore.kampus.logoUrl"
                :alt="kampusStore.kampus?.namaKampus || 'Logo'"
                class="h-16 w-auto max-w-[280px] object-contain shrink-0"
              />
              <template v-else>
                <span class="material-symbols-outlined filled shrink-0" style="font-size: 32px">school</span>
                <span>{{ kampusStore.kampus?.namaKampus ?? 'Politeknik Bhakti Kartini' }}</span>
              </template>
            </div>
            <p class="text-body-sm opacity-90 leading-relaxed max-w-xs">
              {{ kampusStore.kampus?.alamat ?? 'Jl. Caringin Jembatan 14, RT.001/RW.005, Bojong Rawalumbu, Kec. Rawalumbu, Kota Bekasi, Jawa Barat 17116' }}
            </p>
          </div>
          <div class="flex flex-col gap-3 text-body-sm">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px]">call</span>
              <span>{{ kampusStore.kampus?.telepon ?? '0813-1645-5664' }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px]">chat</span>
              <span>{{ kampusStore.kampus?.whatsappNumber ?? kampusStore.kampus?.telepon ?? '0813-1645-5664' }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px]">mail</span>
              <span>{{ kampusStore.kampus?.email ?? 'info@poltekbhaktikartini.ac.id' }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px]">location_on</span>
              <span>Kode Pos: {{ kampusStore.kampus?.kodePos ?? '17116' }}</span>
            </div>
          </div>
        </div>

        <!-- Menu -->
        <div class="md:col-span-2 flex flex-col gap-4">
          <h4 class="font-bold text-body-lg">Menu</h4>
          <nav class="flex flex-col gap-2 text-body-sm opacity-80">
            <a class="hover:text-secondary-container transition-colors" href="/">Beranda</a>
            <a class="hover:text-secondary-container transition-colors" href="/#program">Pilihan Program Studi</a>
            <RouterLink class="hover:text-secondary-container transition-colors" to="/pendaftaran">Info PMB</RouterLink>
            <a class="hover:text-secondary-container transition-colors" href="/#fasilitas">Fasilitas Kampus</a>
          </nav>
        </div>

        <!-- Beasiswa & Dormitory -->
        <div class="md:col-span-3 flex flex-col gap-8">
          <div class="flex flex-col gap-4">
            <h4 class="font-bold text-body-lg">Beasiswa</h4>
            <nav class="flex flex-col gap-2 text-body-sm opacity-80">
              <template v-if="beasiswaList.length > 0">
                <RouterLink
                  v-for="item in beasiswaList"
                  :key="item.id"
                  class="hover:text-secondary-container transition-colors"
                  :to="`/beasiswa/${item.slug}`"
                >
                  {{ item.namaBeasiswa }}
                </RouterLink>
              </template>
              <a v-else class="hover:text-secondary-container transition-colors" href="/#beasiswa">Beasiswa</a>
            </nav>
          </div>
          <div class="flex flex-col gap-4">
            <h4 class="font-bold text-body-lg">Biaya Kuliah</h4>
            <nav class="flex flex-col gap-2 text-body-sm opacity-80">
              <template v-if="biayaKuliahList.length > 0">
                <RouterLink
                  v-for="item in biayaKuliahList"
                  :key="item.id"
                  class="hover:text-secondary-container transition-colors"
                  :to="`/biaya-kuliah/${item.slug}`"
                >
                  {{ item.judul }}
                </RouterLink>
              </template>
              <a v-else class="hover:text-secondary-container transition-colors" href="/#biaya-kuliah">Biaya Kuliah</a>
            </nav>
          </div>
          <div class="flex flex-col gap-4">
            <h4 class="font-bold text-body-lg">Dormitory</h4>
            <nav class="flex flex-col gap-2 text-body-sm opacity-80">
              <a class="hover:text-secondary-container transition-colors" href="#">Info Kos Sekitar Kampus</a>
              <a class="hover:text-secondary-container transition-colors" href="#">Mamikos</a>
            </nav>
          </div>
        </div>

        <!-- Bantuan -->
        <div class="md:col-span-3 flex flex-col gap-4">
          <h4 class="font-bold text-body-lg">Bantuan</h4>
          <a
            :href="`https://wa.me/${kampusStore.kampus?.whatsappNumber ?? '6281316455664'}`"
            target="_blank"
            rel="noopener"
            class="bg-primary text-on-primary px-6 py-3 rounded-lg text-label-md font-semibold hover:bg-primary/90 transition-all w-fit shadow-md"
          >
            Customer Support
          </a>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="pt-8 border-t border-on-primary/10 flex flex-col items-center gap-6">
        <div class="flex items-center gap-4">
          <a
            class="w-10 h-10 rounded-full border border-on-primary/20 flex items-center justify-center hover:bg-on-primary/10 transition-all"
            :href="kampusStore.kampus?.facebookUrl || '#'"
            target="_blank"
            rel="noopener"
            aria-label="Facebook"
          >
            <span class="material-symbols-outlined">facebook</span>
          </a>
          <a
            class="w-10 h-10 rounded-full border border-on-primary/20 flex items-center justify-center hover:bg-on-primary/10 transition-all"
            :href="kampusStore.kampus?.youtubeUrl || '#'"
            target="_blank"
            rel="noopener"
            aria-label="YouTube"
          >
            <span class="material-symbols-outlined">play_circle</span>
          </a>
          <a
            class="w-10 h-10 rounded-full border border-on-primary/20 flex items-center justify-center hover:bg-on-primary/10 transition-all"
            :href="kampusStore.kampus?.instagramUrl || '#'"
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
          >
            <span class="material-symbols-outlined">photo_camera</span>
          </a>
        </div>
        <p class="text-body-sm opacity-70">
          {{ kampusStore.kampus?.namaKampus ?? 'Politeknik Bhakti Kartini' }} © {{ year }}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </div>
  </footer>
</template>
