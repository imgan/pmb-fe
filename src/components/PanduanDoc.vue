<script setup lang="ts">
import { computed, ref } from 'vue';

/**
 * Halaman panduan portal (dosen / mahasiswa): daftar isi per grup menu + kartu per menu berisi
 * penjelasan singkat, langkah-langkah, dan catatan. Kartu bisa langsung membuka menunya (`to`).
 */
export interface PanduanMenu {
  judul: string;
  /** Nama route menu tsb (tombol "Buka menu"). */
  to?: string;
  ringkas: string;
  langkah?: string[];
  catatan?: string[];
}
export interface PanduanBagian {
  id: string;
  judul: string;
  icon: string;
  pengantar?: string;
  menu: PanduanMenu[];
}

const props = defineProps<{ bagian: PanduanBagian[] }>();

const search = ref('');
const cocok = (m: PanduanMenu, q: string) =>
  [m.judul, m.ringkas, ...(m.langkah ?? []), ...(m.catatan ?? [])].some((t) => t.toLowerCase().includes(q));
const tampil = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.bagian;
  return props.bagian
    .map((b) => ({ ...b, menu: b.judul.toLowerCase().includes(q) ? b.menu : b.menu.filter((m) => cocok(m, q)) }))
    .filter((b) => b.menu.length);
});
</script>

<template>
  <div>
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <p class="font-semibold text-label-md text-on-surface">Daftar Isi</p>
        <div class="relative w-full md:w-80">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style="font-size: 20px">search</span>
          <input
            v-model="search"
            type="search"
            placeholder="Cari panduan, mis. KRS, nilai, presensi..."
            class="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <nav class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <a
          v-for="b in tampil"
          :key="b.id"
          :href="`#${b.id}`"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">{{ b.icon }}</span>
          {{ b.judul }}
          <span class="ml-auto text-label-sm text-outline">{{ b.menu.length }}</span>
        </a>
      </nav>
    </section>

    <p v-if="!tampil.length" class="p-8 text-center text-body-md text-on-surface-variant">Tidak ada panduan yang cocok dengan "{{ search }}".</p>

    <div class="space-y-6">
      <section
        v-for="b in tampil"
        :id="b.id"
        :key="b.id"
        class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4"
      >
        <h2 class="flex items-center gap-2 text-headline-md font-semibold text-primary mb-2">
          <span class="material-symbols-outlined">{{ b.icon }}</span>
          {{ b.judul }}
        </h2>
        <p v-if="b.pengantar" class="text-body-md text-on-surface-variant mb-4">{{ b.pengantar }}</p>

        <div class="space-y-4">
          <article v-for="m in b.menu" :key="m.judul" class="border border-outline-variant rounded-md p-4">
            <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
              <h3 class="font-semibold text-title-md text-on-surface">{{ m.judul }}</h3>
              <RouterLink v-if="m.to" :to="{ name: m.to }" class="inline-flex items-center gap-1 text-label-md text-primary hover:underline">
                Buka menu
                <span class="material-symbols-outlined" style="font-size: 16px">arrow_forward</span>
              </RouterLink>
            </div>
            <p class="text-body-md text-on-surface-variant">{{ m.ringkas }}</p>
            <ol v-if="m.langkah?.length" class="mt-3 space-y-1.5 text-body-sm text-on-surface list-decimal pl-5">
              <li v-for="(l, i) in m.langkah" :key="i">{{ l }}</li>
            </ol>
            <ul v-if="m.catatan?.length" class="mt-3 space-y-1 text-body-sm text-on-surface-variant">
              <li v-for="(c, i) in m.catatan" :key="i" class="flex gap-2">
                <span class="material-symbols-outlined text-primary shrink-0" style="font-size: 16px">info</span>
                <span>{{ c }}</span>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
