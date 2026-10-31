<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { angketDosenPertanyaanApi, type AngketDosenJawaban, type AngketDosenPertanyaan, type PeriodeTerisi } from '@/api/angketDosenPertanyaan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { useProdiContext } from '@/composables/useProdiContext';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Prodi → Angket → Pertanyaan Angket Dosen: master pertanyaan penilaian dosen oleh mahasiswa per
 * Periode Akademik & Tk. Pendidikan, dikelompokkan per Kategori (filter). Open Question = jawaban
 * isian bebas. "Salin Data" menyalin pertanyaan dari periode/tingkat lain ke pilihan saat ini.
 * Di bawahnya Daftar Jawaban: pilihan skala (jawaban + nilai) untuk pertanyaan non-open question.
 */
const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_ANGKET_DOSEN_PERTANYAAN_MANAGEMENT);

const { tahunAjaranId: tahunAjaranSesi } = useProdiContext();

const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const jenjangOptions = ref<string[]>([]);
const kategoriOptions = ref<string[]>([]);
const periodeTerisi = ref<PeriodeTerisi[]>([]);
const tahunAjaranId = ref<number | ''>('');
const jenjang = ref('');
const kategori = ref('');

const items = ref<AngketDosenPertanyaan[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await angketDosenPertanyaanApi.list({
      tahunAjaranId: tahunAjaranId.value || undefined,
      jenjang: jenjang.value || undefined,
      kategori: kategori.value || undefined,
    });
    items.value = res.data;
    jenjangOptions.value = res.jenjangOptions;
    kategoriOptions.value = res.kategoriOptions;
    periodeTerisi.value = res.periodeTerisi;
    if (kategori.value && !res.kategoriOptions.includes(kategori.value)) kategori.value = '';
    if (!jenjang.value && res.jenjangOptions.length) jenjang.value = res.jenjangOptions[0];
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pertanyaan');
  } finally {
    loading.value = false;
  }
};
onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 100 });
    const sorted = data.slice().sort((a, b) => b.tahunMulai - a.tahunMulai || b.jenisSemester.localeCompare(a.jenisSemester));
    tahunAjaranOptions.value = sorted.map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}${t.isActive ? ' (aktif)' : ''}` }));
    tahunAjaranId.value = sorted.find((t) => t.id === tahunAjaranSesi)?.id ?? sorted.find((t) => t.isActive)?.id ?? sorted[0]?.id ?? '';
  } catch {
    tahunAjaranOptions.value = [];
  }
  fetchData();
  fetchJawaban();
});
watch([tahunAjaranId, jenjang, kategori], fetchData);

const jenjangSelectOptions = computed(() => jenjangOptions.value.map((j) => ({ value: j, label: j })));
const kategoriSelectOptions = computed(() => kategoriOptions.value.map((k) => ({ value: k, label: k })));
const periodeLabel = computed(() => tahunAjaranOptions.value.find((t) => t.value === tahunAjaranId.value)?.label ?? '-');
const siap = computed(() => !!tahunAjaranId.value && !!jenjang.value);

// ---- Salin data ----
const salinOpen = ref(false);
const salinSumber = ref('');
const salinGanti = ref(false);
const salinError = ref<string | null>(null);
const salinSaving = ref(false);
const sumberKey = (p: PeriodeTerisi) => `${p.tahunAjaranId}|${p.jenjangPendidikan}`;
const sumberOptions = computed(() =>
  periodeTerisi.value
    .filter((p) => !(p.tahunAjaranId === tahunAjaranId.value && p.jenjangPendidikan === jenjang.value))
    .map((p) => ({ value: sumberKey(p), label: `${p.tahunAjaran} · ${p.jenjangPendidikan} (${p.jumlah} pertanyaan)` }))
);
const jumlahTujuan = computed(
  () => periodeTerisi.value.find((p) => p.tahunAjaranId === tahunAjaranId.value && p.jenjangPendidikan === jenjang.value)?.jumlah ?? 0
);
const openSalin = () => {
  salinSumber.value = sumberOptions.value[0]?.value ?? '';
  salinGanti.value = false;
  salinError.value = null;
  salinOpen.value = true;
};
const jalankanSalin = async () => {
  salinError.value = null;
  const sumber = periodeTerisi.value.find((p) => sumberKey(p) === salinSumber.value);
  if (!sumber) {
    salinError.value = 'Pilih periode sumber';
    return;
  }
  salinSaving.value = true;
  try {
    const res = await angketDosenPertanyaanApi.salin({
      dariTahunAjaranId: sumber.tahunAjaranId,
      dariJenjang: sumber.jenjangPendidikan,
      keTahunAjaranId: Number(tahunAjaranId.value),
      keJenjang: jenjang.value,
      ganti: salinGanti.value,
    });
    toastSuccess(res.message);
    salinOpen.value = false;
    kategori.value = '';
    fetchData();
  } catch (err) {
    salinError.value = extractErrorMessage(err, 'Gagal menyalin pertanyaan');
  } finally {
    salinSaving.value = false;
  }
};

// ---- Daftar jawaban (skala nilai) ----
const jawabanItems = ref<AngketDosenJawaban[]>([]);
const jawabanLoading = ref(false);
const jawabanError = ref<string | null>(null);
const fetchJawaban = async () => {
  jawabanLoading.value = true;
  jawabanError.value = null;
  try {
    jawabanItems.value = await angketDosenPertanyaanApi.listJawaban();
  } catch (err) {
    jawabanError.value = extractErrorMessage(err, 'Gagal memuat jawaban');
  } finally {
    jawabanLoading.value = false;
  }
};

const jawabanFormOpen = ref(false);
const jawabanEditing = ref<AngketDosenJawaban | null>(null);
const jawabanForm = reactive({ jawaban: '', nilai: '' as string | number | null });
const jawabanErrors = reactive<Record<string, string>>({});
const jawabanFormError = ref<string | null>(null);
const jawabanSaving = ref(false);

const openJawabanForm = (row: AngketDosenJawaban | null = null) => {
  jawabanEditing.value = row;
  Object.keys(jawabanErrors).forEach((k) => delete jawabanErrors[k]);
  jawabanFormError.value = null;
  Object.assign(jawabanForm, { jawaban: row?.jawaban ?? '', nilai: row?.nilai ?? '' });
  jawabanFormOpen.value = true;
};

const simpanJawaban = async () => {
  Object.keys(jawabanErrors).forEach((k) => delete jawabanErrors[k]);
  jawabanFormError.value = null;
  if (!jawabanForm.jawaban.trim()) jawabanErrors.jawaban = 'Jawaban wajib diisi';
  const nilai = jawabanForm.nilai === '' || jawabanForm.nilai === null ? NaN : Number(jawabanForm.nilai);
  if (!Number.isInteger(nilai) || nilai < 0 || nilai > 100) jawabanErrors.nilai = 'Nilai wajib bilangan bulat 0–100';
  if (Object.keys(jawabanErrors).length) return;
  jawabanSaving.value = true;
  try {
    const payload = { jawaban: jawabanForm.jawaban.trim(), nilai };
    if (jawabanEditing.value) await angketDosenPertanyaanApi.updateJawaban(jawabanEditing.value.id, payload);
    else await angketDosenPertanyaanApi.createJawaban(payload);
    toastSuccess(jawabanEditing.value ? 'Jawaban diperbarui' : 'Jawaban ditambahkan');
    jawabanFormOpen.value = false;
    fetchJawaban();
  } catch (err) {
    jawabanFormError.value = extractErrorMessage(err, 'Gagal menyimpan jawaban');
  } finally {
    jawabanSaving.value = false;
  }
};

const jawabanDeleting = ref<AngketDosenJawaban | null>(null);
const jawabanDeleteLoading = ref(false);
const confirmDeleteJawaban = async () => {
  if (!jawabanDeleting.value) return;
  jawabanDeleteLoading.value = true;
  try {
    await angketDosenPertanyaanApi.removeJawaban(jawabanDeleting.value.id);
    toastSuccess('Jawaban dihapus');
    fetchJawaban();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus jawaban'));
  } finally {
    jawabanDeleteLoading.value = false;
    jawabanDeleting.value = null;
  }
};

// ---- Tambah / ubah ----
const formOpen = ref(false);
const editing = ref<AngketDosenPertanyaan | null>(null);
const form = reactive({ kategori: '', pertanyaan: '', openQuestion: false, urutan: '' as string | number | null });
const formErrors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const saving = ref(false);

const openForm = (row: AngketDosenPertanyaan | null = null) => {
  editing.value = row;
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  formError.value = null;
  Object.assign(form, {
    kategori: row ? (row.kategori ?? '') : kategori.value,
    pertanyaan: row?.pertanyaan ?? '',
    openQuestion: row?.openQuestion ?? false,
    urutan: row?.urutan ?? '',
  });
  formOpen.value = true;
};

const simpan = async () => {
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  formError.value = null;
  if (form.pertanyaan.trim().length < 3) formErrors.pertanyaan = 'Pertanyaan wajib diisi (minimal 3 karakter)';
  const urutan = form.urutan === '' || form.urutan === null ? null : Number(form.urutan);
  if (urutan !== null && (!Number.isInteger(urutan) || urutan < 0)) formErrors.urutan = 'Urutan harus bilangan bulat ≥ 0';
  if (Object.keys(formErrors).length) return;
  saving.value = true;
  try {
    const payload = { kategori: form.kategori.trim() || null, pertanyaan: form.pertanyaan.trim(), openQuestion: form.openQuestion, urutan };
    if (editing.value) await angketDosenPertanyaanApi.update(editing.value.id, payload);
    else await angketDosenPertanyaanApi.create({ ...payload, tahunAjaranId: Number(tahunAjaranId.value), jenjangPendidikan: jenjang.value });
    toastSuccess(editing.value ? 'Pertanyaan diperbarui' : 'Pertanyaan ditambahkan');
    formOpen.value = false;
    fetchData();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pertanyaan');
  } finally {
    saving.value = false;
  }
};

// ---- Hapus ----
const deleting = ref<AngketDosenPertanyaan | null>(null);
const deleteLoading = ref(false);
const confirmDelete = async () => {
  if (!deleting.value) return;
  deleteLoading.value = true;
  try {
    await angketDosenPertanyaanApi.remove(deleting.value.id);
    toastSuccess('Pertanyaan dihapus');
    fetchData();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus pertanyaan'));
  } finally {
    deleteLoading.value = false;
    deleting.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Pertanyaan Angket Dosen"
      subtitle="Master pertanyaan penilaian dosen oleh mahasiswa per periode akademik & tingkat pendidikan, serta pilihan jawabannya."
    />

    <section class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput v-model="tahunAjaranId" label="Periode Akademik" :options="tahunAjaranOptions" :clearable="false" placeholder="Pilih periode" />
        <SelectInput v-model="jenjang" label="Tk. Pendidikan" :options="jenjangSelectOptions" :clearable="false" placeholder="Pilih tingkat pendidikan" />
        <SelectInput v-model="kategori" label="Kategori" :options="kategoriSelectOptions" placeholder="Semua Kategori" />
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-[#059669] rounded-lg overflow-hidden">
      <div class="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-title-md font-semibold text-on-surface">
            Daftar Pertanyaan <span class="text-body-sm font-normal text-on-surface-variant">({{ items.length }} pertanyaan)</span>
          </h2>
          <p class="text-label-sm text-on-surface-variant">{{ periodeLabel }} · {{ jenjang || '-' }}<template v-if="kategori"> · {{ kategori }}</template></p>
        </div>
        <div class="flex gap-2">
          <AppButton v-if="canCreate" variant="secondary" icon="content_copy" :disabled="!siap" @click="openSalin">Salin Data</AppButton>
          <AppButton v-if="canCreate" icon="add" :disabled="!siap" @click="openForm()">Tambah</AppButton>
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-body-sm">
          <thead class="bg-primary text-on-primary text-label-md">
            <tr>
              <th class="px-3 py-2.5 w-16 text-center">No.</th>
              <th class="px-3 py-2.5 text-center">Pertanyaan</th>
              <th class="px-3 py-2.5 w-44 text-center">Kategori</th>
              <th class="px-3 py-2.5 w-28 text-center">Open Question</th>
              <th v-if="canUpdate || canDelete" class="px-3 py-2.5 w-24 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="p-6 text-center text-on-surface-variant">Memuat...</td>
            </tr>
            <tr v-else-if="!items.length">
              <td colspan="5" class="p-6 text-center text-on-surface-variant">
                Belum ada pertanyaan untuk pilihan ini.
                <template v-if="canCreate && !kategori">Klik <strong>Tambah</strong> atau <strong>Salin Data</strong> dari periode lain.</template>
              </td>
            </tr>
            <template v-else>
              <tr v-for="(p, i) in items" :key="p.id" class="border-t border-outline-variant even:bg-surface-container-low">
                <td class="px-3 py-2.5 text-right tabular-nums">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 text-on-surface">{{ p.pertanyaan }}</td>
                <td class="px-3 py-2.5 text-on-surface-variant">{{ p.kategori ?? '-' }}</td>
                <td class="px-3 py-2.5 text-center">
                  <span class="material-symbols-outlined" :class="p.openQuestion ? 'text-[#059669]' : 'text-error'" style="font-size: 20px">
                    {{ p.openQuestion ? 'check' : 'close' }}
                  </span>
                </td>
                <td v-if="canUpdate || canDelete" class="px-3 py-2.5">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      v-if="canUpdate"
                      type="button"
                      class="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center hover:opacity-90"
                      title="Ubah"
                      @click="openForm(p)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 16px">edit</span>
                    </button>
                    <button
                      v-if="canDelete"
                      type="button"
                      class="w-7 h-7 rounded bg-error text-on-error flex items-center justify-center hover:opacity-90"
                      title="Hapus"
                      @click="deleting = p"
                    >
                      <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mt-6 bg-surface-container-lowest border border-outline-variant border-t-2 border-t-[#059669] rounded-lg overflow-hidden">
      <div class="p-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-title-md font-semibold text-on-surface">
          Daftar Jawaban
          <span class="text-body-sm font-normal text-on-surface-variant">— pilihan skala untuk pertanyaan yang bukan open question</span>
        </h2>
        <AppButton v-if="canCreate" icon="add" @click="openJawabanForm()">Tambah</AppButton>
      </div>

      <div v-if="jawabanError" class="p-4 text-body-sm text-error bg-error-container">{{ jawabanError }}</div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-body-sm">
          <thead class="bg-primary text-on-primary text-label-md">
            <tr>
              <th class="px-3 py-2.5 w-16 text-center">No.</th>
              <th class="px-3 py-2.5 text-center">Jawaban</th>
              <th class="px-3 py-2.5 w-24 text-center">Nilai</th>
              <th v-if="canUpdate || canDelete" class="px-3 py-2.5 w-24 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="jawabanLoading">
              <td colspan="4" class="p-6 text-center text-on-surface-variant">Memuat...</td>
            </tr>
            <tr v-else-if="!jawabanItems.length">
              <td colspan="4" class="p-6 text-center text-on-surface-variant">Belum ada pilihan jawaban.</td>
            </tr>
            <template v-else>
              <tr v-for="(j, i) in jawabanItems" :key="j.id" class="border-t border-outline-variant even:bg-surface-container-low">
                <td class="px-3 py-2.5 text-right tabular-nums">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 text-on-surface">{{ j.jawaban }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ j.nilai }}</td>
                <td v-if="canUpdate || canDelete" class="px-3 py-2.5">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      v-if="canUpdate"
                      type="button"
                      class="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center hover:opacity-90"
                      title="Ubah"
                      @click="openJawabanForm(j)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 16px">edit</span>
                    </button>
                    <button
                      v-if="canDelete"
                      type="button"
                      class="w-7 h-7 rounded bg-error text-on-error flex items-center justify-center hover:opacity-90"
                      title="Hapus"
                      @click="jawabanDeleting = j"
                    >
                      <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-model="jawabanFormOpen" :title="jawabanEditing ? 'Ubah Jawaban' : 'Tambah Jawaban'" size="md">
      <form class="space-y-4" @submit.prevent="simpanJawaban">
        <div v-if="jawabanFormError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ jawabanFormError }}</div>
        <TextInput v-model="jawabanForm.jawaban" label="Jawaban" required placeholder="mis. Sangat baik" :error="jawabanErrors.jawaban" />
        <TextInput
          v-model="jawabanForm.nilai"
          type="number"
          min="0"
          max="100"
          label="Nilai"
          required
          :error="jawabanErrors.nilai"
          hint="Nilai tidak boleh sama dengan jawaban lain"
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="jawabanFormOpen = false">Batal</AppButton>
        <AppButton :disabled="jawabanSaving" @click="simpanJawaban">{{ jawabanSaving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!jawabanDeleting"
      title="Hapus Jawaban"
      :message="`Hapus jawaban &quot;${jawabanDeleting?.jawaban ?? ''}&quot; (nilai ${jawabanDeleting?.nilai ?? ''})?`"
      :loading="jawabanDeleteLoading"
      @confirm="confirmDeleteJawaban"
      @cancel="jawabanDeleting = null"
    />

    <Modal v-model="formOpen" :title="editing ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan'" :subtitle="`${periodeLabel} · ${jenjang}`" size="md">
      <form class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <!-- Input biasa (bukan TextInput) supaya atribut list/datalist sampai ke elemen input. -->
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-1">Kategori</span>
          <input
            v-model="form.kategori"
            list="kategori-angket-dosen"
            maxlength="100"
            placeholder="mis. Materi Pembelajaran — pilih yang ada atau ketik baru"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <datalist id="kategori-angket-dosen">
            <option v-for="k in kategoriOptions" :key="k" :value="k" />
          </datalist>
        </label>
        <TextareaInput v-model="form.pertanyaan" label="Pertanyaan" required :rows="3" :error="formErrors.pertanyaan" />
        <CheckboxToggle v-model="form.openQuestion" label="Open Question" description="Mahasiswa menjawab dengan isian bebas, bukan skala nilai" />
        <TextInput v-model="form.urutan" type="number" min="0" label="Urutan" :error="formErrors.urutan" hint="Kosongkan untuk menaruh di urutan terakhir" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <Modal v-model="salinOpen" title="Salin Data Pertanyaan" :subtitle="`Tujuan: ${periodeLabel} · ${jenjang}`" size="md">
      <div class="space-y-4">
        <div v-if="salinError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ salinError }}</div>
        <p v-if="!sumberOptions.length" class="text-body-sm text-on-surface-variant">Belum ada periode lain yang memiliki pertanyaan.</p>
        <template v-else>
          <SelectInput v-model="salinSumber" label="Salin dari" :options="sumberOptions" :clearable="false" />
          <CheckboxToggle
            v-model="salinGanti"
            label="Ganti pertanyaan yang sudah ada"
            :description="jumlahTujuan ? `${jumlahTujuan} pertanyaan di tujuan akan dihapus lalu diganti` : 'Tujuan masih kosong'"
          />
          <p v-if="!salinGanti && jumlahTujuan" class="text-label-sm text-on-surface-variant">
            Tanpa centang, pertanyaan sumber ditambahkan di belakang {{ jumlahTujuan }} pertanyaan yang sudah ada.
          </p>
        </template>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="salinOpen = false">Batal</AppButton>
        <AppButton :disabled="salinSaving || !sumberOptions.length" @click="jalankanSalin">{{ salinSaving ? 'Menyalin...' : 'Salin' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleting"
      title="Hapus Pertanyaan"
      :message="`Hapus pertanyaan &quot;${deleting?.pertanyaan ?? ''}&quot;?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>
