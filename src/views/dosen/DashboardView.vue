<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import DashboardStatistik from '@/components/dosen/DashboardStatistik.vue';
import DosenProfileSettingsModal from '@/components/layout/DosenProfileSettingsModal.vue';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import {
  dosenDashboardApi,
  type BiodataDosenSdm,
  type DashboardDosen,
  type RiwayatPendidikanDosen,
} from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/**
 * Dashboard dosen: pengumuman BAAK untuk dosen & biodata dosen pada SDM. Dosen bisa mengubah data
 * pribadi & kontak (No Telp & WhatsApp tampil di Informasi Dosen portal mahasiswa) serta riwayat
 * pendidikan; nama, NIDN, jabatan & KUM dikelola SDM.
 */
const data = ref<DashboardDosen | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const pengumumanDibuka = ref<number | null>(null);
const dosenAuthStore = useDosenAuthStore();
const profilOpen = ref(false);

const load = async () => {
  try {
    data.value = await dosenDashboardApi.get();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat dashboard');
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const b = computed(() => data.value?.biodata ?? null);
const namaGelar = (d: BiodataDosenSdm) => [d.namaLengkap, d.gelar].filter(Boolean).join(', ');
const waLink = (no: string) => {
  const digit = no.replace(/\D/g, '');
  return `https://wa.me/${digit.startsWith('0') ? `62${digit.slice(1)}` : digit}`;
};

// ---- Edit biodata ----
const editOpen = ref(false);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = reactive({
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '' as '' | 'L' | 'P',
  agama: '',
  email: '',
  alamat: '',
  telpHp: '',
  noWhatsapp: '',
  pendidikanAkhir: '',
});
const AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
const PENDIDIKAN = ['S1', 'S2', 'S3', 'Profesi', 'Spesialis'];

const bukaEdit = () => {
  if (!b.value) return;
  form.tempatLahir = b.value.tempatLahir ?? '';
  form.tanggalLahir = b.value.tanggalLahir ?? '';
  form.jenisKelamin = b.value.jenisKelamin ?? '';
  form.agama = b.value.agama ?? '';
  form.email = b.value.email ?? '';
  form.alamat = b.value.alamat ?? '';
  form.telpHp = b.value.telpHp ?? '';
  form.noWhatsapp = b.value.noWhatsapp ?? '';
  form.pendidikanAkhir = b.value.pendidikanAkhir ?? '';
  formError.value = null;
  editOpen.value = true;
};

const nomorValid = (v: string) => !v.trim() || /^\+?[0-9\s-]{8,20}$/.test(v.trim());
const simpanBiodata = async () => {
  formError.value = null;
  if (!nomorValid(form.telpHp) || !nomorValid(form.noWhatsapp)) {
    formError.value = 'No Telp / WhatsApp hanya boleh angka (8-20 digit, boleh diawali +)';
    return;
  }
  saving.value = true;
  try {
    const biodata = await dosenDashboardApi.updateBiodata({
      tempatLahir: form.tempatLahir.trim(),
      tanggalLahir: form.tanggalLahir,
      jenisKelamin: form.jenisKelamin || null,
      agama: form.agama,
      email: form.email.trim(),
      alamat: form.alamat.trim(),
      telpHp: form.telpHp.trim(),
      noWhatsapp: form.noWhatsapp.trim(),
      pendidikanAkhir: form.pendidikanAkhir,
    });
    if (data.value) data.value.biodata = biodata;
    toastSuccess('Biodata diperbarui');
    editOpen.value = false;
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan biodata');
  } finally {
    saving.value = false;
  }
};

// ---- Riwayat pendidikan ----
const riwayatOpen = ref(false);
const riwayatId = ref<number | null>(null);
const riwayatError = ref<string | null>(null);
const riwayat = reactive({ perguruanTinggi: '', jenjang: '', programStudi: '', gelar: '', tahunLulus: '' as string | number, noIjazah: '' });
const hapusTarget = ref<RiwayatPendidikanDosen | null>(null);
const menghapus = ref(false);

const bukaRiwayat = (r?: RiwayatPendidikanDosen) => {
  riwayatId.value = r?.id ?? null;
  riwayat.perguruanTinggi = r?.perguruanTinggi ?? '';
  riwayat.jenjang = r?.jenjang ?? '';
  riwayat.programStudi = r?.programStudi ?? '';
  riwayat.gelar = r?.gelar ?? '';
  riwayat.tahunLulus = r?.tahunLulus ?? '';
  riwayat.noIjazah = r?.noIjazah ?? '';
  riwayatError.value = null;
  riwayatOpen.value = true;
};

const simpanRiwayat = async () => {
  riwayatError.value = null;
  if (!riwayat.perguruanTinggi.trim() || !riwayat.jenjang) {
    riwayatError.value = 'Perguruan tinggi dan jenjang wajib diisi';
    return;
  }
  const payload = {
    perguruanTinggi: riwayat.perguruanTinggi.trim(),
    jenjang: riwayat.jenjang,
    programStudi: riwayat.programStudi.trim() || null,
    gelar: riwayat.gelar.trim() || null,
    tahunLulus: riwayat.tahunLulus ? Number(riwayat.tahunLulus) : null,
    noIjazah: riwayat.noIjazah.trim() || null,
  };
  saving.value = true;
  try {
    const biodata = riwayatId.value ? await dosenDashboardApi.ubahRiwayat(riwayatId.value, payload) : await dosenDashboardApi.tambahRiwayat(payload);
    if (data.value) data.value.biodata = biodata;
    toastSuccess('Riwayat pendidikan disimpan');
    riwayatOpen.value = false;
  } catch (err) {
    riwayatError.value = extractErrorMessage(err, 'Gagal menyimpan riwayat pendidikan');
  } finally {
    saving.value = false;
  }
};

const hapusRiwayat = async () => {
  if (!hapusTarget.value) return;
  menghapus.value = true;
  try {
    const biodata = await dosenDashboardApi.hapusRiwayat(hapusTarget.value.id);
    if (data.value) data.value.biodata = biodata;
    toastSuccess('Riwayat pendidikan dihapus');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menghapus riwayat pendidikan');
  } finally {
    hapusTarget.value = null;
    menghapus.value = false;
  }
};

const inputClass =
  'w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary';
const labelClass = 'block font-medium text-label-md text-on-surface mb-2';
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Dashboard</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Ringkasan akademik, pengumuman, dan biodata Anda pada SDM.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat dashboard...</div>

    <template v-else-if="data && b">
      <DashboardStatistik :data="data" />

      <!-- Pengumuman -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mb-6">
        <div class="px-4 py-3 border-b border-outline-variant">
          <h2 class="font-semibold text-title-md text-primary">Pengumuman<template v-if="data.tahunAjaran"> Tahun {{ data.tahunAjaran }}</template></h2>
        </div>
        <div v-if="!data.pengumuman.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada pengumuman.</div>
        <ul v-else class="divide-y divide-outline-variant">
          <li v-for="(p, i) in data.pengumuman" :key="p.id">
            <button
              type="button"
              class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-container-highest"
              @click="pengumumanDibuka = pengumumanDibuka === p.id ? null : p.id"
            >
              <span class="text-on-surface-variant w-6 shrink-0">{{ i + 1 }}</span>
              <span class="flex-1 min-w-0">
                <span class="block font-medium text-on-surface">
                  {{ p.judul }}
                  <span v-if="p.isPenting" class="ml-2 px-2 py-0.5 rounded-full text-label-sm bg-error-container text-on-error-container">Penting</span>
                </span>
                <span class="block text-label-sm text-on-surface-variant">{{ formatDate(p.tanggalTerbit) }}</span>
              </span>
              <span class="material-symbols-outlined text-on-surface-variant" :class="{ 'rotate-180': pengumumanDibuka === p.id }">expand_more</span>
            </button>
            <!-- Isi dari editor BAAK; tag berbahaya sudah dibuang di server (pengumuman.service). -->
            <div v-if="pengumumanDibuka === p.id" class="px-4 pb-4 pl-13 text-body-md text-on-surface" v-html="p.isi"></div>
          </li>
        </ul>
      </section>

      <!-- Biodata -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-outline-variant flex items-center justify-between gap-3">
          <h2 class="font-semibold text-title-md text-primary">Biodata Dosen pada SDM</h2>
          <div class="flex flex-wrap gap-2">
            <AppButton variant="secondary" icon="account_circle" @click="profilOpen = true">Foto &amp; Password</AppButton>
            <AppButton variant="secondary" icon="edit" @click="bukaEdit">Edit Biodata</AppButton>
          </div>
        </div>
        <div class="p-4 md:p-6 grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-x-10 gap-y-4 text-body-md">
          <button type="button" class="justify-self-start" title="Ubah foto profil" @click="profilOpen = true">
            <img
              v-if="dosenAuthStore.dosen?.photo"
              :src="dosenAuthStore.dosen.photo"
              alt="Foto profil"
              class="w-28 h-36 object-cover rounded-md border border-outline-variant"
            />
            <span
              v-else
              class="w-28 h-36 rounded-md border border-dashed border-outline-variant flex flex-col items-center justify-center text-on-surface-variant text-label-sm"
            >
              <span class="material-symbols-outlined" style="font-size: 32px">add_a_photo</span>
              Tambah foto
            </span>
          </button>
          <dl class="grid grid-cols-[140px_1fr] gap-y-2">
            <dt class="text-on-surface-variant">No. Dosen (NIDN)</dt>
            <dd>: {{ b.nidn || '-' }}</dd>
            <dt class="text-on-surface-variant">Nama</dt>
            <dd>: {{ namaGelar(b) }}</dd>
            <dt class="text-on-surface-variant">Tempat Lahir</dt>
            <dd>: {{ b.tempatLahir || '-' }}</dd>
            <dt class="text-on-surface-variant">Jenis Kelamin</dt>
            <dd>: {{ b.jenisKelamin === 'L' ? 'Laki-laki' : b.jenisKelamin === 'P' ? 'Perempuan' : '-' }}</dd>
            <dt class="text-on-surface-variant">Agama</dt>
            <dd>: {{ b.agama || '-' }}</dd>
            <dt class="text-on-surface-variant">Email</dt>
            <dd class="break-all">: {{ b.email || '-' }}</dd>
            <dt class="text-on-surface-variant">Homebase</dt>
            <dd>: {{ b.jurusan?.namaJurusan ?? '-' }}</dd>
          </dl>
          <dl class="grid grid-cols-[140px_1fr] gap-y-2">
            <dt class="text-on-surface-variant">Jabatan</dt>
            <dd>: {{ b.jabatanFungsional || '-' }}</dd>
            <dt class="text-on-surface-variant">KUM</dt>
            <dd>: {{ b.kum ?? '-' }}</dd>
            <dt class="text-on-surface-variant">Tanggal Lahir</dt>
            <dd>: {{ b.tanggalLahir ? formatDate(b.tanggalLahir) : '-' }}</dd>
            <dt class="text-on-surface-variant">Alamat</dt>
            <dd class="whitespace-pre-line">: {{ b.alamat || '-' }}</dd>
            <dt class="text-on-surface-variant">Telp.</dt>
            <dd>: {{ b.telpHp || '-' }}</dd>
            <dt class="text-on-surface-variant">WhatsApp</dt>
            <dd>
              :
              <a v-if="b.noWhatsapp" :href="waLink(b.noWhatsapp)" target="_blank" rel="noopener" class="text-primary hover:underline">{{ b.noWhatsapp }}</a>
              <template v-else>-</template>
            </dd>
            <dt class="text-on-surface-variant">Pendidikan Akhir</dt>
            <dd>: {{ b.pendidikanAkhir || '-' }}</dd>
          </dl>
        </div>

        <div class="px-4 md:px-6 pb-4 md:pb-6">
          <div class="flex items-center justify-between mb-2">
            <p class="text-label-md font-medium text-on-surface">Riwayat Pendidikan</p>
            <button type="button" class="text-label-md text-primary hover:underline" @click="bukaRiwayat()">+ Tambah</button>
          </div>
          <div class="overflow-x-auto border border-outline-variant rounded-md">
            <table class="w-full text-body-sm">
              <thead class="bg-surface-container text-label-sm text-on-surface-variant">
                <tr>
                  <th class="px-3 py-2 text-left font-medium">Perguruan Tinggi</th>
                  <th class="px-3 py-2 text-left font-medium">Jenjang Studi</th>
                  <th class="px-3 py-2 text-left font-medium">Program Studi</th>
                  <th class="px-3 py-2 text-left font-medium">Gelar</th>
                  <th class="px-3 py-2 text-center font-medium">Tahun Lulus</th>
                  <th class="px-3 py-2 text-left font-medium">No Ijazah</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-if="!b.riwayatPendidikan.length">
                  <td colspan="7" class="px-3 py-4 text-center text-on-surface-variant">Belum ada riwayat pendidikan.</td>
                </tr>
                <tr v-for="r in b.riwayatPendidikan" :key="r.id">
                  <td class="px-3 py-2">{{ r.perguruanTinggi }}</td>
                  <td class="px-3 py-2">{{ r.jenjang }}</td>
                  <td class="px-3 py-2">{{ r.programStudi || '-' }}</td>
                  <td class="px-3 py-2">{{ r.gelar || '-' }}</td>
                  <td class="px-3 py-2 text-center">{{ r.tahunLulus ?? '-' }}</td>
                  <td class="px-3 py-2">{{ r.noIjazah || '-' }}</td>
                  <td class="px-3 py-2 whitespace-nowrap text-right">
                    <button type="button" class="text-label-md text-primary hover:underline mr-3" @click="bukaRiwayat(r)">Ubah</button>
                    <button type="button" class="text-label-md text-error hover:underline" @click="hapusTarget = r">Hapus</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-label-sm text-on-surface-variant">
            Nama, NIDN, jabatan, dan KUM dikelola bagian SDM. No Telp &amp; WhatsApp tampil di Informasi Dosen portal mahasiswa.
          </p>
        </div>
      </section>
    </template>

    <!-- Modal edit biodata -->
    <Modal :model-value="editOpen" title="Edit Biodata" size="lg" @update:model-value="(v: boolean) => (editOpen = v)">
      <form class="space-y-4" @submit.prevent="simpanBiodata">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="block"><span :class="labelClass">No Telp</span><input v-model="form.telpHp" inputmode="tel" maxlength="20" :class="inputClass" /></label>
          <label class="block"><span :class="labelClass">No WhatsApp</span><input v-model="form.noWhatsapp" inputmode="tel" maxlength="20" placeholder="08xxxxxxxxxx" :class="inputClass" /></label>
          <label class="block md:col-span-2"><span :class="labelClass">Email</span><input v-model="form.email" type="email" maxlength="150" :class="inputClass" /></label>
          <label class="block"><span :class="labelClass">Tempat Lahir</span><input v-model="form.tempatLahir" maxlength="100" :class="inputClass" /></label>
          <label class="block"><span :class="labelClass">Tanggal Lahir</span><input v-model="form.tanggalLahir" type="date" :class="inputClass" /></label>
          <label class="block">
            <span :class="labelClass">Jenis Kelamin</span>
            <select v-model="form.jenisKelamin" :class="inputClass">
              <option value="">-</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </label>
          <label class="block">
            <span :class="labelClass">Agama</span>
            <select v-model="form.agama" :class="inputClass">
              <option value="">-</option>
              <option v-for="a in AGAMA" :key="a" :value="a">{{ a }}</option>
              <option v-if="form.agama && !AGAMA.includes(form.agama)" :value="form.agama">{{ form.agama }}</option>
            </select>
          </label>
          <label class="block">
            <span :class="labelClass">Pendidikan Akhir</span>
            <select v-model="form.pendidikanAkhir" :class="inputClass">
              <option value="">-</option>
              <option v-for="p in PENDIDIKAN" :key="p" :value="p">{{ p }}</option>
              <option v-if="form.pendidikanAkhir && !PENDIDIKAN.includes(form.pendidikanAkhir)" :value="form.pendidikanAkhir">{{ form.pendidikanAkhir }}</option>
            </select>
          </label>
          <label class="block md:col-span-2"><span :class="labelClass">Alamat</span><textarea v-model="form.alamat" rows="3" maxlength="1000" :class="inputClass"></textarea></label>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="editOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpanBiodata">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <!-- Modal riwayat pendidikan -->
    <Modal :model-value="riwayatOpen" :title="riwayatId ? 'Ubah Riwayat Pendidikan' : 'Tambah Riwayat Pendidikan'" @update:model-value="(v: boolean) => (riwayatOpen = v)">
      <form class="space-y-4" @submit.prevent="simpanRiwayat">
        <div v-if="riwayatError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ riwayatError }}</div>
        <label class="block"><span :class="labelClass">Perguruan Tinggi *</span><input v-model="riwayat.perguruanTinggi" maxlength="200" :class="inputClass" /></label>
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span :class="labelClass">Jenjang Studi *</span>
            <select v-model="riwayat.jenjang" :class="inputClass">
              <option value="">-</option>
              <option v-for="j in ['D3', 'D4', 'S1', 'S2', 'S3', 'Profesi', 'Spesialis']" :key="j" :value="j">{{ j }}</option>
            </select>
          </label>
          <label class="block"><span :class="labelClass">Tahun Lulus</span><input v-model="riwayat.tahunLulus" type="number" min="1950" max="2100" :class="inputClass" /></label>
        </div>
        <label class="block"><span :class="labelClass">Program Studi</span><input v-model="riwayat.programStudi" maxlength="150" :class="inputClass" /></label>
        <div class="grid grid-cols-2 gap-4">
          <label class="block"><span :class="labelClass">Gelar</span><input v-model="riwayat.gelar" maxlength="50" placeholder="S.Kom." :class="inputClass" /></label>
          <label class="block"><span :class="labelClass">No Ijazah</span><input v-model="riwayat.noIjazah" maxlength="100" :class="inputClass" /></label>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="riwayatOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpanRiwayat">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <DosenProfileSettingsModal v-model="profilOpen" />

    <ConfirmDialog
      :open="!!hapusTarget"
      title="Hapus Riwayat Pendidikan"
      :message="`Hapus riwayat pendidikan ${hapusTarget?.jenjang ?? ''} ${hapusTarget?.perguruanTinggi ?? ''}?`"
      :loading="menghapus"
      @confirm="hapusRiwayat"
      @cancel="hapusTarget = null"
    />
  </div>
</template>
