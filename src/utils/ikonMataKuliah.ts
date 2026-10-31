/**
 * Tema ilustrasi mata kuliah (kartu kelas E-learning). Mata kuliah bisa memilih tema (kolom mata_kuliah.ikon = key);
 * bila kosong, tema ditebak dari kata kunci nama mata kuliah, lalu jatuh ke tema cadangan yang konsisten per nama.
 * Daftar tema disusun mengikuti mata kuliah yang ada di DB (Informatika, Farmasi, Administrasi Rumah Sakit, Logistik, ...).
 */
export interface TemaIkon {
  key: string;
  label: string;
  /** Kata kunci, dicocokkan di awal kata (mis. 'ios' tidak cocok dengan "Biostatistika"). */
  kunci: string[];
  utama: string;
  kecil: [string, string];
  dari: string;
  ke: string;
}

// Urutan penting untuk tebakan otomatis: topik yang lebih spesifik di atas, lingkup umum (rumah sakit, kesehatan) di bawah.
export const TEMA_IKON: TemaIkon[] = [
  // Teknologi informasi
  { key: 'iot', label: 'IoT', kunci: ['iot', 'internet of things', 'embedded', 'sensor'], utama: 'sensors', kecil: ['developer_board', 'wifi'], dari: '#0e7490', ke: '#22d3ee' },
  { key: 'game', label: 'Game', kunci: ['game', 'gim'], utama: 'sports_esports', kecil: ['stadia_controller', 'star'], dari: '#9333ea', ke: '#f472b6' },
  { key: 'database', label: 'Basis Data', kunci: ['basis data', 'database', 'sql', 'data mining', 'big data'], utama: 'database', kecil: ['table_chart', 'search'], dari: '#0369a1', ke: '#38bdf8' },
  { key: 'jaringan', label: 'Jaringan', kunci: ['jaringan', 'network', 'keamanan', 'cyber', 'cloud'], utama: 'lan', kecil: ['wifi', 'router'], dari: '#0f766e', ke: '#5eead4' },
  { key: 'web', label: 'Web', kunci: ['web', 'html', 'internet', 'front', 'backend'], utama: 'language', kecil: ['code', 'html'], dari: '#4338ca', ke: '#818cf8' },
  { key: 'mobile', label: 'Mobile', kunci: ['mobile', 'android', 'ios'], utama: 'smartphone', kecil: ['apps', 'touch_app'], dari: '#1d4ed8', ke: '#93c5fd' },
  { key: 'ai', label: 'Kecerdasan Buatan', kunci: ['kecerdasan', 'artificial', 'machine learning', 'robot'], utama: 'smart_toy', kecil: ['psychology', 'neurology'], dari: '#7e22ce', ke: '#f0abfc' },
  { key: 'pemrograman', label: 'Pemrograman', kunci: ['pemrograman', 'algoritma', 'objek', 'coding', 'struktur data'], utama: 'code_blocks', kecil: ['terminal', 'bug_report'], dari: '#6d28d9', ke: '#c4b5fd' },
  { key: 'sistem', label: 'Sistem Informasi', kunci: ['analisis dan perancangan', 'perancangan sistem', 'rekayasa', 'sistem informasi', 'sim '], utama: 'account_tree', kecil: ['schema', 'dashboard'], dari: '#1e3a8a', ke: '#60a5fa' },
  { key: 'desain', label: 'Desain & Grafika', kunci: ['grafika', 'grafis', 'citra', 'desain', 'design', 'multimedia', 'animasi', 'ui', 'ux'], utama: 'palette', kecil: ['brush', 'image'], dari: '#db2777', ke: '#fdba74' },
  { key: 'audiovisual', label: 'Audio Visual', kunci: ['audio', 'visual', 'video', 'film', 'fotografi', 'broadcast'], utama: 'movie', kecil: ['music_note', 'videocam'], dari: '#b91c1c', ke: '#fbbf24' },
  // Umum & dasar
  { key: 'bahasa', label: 'Bahasa', kunci: ['inggris', 'english', 'bahasa', 'jepang', 'mandarin', 'arab'], utama: 'translate', kecil: ['chat', 'record_voice_over'], dari: '#be123c', ke: '#fda4af' },
  { key: 'statistik', label: 'Statistika', kunci: ['statistik', 'biostatistik', 'probabilitas'], utama: 'bar_chart', kecil: ['query_stats', 'percent'], dari: '#166534', ke: '#4ade80' },
  { key: 'matematika', label: 'Matematika', kunci: ['matematika', 'kalkulus', 'aljabar', 'diskrit', 'numerik', 'logika'], utama: 'functions', kecil: ['calculate', 'percent'], dari: '#15803d', ke: '#86efac' },
  // Farmasi & sains
  { key: 'herbal', label: 'Tumbuhan & Herbal', kunci: ['tumbuhan', 'fitoterapi', 'fitokimia', 'farmakognosi', 'bahan alam', 'herbal', 'botani'], utama: 'eco', kecil: ['local_florist', 'spa'], dari: '#3f6212', ke: '#bef264' },
  { key: 'sediaan', label: 'Sediaan & Kosmetik', kunci: ['sediaan', 'kosmetik', 'farmasetika', 'steril'], utama: 'medication_liquid', kecil: ['science', 'spa'], dari: '#0f766e', ke: '#f9a8d4' },
  { key: 'klinik', label: 'Farmasi Klinik', kunci: ['klinik', 'farmakokinetik', 'farmakoterapi', 'swamedikasi', 'terapi'], utama: 'clinical_notes', kecil: ['medication', 'monitor_heart'], dari: '#0891b2', ke: '#a5f3fc' },
  { key: 'mikrobiologi', label: 'Mikrobiologi', kunci: ['mikrobiologi', 'parasitologi', 'virologi', 'bakteri'], utama: 'coronavirus', kecil: ['biotech', 'search'], dari: '#4d7c0f', ke: '#d9f99d' },
  { key: 'kimia', label: 'Kimia', kunci: ['kimia', 'biokimia'], utama: 'science', kecil: ['experiment', 'water_drop'], dari: '#065f46', ke: '#5eead4' },
  { key: 'sains', label: 'Sains', kunci: ['fisika', 'biologi', 'sains'], utama: 'biotech', kecil: ['science', 'experiment'], dari: '#047857', ke: '#6ee7b7' },
  { key: 'anatomi', label: 'Anatomi & Fisiologi', kunci: ['anatomi', 'fisiologi manusia'], utama: 'accessibility_new', kecil: ['monitor_heart', 'neurology'], dari: '#be185d', ke: '#fbcfe8' },
  // Kesehatan & rumah sakit
  { key: 'rekammedis', label: 'Rekam Medis', kunci: ['rekam medis', 'mrm', 'casemix', 'terminologi', 'spesialite', 'pendaftaran pasien'], utama: 'folder_shared', kecil: ['description', 'edit_note'], dari: '#0369a1', ke: '#7dd3fc' },
  { key: 'gizi', label: 'Gizi', kunci: ['gizi', 'nutrisi', 'diet'], utama: 'restaurant', kecil: ['nutrition', 'egg'], dari: '#ca8a04', ke: '#bef264' },
  { key: 'k3', label: 'K3 & Keselamatan', kunci: ['keselamatan kerja', 'kesehatan keselamatan', 'k3'], utama: 'health_and_safety', kecil: ['engineering', 'warning'], dari: '#c2410c', ke: '#fde047' },
  { key: 'lingkungan', label: 'Lingkungan & Sanitasi', kunci: ['lingkungan', 'limbah', 'sanitasi', 'infeksi'], utama: 'recycling', kecil: ['eco', 'water_drop'], dari: '#15803d', ke: '#a7f3d0' },
  { key: 'mutu', label: 'Mutu & Akreditasi', kunci: ['mutu', 'quality', 'akreditasi', 'standarisasi', 'evaluasi kinerja', 'resiko', 'risiko'], utama: 'workspace_premium', kecil: ['verified', 'checklist'], dari: '#a16207', ke: '#fef08a' },
  { key: 'asuransi', label: 'Asuransi & Jaminan', kunci: ['asuransi', 'jaminan', 'bpjs', 'jkn', 'billing', 'klaim'], utama: 'verified_user', kecil: ['receipt_long', 'shield'], dari: '#1d4ed8', ke: '#bfdbfe' },
  { key: 'kesmas', label: 'Kesehatan Masyarakat', kunci: ['kesehatan masyarakat', 'epidemiologi', 'promosi kesehatan', 'pkm', 'ukm', 'puskesmas'], utama: 'diversity_3', kecil: ['campaign', 'favorite'], dari: '#0f766e', ke: '#99f6e4' },
  { key: 'farmasi', label: 'Farmasi', kunci: ['farmasi', 'kefarmasian', 'farmako', 'obat', 'apotek', 'perapotekan'], utama: 'medication', kecil: ['vaccines', 'science'], dari: '#059669', ke: '#a7f3d0' },
  // Logistik
  { key: 'ekspor', label: 'Ekspor-Impor & Kepabeanan', kunci: ['ekspor', 'impor', 'kepabeanan', 'freight', 'bea cukai', 'pelabuhan'], utama: 'directions_boat', kecil: ['public', 'flight'], dari: '#075985', ke: '#7dd3fc' },
  { key: 'gudang', label: 'Pergudangan & Persediaan', kunci: ['gudang', 'pergudangan', 'persediaan', 'material', 'pengemas', 'pengadaan', 'aset', 'inventori'], utama: 'warehouse', kecil: ['inventory_2', 'qr_code_scanner'], dari: '#9a3412', ke: '#fdba74' },
  { key: 'rantaipasok', label: 'Distribusi & Rantai Pasok', kunci: ['rantai pasok', 'supply', 'distribusi'], utama: 'hub', kecil: ['route', 'local_shipping'], dari: '#b45309', ke: '#fde68a' },
  { key: 'logistik', label: 'Logistik & Transportasi', kunci: ['logistik', 'transportasi'], utama: 'local_shipping', kecil: ['inventory_2', 'route'], dari: '#c2410c', ke: '#fdba74' },
  { key: 'bahaya', label: 'Barang Berbahaya', kunci: ['berbahaya', 'bahaya', 'b3', 'hazard'], utama: 'warning', kecil: ['local_fire_department', 'science'], dari: '#b91c1c', ke: '#fdba74' },
  // Bisnis & administrasi
  { key: 'akuntansi', label: 'Akuntansi & Pajak', kunci: ['akuntansi', 'pajak', 'perpajakan', 'myob'], utama: 'receipt_long', kecil: ['calculate', 'request_quote'], dari: '#92400e', ke: '#fcd34d' },
  { key: 'pemasaran', label: 'Pemasaran & E-Commerce', kunci: ['pemasaran', 'marketing', 'e-commerce', 'commerce', 'sosial media', 'social media'], utama: 'storefront', kecil: ['shopping_cart', 'trending_up'], dari: '#c026d3', ke: '#fbcfe8' },
  { key: 'pelayanan', label: 'Pelayanan Pelanggan', kunci: ['pelayanan prima', 'customer', 'pelanggan', 'handling', 'komplain', 'crm'], utama: 'support_agent', kecil: ['sentiment_satisfied', 'forum'], dari: '#db2777', ke: '#fda4af' },
  { key: 'bisnis', label: 'Bisnis & Keuangan', kunci: ['keuangan', 'ekonomi', 'bisnis', 'kewirausahaan', 'wirausaha'], utama: 'payments', kecil: ['trending_up', 'savings'], dari: '#b45309', ke: '#fcd34d' },
  { key: 'sdm', label: 'SDM & Kepegawaian', kunci: ['sumber daya manusia', 'sdm', 'kepegawaian', 'pelatihan'], utama: 'badge', kecil: ['groups', 'school'], dari: '#7c2d12', ke: '#fdba74' },
  { key: 'perkantoran', label: 'Perkantoran & Arsip', kunci: ['perkantoran', 'kearsipan', 'arsip', 'korespondensi', 'sekretaris'], utama: 'folder_open', kecil: ['mail', 'description'], dari: '#475569', ke: '#cbd5e1' },
  { key: 'operasional', label: 'Operasional', kunci: ['operasi', 'operasional', 'produksi'], utama: 'precision_manufacturing', kecil: ['settings', 'speed'], dari: '#3f3f46', ke: '#a1a1aa' },
  { key: 'komputer', label: 'Perangkat Komputer', kunci: ['organisasi komputer', 'arsitektur', 'sistem operasi', 'komputer', 'hardware', 'elektronika', 'mikro'], utama: 'memory', kecil: ['developer_board', 'settings'], dari: '#334155', ke: '#94a3b8' },
  { key: 'komunikasi', label: 'Komunikasi', kunci: ['komunikasi', 'humas', 'hubungan masyarakat', 'public', 'jurnalistik'], utama: 'campaign', kecil: ['forum', 'mic'], dari: '#ea580c', ke: '#fed7aa' },
  // Karakter, hukum, akhir studi
  { key: 'kewarganegaraan', label: 'Pancasila & Agama', kunci: ['pancasila', 'kewarganegaraan', 'agama'], utama: 'flag', kecil: ['menu_book', 'diversity_1'], dari: '#991b1b', ke: '#fca5a5' },
  { key: 'hukum', label: 'Etika & Hukum', kunci: ['etika', 'hukum', 'profesi', 'regulasi', 'perundang', 'uu', 'perizinan'], utama: 'balance', kecil: ['menu_book', 'gavel'], dari: '#78350f', ke: '#d6a46b' },
  { key: 'karakter', label: 'Karakter & Pengembangan Diri', kunci: ['karakter', 'pengembangan diri', 'kepribadian', 'soft skill'], utama: 'self_improvement', kecil: ['favorite', 'emoji_objects'], dari: '#6d28d9', ke: '#fbcfe8' },
  { key: 'riset', label: 'Riset & Penelitian', kunci: ['metodologi', 'metode penelitian', 'penelitian', 'riset'], utama: 'biotech', kecil: ['search', 'lightbulb'], dari: '#1e40af', ke: '#93c5fd' },
  { key: 'magang', label: 'Magang', kunci: ['magang', 'kerja praktek', 'praktik kerja', 'pkl'], utama: 'work', kecil: ['handshake', 'apartment'], dari: '#0f766e', ke: '#fcd34d' },
  { key: 'tugasakhir', label: 'Tugas Akhir', kunci: ['tugas akhir', 'skripsi', 'karya tulis'], utama: 'history_edu', kecil: ['school', 'star'], dari: '#312e81', ke: '#c4b5fd' },
  { key: 'proyek', label: 'Proyek', kunci: ['proyek', 'project'], utama: 'rocket_launch', kecil: ['flag', 'lightbulb'], dari: '#1e40af', ke: '#a5b4fc' },
  { key: 'manajemen', label: 'Manajemen', kunci: ['manajemen', 'administrasi', 'organisasi', 'kepemimpinan'], utama: 'insights', kecil: ['groups', 'task_alt'], dari: '#a16207', ke: '#fde68a' },
  { key: 'rumahsakit', label: 'Rumah Sakit', kunci: ['rumah sakit', 'rs', 'pasien'], utama: 'local_hospital', kecil: ['bed', 'stethoscope'], dari: '#dc2626', ke: '#fecaca' },
  { key: 'kesehatan', label: 'Kesehatan', kunci: ['kesehatan', 'medis', 'keperawatan'], utama: 'medical_services', kecil: ['monitor_heart', 'health_and_safety'], dari: '#0d9488', ke: '#99f6e4' },
  // Cadangan (tanpa kata kunci)
  { key: 'umum', label: 'Umum', kunci: [], utama: 'auto_stories', kecil: ['school', 'lightbulb'], dari: '#8a6d2b', ke: '#e9c97a' },
  { key: 'kelas', label: 'Kelas', kunci: [], utama: 'school', kecil: ['menu_book', 'star'], dari: '#0e7490', ke: '#67e8f9' },
  { key: 'daring', label: 'Kelas Daring', kunci: [], utama: 'cast_for_education', kecil: ['edit_note', 'lightbulb'], dari: '#4f46e5', ke: '#a5b4fc' },
];
const CADANGAN = ['umum', 'kelas', 'daring'];

/** Kata kunci cocok bila muncul di awal kata (huruf/angka sebelumnya tidak boleh menempel). */
const cocokKunci = (nama: string, kunci: string) => {
  let i = nama.indexOf(kunci);
  while (i !== -1) {
    if (i === 0 || !/[a-z0-9]/.test(nama[i - 1])) return true;
    i = nama.indexOf(kunci, i + 1);
  }
  return false;
};

/** Tema ditebak dari nama (tanpa memperhatikan pilihan manual). */
export const temaOtomatis = (nama: string, kode?: string | null): TemaIkon => {
  const n = `${nama.toLowerCase()} `;
  const cocok = TEMA_IKON.find((t) => t.kunci.some((k) => cocokKunci(n, k)));
  if (cocok) return cocok;
  const hash = [...`${kode ?? ''}${nama}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return TEMA_IKON.find((t) => t.key === CADANGAN[hash % CADANGAN.length])!;
};

/** Tema yang dipakai: pilihan manual (ikon) bila valid, selain itu tebakan otomatis. */
export const temaIkon = (nama: string, kode?: string | null, ikon?: string | null): TemaIkon =>
  (ikon && TEMA_IKON.find((t) => t.key === ikon)) || temaOtomatis(nama, kode);
