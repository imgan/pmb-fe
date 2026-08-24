<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import { publicApi } from '@/api/public';
import type { Gelombang, HomeImage, Jurusan } from '@/types/entities';

const loadingPrograms = ref(true);
const jurusanList = ref<Jurusan[]>([]);
const gelombang = ref<Gelombang | null>(null);
const homeImages = ref<HomeImage | null>(null);

/** One card per distinct program name (jurusan rows repeat per golongan kelas; foto/prospekKarir only need to be filled once). */
const accreditedPrograms = computed(() => {
  const seen = new Map<string, Jurusan>();
  jurusanList.value.forEach((j) => {
    const existing = seen.get(j.namaJurusan);
    if (!existing || (!existing.foto && !existing.prospekKarir && (j.foto || j.prospekKarir))) {
      seen.set(j.namaJurusan, j);
    }
  });
  return Array.from(seen.values()).map((j) => ({
    ...j,
    prospekKarirList: (j.prospekKarir ?? '').split('\n').map((line) => line.trim()).filter(Boolean),
  }));
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const gelombangPeriode = computed(() => {
  if (!gelombang.value) return '';
  const start = dateFormatter.format(new Date(gelombang.value.startDate));
  const end = dateFormatter.format(new Date(gelombang.value.endDate));
  return `${start} s/d ${end}`;
});

const heroCanvas = ref<HTMLCanvasElement | null>(null);
let stopHeroAnimation: (() => void) | null = null;

const scholarshipSlide = ref(0);
const scholarshipSlideCount = 2;
function nextScholarshipSlide() {
  scholarshipSlide.value = (scholarshipSlide.value + 1) % scholarshipSlideCount;
}
function prevScholarshipSlide() {
  scholarshipSlide.value = (scholarshipSlide.value - 1 + scholarshipSlideCount) % scholarshipSlideCount;
}

const defaultImages = {
  hero: 'https://images.pexels.com/photos/7972313/pexels-photo-7972313.jpeg?auto=compress&cs=tinysrgb&w=1600',
  programStudi:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDObiNMP3UG7OUazirj0SOX3VI47zfALa0GEa2oapevtcQ7OgVWk6UPatQfXBxBMUUdq3iepmvtmFbz51_JENWiBKtrh1oPQgWV2_k1rmNO6XkXuaTmCoPwcxJybK096TbAt-sHS9AyTCy7HeS4_6Ilvq9Iqg3Uc6bh9gKbjwXT1n1UJNTnVjlgeTtyp7wmSHJm7T2MvWZiaWWY006roP96Wxvpl48INb2llhWk3nI3w5sePTmLwIOQKvY4joIjZLwKI64',
  kehidupanKampus:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA45VUdGkXA-DJoLR_JJCBQcfWNDHzNrNrkitnMOy3Hm2SZ_961QvTQUvdTmTlab1AIBsoPJB_SKmKHu-ak5Ht5pOB4NwkL4Xf5oAdCbht4nQy2lM6KvOPxdItUCXT_g7jsmhfKcvJtDLXQsjCyG6NgqSzid4kBRUAdrW8mXDBQnR1KJQLToinwq3Hg5mExPAPkNaaV0Nplt3iOOFTQP4Tje8pPzWObIc6wifcYfWq9JY562spDwDae_Q',
  fasilitasLab:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBgofqIg7Dbg9t9hwkEmg9bd7PZV9VVcEaGIm7M13uVnO6B9e89guNrqv7CkyLPYJt6_Q9TJ14LIZGczLiYf1H5w-xL4hCzR-5O8DTVUEtynIxeBI_twgQTUQZdVOBxu5ZSLK9DtRZGe4Am7t65rUb9YGJuI1CNc13aQeVXgMjGh9AtH_67tSjygtb3VQSmPNThJaoaEFVd6mth7_GLXg-9TC6lWvOnICrgzKY-uABnKs73W0e_8uy5DQ',
  fasilitasGedung:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBj3x0rLsedWtgd4ptVoO5-qn-lsJjlUtKK_i9Pp3HwqyNGjIQV8zyRHVHK2XYJxqBgYAp5q5VFy7mKOOBZV2_jxpYWfuIgWSkWsDmYXfGc8lY_62CuICERvH5q3j5wsPDKPAOh3CaZrr6bvxfDZSPL8jun-Q2ZLzPxq60hxJP_-9fb-gZyW-hOkMvuQR-xPxXFw07escizW9y8PpCeEo1I8FDZlH4-K7mbfF7lF4kGnDH6Eo7VX7Rb3A',
  fasilitasAula:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCrmLCw8GpzBzJBWvKw58okiXGXVS1iE8wX5SHVr8T3qRJrGU0fTFon7DgaDtbmkKeWIl2MeTjiURjV-S7CEiInGbv7E_IFOGK0jI_07r_qKnuNOrN3xBkZLH07vQtzEFHiku95E_UGUumUpaXNS2BvfbyDAbJD9Fxxpds4Ur_FCL51yrtrl8IZbWIZBx4ioqsM5Ivp10TEQhI6p98SaWA5OCP0D2bnzG1PINoD6on4KEmEvGfvFE7CAw',
  beasiswaSlide1:
    'https://lh3.googleusercontent.com/aida/AP1WRLtnutOwSk7Xs30mmtTu0TeaQZH3RXee21-q6AEBs_O63YhYVk_sa64grryqOwQdmj-8DzKz_rUJvgZqLCSB3MHgknw02dJyXRnLIsm1LTalTPkNXviOVOLivzQ70jU0qKrOMbUhLd764W9inHYJ5HPb3WPeF6sG61y-L6rzLVHOEi7rdOndL6DbGUS_ubd4AGiD7eRSJPj5QGuzow21M5_XwhR8Q_n8knie3TBsmO959GSrHYHt_h_Vhrr4',
  beasiswaSlide2:
    'https://lh3.googleusercontent.com/aida/AP1WRLuhtdfE0tmPYxYAznjeC-iAxtlnB2Runaj32mK82IXkDT9roKyztbhtZjAIUJ131PGOhn1_iFAdvsBV2_f5ebT5sBOpI4rjb7jhsM-CQKIZzZoMSbANt3WH7UvUExvKIU8lZQ-FZxZ9CTSr50xHTcWnGVSMUoo3VeCjWkWd82LYkrNKuAV1yDNZtupZW_QUD0sVBcLE-MkIdfgDZyM7LrUWNFvSbtHd59WTPEuIcMTMraAL_F1B7onnRlC5',
};

const heroImage = computed(() => homeImages.value?.heroImage || defaultImages.hero);
const programStudiImage = computed(() => homeImages.value?.programStudiImage || defaultImages.programStudi);
const kehidupanKampusImage = computed(() => homeImages.value?.kehidupanKampusImage || defaultImages.kehidupanKampus);
const beasiswaSlide1Image = computed(() => homeImages.value?.beasiswaSlide1Image || defaultImages.beasiswaSlide1);
const beasiswaSlide2Image = computed(() => homeImages.value?.beasiswaSlide2Image || defaultImages.beasiswaSlide2);

const facilities = computed(() => [
  { name: 'Lab Pemrograman', image: homeImages.value?.fasilitasLabImage || defaultImages.fasilitasLab },
  { name: 'Gedung Kampus', image: homeImages.value?.fasilitasGedungImage || defaultImages.fasilitasGedung },
  { name: 'Aula', image: homeImages.value?.fasilitasAulaImage || defaultImages.fasilitasAula },
]);

function startHeroAnimation(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl');
  if (!gl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_position * 0.5 + 0.5;
    }
  `;

  const fragmentShaderSource = `
    precision highp float;
    varying vec2 v_texCoord;
    uniform float u_time;

    void main() {
      vec2 uv = v_texCoord;
      vec3 color1 = vec3(0.694, 0.569, 0.247);
      vec3 color2 = vec3(0.451, 0.369, 0.157);
      vec3 color3 = vec3(0.851, 0.722, 0.4);

      float noise = sin(uv.x * 3.0 + u_time * 0.5) * cos(uv.y * 2.0 + u_time * 0.3);
      float noise2 = sin(uv.y * 4.0 - u_time * 0.2) * cos(uv.x * 5.0 + u_time * 0.4);

      vec3 finalColor = mix(color1, color2, uv.y + noise * 0.1);
      finalColor = mix(finalColor, color3, noise2 * 0.15);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function createShader(type: number, source: string) {
    const shader = gl!.createShader(type);
    if (!shader) return null;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const timeUniformLocation = gl.getUniformLocation(program, 'u_time');

  let rafId = 0;
  function resizeCanvasToDisplaySize() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
  }

  function render(time: number) {
    resizeCanvasToDisplaySize();
    gl!.viewport(0, 0, gl!.canvas.width, gl!.canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.useProgram(program);
    gl!.enableVertexAttribArray(positionAttributeLocation);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, positionBuffer);
    gl!.vertexAttribPointer(positionAttributeLocation, 2, gl!.FLOAT, false, 0, 0);
    gl!.uniform1f(timeUniformLocation, time * 0.001);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(render);
  }
  rafId = requestAnimationFrame(render);

  return () => cancelAnimationFrame(rafId);
}

onMounted(async () => {
  if (heroCanvas.value) {
    stopHeroAnimation = startHeroAnimation(heroCanvas.value);
  }

  try {
    const [jurusan, activeGelombang] = await Promise.all([publicApi.jurusan(), publicApi.activeGelombang()]);
    jurusanList.value = jurusan;
    gelombang.value = activeGelombang;
  } finally {
    loadingPrograms.value = false;
  }

  try {
    homeImages.value = await publicApi.homeImages();
  } catch {
    homeImages.value = null;
  }
});

onBeforeUnmount(() => {
  stopHeroAnimation?.();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <PublicHeader />

    <main class="flex-1">
      <!-- Hero -->
      <section class="relative w-full min-h-[600px] md:h-[700px] flex items-center bg-gradient-to-br from-on-primary-fixed-variant via-primary to-inverse-primary overflow-hidden">
        <div class="absolute inset-0 opacity-[0.08]">
          <canvas ref="heroCanvas" class="w-full h-full"></canvas>
        </div>
        <div
          class="relative z-10 w-full px-4 md:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
        >
          <div class="md:col-span-7 flex flex-col items-start gap-6">
            <h1 class="text-display-lg font-bold tracking-tight text-on-primary">Penerimaan Mahasiswa Baru</h1>
            <div class="flex flex-col gap-1">
              <h2 class="text-headline-md font-semibold tracking-tight text-on-primary">Politeknik Bhakti Kartini</h2>
              <p class="text-body-lg text-secondary-container italic">
                "From Local to Global"
              </p>
            </div>
            <div v-if="gelombang" class="bg-primary-container/50 border border-on-primary/10 p-6 rounded-xl w-full max-w-md">
              <p class="text-on-primary text-headline-md font-semibold mb-2">{{ gelombang.namaGelombang }}</p>
              <p class="text-on-primary-container text-[24px] md:text-[28px] font-bold">{{ gelombangPeriode }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-6 mt-4">
              <RouterLink
                to="/pendaftaran"
                class="bg-secondary-container text-on-secondary-container text-label-md font-semibold px-8 py-3.5 rounded shadow-lg hover:bg-secondary-fixed transition-all"
              >
                Daftar Sekarang
              </RouterLink>
              <a href="/#program" class="text-on-primary text-label-md font-semibold flex items-center gap-2 hover:text-secondary-container transition-colors">
                Panduan PMB
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
          <div class="md:col-span-5 flex justify-center">
            <div class="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-on-primary/10 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <img
                alt="Penerimaan Mahasiswa Baru"
                class="w-full h-auto max-w-md object-cover"
                :src="heroImage"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Pilihan Program Studi -->
      <section id="program" class="py-16 md:py-24 px-4 md:px-12 max-w-7xl mx-auto bg-background">
        <div class="text-center mb-16">
          <h2 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-on-background">
            Program Studi kami sudah Terakreditasi
          </h2>
        </div>

        <div v-if="loadingPrograms" class="text-center py-12 text-on-surface-variant">Memuat program studi...</div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="program in accreditedPrograms"
            :key="program.id"
            class="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center text-center hover:shadow-[0px_10px_25px_-5px_rgba(27,54,93,0.15)] transition-shadow"
          >
            <img
              :src="program.foto || programStudiImage"
              :alt="program.namaJurusan"
              class="w-28 h-28 rounded-full object-cover border-4 border-primary/20 mb-4"
            />
            <h3 class="text-headline-md font-bold text-primary uppercase mb-6">{{ program.namaJurusan }}</h3>
            <div class="w-full text-left">
              <h4 class="font-bold text-on-background mb-3">Prospek Karir :</h4>
              <ul v-if="program.prospekKarirList.length > 0" class="list-disc pl-5 flex flex-col gap-1.5">
                <li v-for="(item, idx) in program.prospekKarirList" :key="idx" class="text-body-md text-on-surface-variant">
                  {{ item }}
                </li>
              </ul>
              <p v-else class="text-body-sm text-on-surface-variant">Belum ada data prospek karir.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Kenapa Memilih Kami (Bento Grid) -->
      <section class="py-16 md:py-24 px-4 md:px-12 max-w-7xl mx-auto bg-background">
        <div class="text-center mb-16">
          <h2 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-4">
            Kenapa Memilih Politeknik Bhakti Kartini
          </h2>
          <p class="text-body-md text-on-surface-variant max-w-2xl mx-auto">
            Temukan keunggulan ekosistem pendidikan kami yang dirancang untuk kesuksesanmu.
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:auto-rows-[280px]">
          <div class="md:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-8 flex flex-col justify-between hover:shadow-[0px_10px_25px_-5px_rgba(27,54,93,0.2)] transition-shadow">
            <div class="bg-primary-container text-on-primary-container p-3 rounded-lg w-fit">
              <span class="material-symbols-outlined filled text-[28px]">biotech</span>
            </div>
            <div>
              <h3 class="text-headline-md font-semibold text-on-background mb-2">Fasilitas Kelas Dunia</h3>
              <p class="text-body-md text-on-surface-variant">
                Laboratorium dan pusat riset kami dilengkapi teknologi terkini, memastikan mahasiswa mendapat
                pengalaman langsung dengan perangkat standar industri.
              </p>
            </div>
          </div>
          <div class="bg-surface-container-low rounded-xl border border-outline-variant p-8 flex flex-col justify-between hover:shadow-[0px_10px_25px_-5px_rgba(27,54,93,0.2)] transition-shadow">
            <div class="bg-surface-variant text-primary p-3 rounded-lg w-fit">
              <span class="material-symbols-outlined filled text-[28px]">groups</span>
            </div>
            <div class="mt-8">
              <h3 class="text-headline-md font-semibold text-on-background mb-2">Dosen Berpengalaman</h3>
              <p class="text-body-sm text-on-surface-variant">Belajar bersama dosen dan praktisi industri terkemuka.</p>
            </div>
          </div>
          <div class="bg-surface-container-low rounded-xl border border-outline-variant p-8 flex flex-col justify-between hover:shadow-[0px_10px_25px_-5px_rgba(27,54,93,0.2)] transition-shadow">
            <div class="bg-surface-variant text-primary p-3 rounded-lg w-fit">
              <span class="material-symbols-outlined filled text-[28px]">language</span>
            </div>
            <div class="mt-8">
              <h3 class="text-headline-md font-semibold text-on-background mb-2">Jaringan Global</h3>
              <p class="text-body-sm text-on-surface-variant">Terhubung dengan alumni dan mitra industri di seluruh dunia.</p>
            </div>
          </div>
          <div class="md:col-span-2 rounded-xl border border-outline-variant overflow-hidden relative group">
            <div
              class="bg-cover bg-center absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-700"
              :style="{ backgroundImage: `url('${kehidupanKampusImage}')` }"
            ></div>
            <div class="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
            <div class="absolute bottom-0 left-0 p-8 w-full">
              <h3 class="text-headline-md font-semibold text-on-background mb-2">Kehidupan Kampus yang Hidup</h3>
              <p class="text-body-md text-on-surface-variant max-w-lg">
                Ikuti beragam kegiatan budaya, akademik, dan sosial yang membentuk pengalaman kampus yang utuh.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Fasilitas Kampus -->
      <section id="fasilitas" class="py-16 md:py-24 bg-surface">
        <div class="max-w-7xl mx-auto px-4 md:px-12">
          <div class="text-center mb-16">
            <h2 class="text-label-md font-semibold text-primary tracking-[0.2em] uppercase mb-4">Fasilitas Kampus</h2>
            <p class="text-headline-lg-mobile md:text-headline-lg font-semibold text-on-background">
              Fasilitas Terbaik untuk Kenyamanan Belajar Anda
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div v-for="facility in facilities" :key="facility.name" class="relative group overflow-hidden rounded-lg shadow-md">
              <img
                :alt="facility.name"
                class="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                :src="facility.image"
              />
              <div class="absolute bottom-6 left-6">
                <span class="bg-primary-container text-on-primary px-4 py-1.5 text-label-md font-semibold rounded-lg">
                  {{ facility.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Beasiswa -->
      <section id="beasiswa" class="py-16 md:py-24 bg-surface-container-lowest">
        <div class="max-w-7xl mx-auto px-4 md:px-12">
          <div class="text-center mb-16">
            <h2 class="text-label-md font-semibold text-primary tracking-[0.2em] uppercase mb-2">Beasiswa</h2>
            <p class="text-headline-lg-mobile md:text-headline-lg font-semibold text-on-background">
              Peluang Emas untuk Meraih Beasiswa
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div class="md:col-span-6 flex flex-col gap-6">
              <h3 class="text-headline-md font-semibold text-on-background">
                Beasiswa Kartu Indonesia Pintar (KIP Kuliah)
              </h3>
              <p class="text-body-md text-on-surface-variant">
                Kartu Indonesia Pintar Kuliah (KIP Kuliah) adalah program bantuan pendidikan dari pemerintah untuk
                mahasiswa dari keluarga kurang mampu yang ingin melanjutkan kuliah ke perguruan tinggi negeri (PTN)
                atau perguruan tinggi swasta (PTS). Bantuan ini diberikan dalam bentuk uang tunai, perluasan akses,
                dan kesempatan belajar.
              </p>
              <div class="pt-4">
                <RouterLink
                  to="/beasiswa/kip"
                  class="bg-primary text-on-primary text-label-md font-semibold px-8 py-3.5 rounded shadow-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2 w-fit"
                >
                  Info Lebih Lanjut
                  <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
                </RouterLink>
              </div>
            </div>
            <div class="md:col-span-6 relative h-[400px] rounded-xl overflow-hidden shadow-lg border border-outline-variant">
              <div
                class="w-full h-full flex transition-transform duration-700 ease-in-out"
                :style="{ transform: `translateX(-${scholarshipSlide * 100}%)` }"
              >
                <div class="w-full h-full flex-shrink-0">
                  <img alt="Graduation Success" class="w-full h-full object-cover" :src="beasiswaSlide1Image" />
                </div>
                <div class="w-full h-full flex-shrink-0">
                  <img alt="Students Collaborating" class="w-full h-full object-cover" :src="beasiswaSlide2Image" />
                </div>
              </div>
              <div class="absolute bottom-4 right-4 flex gap-2">
                <button
                  class="p-2 bg-surface/80 backdrop-blur-sm rounded-full hover:bg-surface transition-colors"
                  aria-label="Sebelumnya"
                  @click="prevScholarshipSlide"
                >
                  <span class="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button
                  class="p-2 bg-surface/80 backdrop-blur-sm rounded-full hover:bg-surface transition-colors"
                  aria-label="Berikutnya"
                  @click="nextScholarshipSlide"
                >
                  <span class="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <PublicFooter />
  </div>
</template>
