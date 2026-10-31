import * as XLSX from 'xlsx';
import type { Member, Family, Rayon, CategorialGroup } from '../types/index.ts';
import {
  STANDARD_EDUCATION_OPTIONS,
  STANDARD_OCCUPATION_OPTIONS,
} from '../types/index.ts';

export interface ParsedImportRow {
  // Family Info
  familyCardNo: string;
  headOfFamilyName: string;
  familyRole: string;

  // Member Info
  fullName: string;
  nickname?: string;
  nik?: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  address: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  phone: string;
  email?: string;
  maritalStatus: 'Belum Menikah' | 'Menikah' | 'Duda' | 'Janda';
  spouseName?: string;
  rayonId: string;
  rayonName?: string;
  categorialGroupId: string;
  categorialGroupName?: string;
  membershipStatus: 'Tetap' | 'Tamu' | 'Titipan';
  baptismStatus: 'Sudah' | 'Belum';
  baptismDate?: string;
  confirmationStatus: 'Sudah' | 'Belum';
  confirmationDate?: string;
  marriageChurchStatus: 'Sudah' | 'Belum';
  marriageDate?: string;
  education?: string;
  occupation?: string;
  status: 'Aktif' | 'Pindah' | 'Meninggal';
  notes?: string;

  // Validation
  isValid: boolean;
  errors: string[];
}

export interface DetectedFamilyGroup {
  familyNo: string;
  headOfFamilyName: string;
  address: string;
  rayonId: string;
  rayonName: string;
  phone: string;
  members: ParsedImportRow[];
  isNew: boolean;
}

/**
 * Normalizes date to YYYY-MM-DD format from Excel serial number or string
 */
export function normalizeExcelDate(value: any): string {
  if (value === null || value === undefined || value === '') return '';

  // If number (Excel date serial)
  if (typeof value === 'number') {
    // Excel base date offset
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(value).trim();
  if (!str) return '';

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * Resolves Rayon by Name, Code, or ID
 */
export function resolveRayon(value: string, rayons: Rayon[]): { id: string; name: string } {
  if (!value || rayons.length === 0) {
    return { id: rayons[0]?.id || 'r1', name: rayons[0]?.name || 'Rayon I' };
  }
  const clean = value.trim().toLowerCase();

  // Match exact ID or Code
  const matchId = rayons.find((r) => r.id.toLowerCase() === clean || r.code.toLowerCase() === clean);
  if (matchId) return { id: matchId.id, name: matchId.name };

  // Match Name
  const matchName = rayons.find((r) => r.name.toLowerCase() === clean);
  if (matchName) return { id: matchName.id, name: matchName.name };

  // Match numbers (e.g. "1" or "rayon 1" or "rayon i")
  if (clean.includes('1') || clean.includes('i') && !clean.includes('ii') && !clean.includes('iv')) {
    const r1 = rayons.find((r) => r.name.includes('I') || r.code.includes('01'));
    if (r1) return { id: r1.id, name: r1.name };
  }
  if (clean.includes('2') || clean.includes('ii') && !clean.includes('iii')) {
    const r2 = rayons.find((r) => r.name.includes('II') || r.code.includes('02'));
    if (r2) return { id: r2.id, name: r2.name };
  }
  if (clean.includes('3') || clean.includes('iii')) {
    const r3 = rayons.find((r) => r.name.includes('III') || r.code.includes('03'));
    if (r3) return { id: r3.id, name: r3.name };
  }
  if (clean.includes('4') || clean.includes('iv')) {
    const r4 = rayons.find((r) => r.name.includes('IV') || r.code.includes('04'));
    if (r4) return { id: r4.id, name: r4.name };
  }

  return { id: rayons[0]?.id || 'r1', name: rayons[0]?.name || 'Rayon I' };
}

/**
 * Resolves Categorial Group by Name, Code, or Age
 */
export function resolveCategorial(
  value: string,
  birthDate: string,
  gender: string,
  categorials: CategorialGroup[]
): { id: string; name: string } {
  const clean = String(value || '').trim().toLowerCase();

  if (clean) {
    const direct = categorials.find(
      (c) =>
        c.id.toLowerCase() === clean ||
        c.code.toLowerCase() === clean ||
        c.name.toLowerCase().includes(clean)
    );
    if (direct) return { id: direct.id, name: direct.name };
  }

  // Automatic estimation by age & gender if not specified
  let age = 30;
  if (birthDate) {
    const birth = new Date(birthDate);
    if (!isNaN(birth.getTime())) {
      age = new Date().getFullYear() - birth.getFullYear();
    }
  }

  if (age <= 15) {
    const par = categorials.find((c) => c.code === 'PAR');
    if (par) return { id: par.id, name: par.name };
  } else if (age <= 30) {
    const pemuda = categorials.find((c) => c.code === 'PEMUDA');
    if (pemuda) return { id: pemuda.id, name: pemuda.name };
  } else if (age >= 60) {
    const lansia = categorials.find((c) => c.code === 'LANSIA');
    if (lansia) return { id: lansia.id, name: lansia.name };
  } else {
    if (gender === 'Perempuan') {
      const pkp = categorials.find((c) => c.code === 'PKP');
      if (pkp) return { id: pkp.id, name: pkp.name };
    } else {
      const pkb = categorials.find((c) => c.code === 'PKB');
      if (pkb) return { id: pkb.id, name: pkb.name };
    }
  }

  return { id: categorials[0]?.id || 'c1', name: categorials[0]?.name || 'PAR' };
}

/**
 * Normalizes header keys to standard lowercase alphanumeric
 */
function cleanKey(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Generates official Excel Template (.xlsx) matching GMIT Betel Fuimelang database
 */
export function createExcelTemplateWorkbook(rayons: Rayon[], categorials: CategorialGroup[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Headers for Sheet 1
  const headers = [
    'No_KK',
    'Nama_Kepala_Keluarga',
    'Hubungan_Keluarga',
    'Nama_Lengkap',
    'Nama_Panggilan',
    'NIK',
    'Jenis_Kelamin',
    'Tempat_Lahir',
    'Tanggal_Lahir',
    'Alamat',
    'Desa_Kelurahan',
    'Kecamatan',
    'Kabupaten',
    'No_Telepon_HP',
    'Status_Pernikahan',
    'Nama_Suami_Istri',
    'Rayon',
    'Kategorial',
    'Status_Keanggotaan',
    'Status_Baptis',
    'Tanggal_Baptis',
    'Status_Sidi',
    'Tanggal_Sidi',
    'Status_Nikah_Gereja',
    'Tanggal_Nikah_Gereja',
    'Pendidikan_Terakhir',
    'Pekerjaan',
    'Status_Jiwa',
    'Catatan',
  ];

  // Example pre-filled rows representing real GMIT families
  const exampleRows = [
    {
      No_KK: 'KK-BF-001',
      Nama_Kepala_Keluarga: 'Yulius Banamtuan',
      Hubungan_Keluarga: 'Kepala Keluarga',
      Nama_Lengkap: 'Yulius Banamtuan',
      Nama_Panggilan: 'Yulius',
      NIK: '5305011405800001',
      Jenis_Kelamin: 'Laki-laki',
      Tempat_Lahir: 'Fuimelang',
      Tanggal_Lahir: '1980-05-14',
      Alamat: 'RT 01 / RW 01 Desa Lembur Tengah',
      Desa_Kelurahan: 'Lembur Tengah',
      Kecamatan: 'Alor Tengah Utara',
      Kabupaten: 'Alor',
      No_Telepon_HP: '081234567891',
      Status_Pernikahan: 'Menikah',
      Nama_Suami_Istri: 'Maria Banamtuan-Kase',
      Rayon: 'Rayon I',
      Kategorial: 'PKB',
      Status_Keanggotaan: 'Tetap',
      Status_Baptis: 'Sudah',
      Tanggal_Baptis: '1980-08-20',
      Status_Sidi: 'Sudah',
      Tanggal_Sidi: '1998-10-31',
      Status_Nikah_Gereja: 'Sudah',
      Tanggal_Nikah_Gereja: '2005-09-12',
      Pendidikan_Terakhir: 'SLTA / SMA / SMK / MA / Sederajat',
      Pekerjaan: 'Petani / Pekebun',
      Status_Jiwa: 'Aktif',
      Catatan: 'Keluarga Banamtuan - RT 01',
    },
    {
      No_KK: 'KK-BF-001',
      Nama_Kepala_Keluarga: 'Yulius Banamtuan',
      Hubungan_Keluarga: 'Istri',
      Nama_Lengkap: 'Maria Banamtuan-Kase',
      Nama_Panggilan: 'Maria',
      NIK: '5305015208830002',
      Jenis_Kelamin: 'Perempuan',
      Tempat_Lahir: 'Kalabahi',
      Tanggal_Lahir: '1983-08-12',
      Alamat: 'RT 01 / RW 01 Desa Lembur Tengah',
      Desa_Kelurahan: 'Lembur Tengah',
      Kecamatan: 'Alor Tengah Utara',
      Kabupaten: 'Alor',
      No_Telepon_HP: '081234567892',
      Status_Pernikahan: 'Menikah',
      Nama_Suami_Istri: 'Yulius Banamtuan',
      Rayon: 'Rayon I',
      Kategorial: 'PKP',
      Status_Keanggotaan: 'Tetap',
      Status_Baptis: 'Sudah',
      Tanggal_Baptis: '1983-11-15',
      Status_Sidi: 'Sudah',
      Tanggal_Sidi: '2000-10-31',
      Status_Nikah_Gereja: 'Sudah',
      Tanggal_Nikah_Gereja: '2005-09-12',
      Pendidikan_Terakhir: 'Diploma IV / Strata I (D4 / S1)',
      Pekerjaan: 'Guru / Tenaga Pendidik',
      Status_Jiwa: 'Aktif',
      Catatan: 'Pengurus PKP Rayon I',
    },
    {
      No_KK: 'KK-BF-001',
      Nama_Kepala_Keluarga: 'Yulius Banamtuan',
      Hubungan_Keluarga: 'Anak',
      Nama_Lengkap: 'Daniel Banamtuan',
      Nama_Panggilan: 'Daniel',
      NIK: '5305011003100003',
      Jenis_Kelamin: 'Laki-laki',
      Tempat_Lahir: 'Fuimelang',
      Tanggal_Lahir: '2010-03-10',
      Alamat: 'RT 01 / RW 01 Desa Lembur Tengah',
      Desa_Kelurahan: 'Lembur Tengah',
      Kecamatan: 'Alor Tengah Utara',
      Kabupaten: 'Alor',
      No_Telepon_HP: '',
      Status_Pernikahan: 'Belum Menikah',
      Nama_Suami_Istri: '',
      Rayon: 'Rayon I',
      Kategorial: 'PAR',
      Status_Keanggotaan: 'Tetap',
      Status_Baptis: 'Sudah',
      Tanggal_Baptis: '2010-06-05',
      Status_Sidi: 'Belum',
      Tanggal_Sidi: '',
      Status_Nikah_Gereja: 'Belum',
      Tanggal_Nikah_Gereja: '',
      Pendidikan_Terakhir: 'SLTP / SMP / MTs / Sederajat',
      Pekerjaan: 'Pelajar / Mahasiswa',
      Status_Jiwa: 'Aktif',
      Catatan: 'Anak Pertama',
    },
    {
      No_KK: 'KK-BF-002',
      Nama_Kepala_Keluarga: 'Johanis Lopo',
      Hubungan_Keluarga: 'Kepala Keluarga',
      Nama_Lengkap: 'Johanis Lopo',
      Nama_Panggilan: 'Johanis',
      NIK: '5305012211750004',
      Jenis_Kelamin: 'Laki-laki',
      Tempat_Lahir: 'Liku',
      Tanggal_Lahir: '1975-11-22',
      Alamat: 'Kompleks SD Betel, RT 03 Desa Lembur Tengah',
      Desa_Kelurahan: 'Lembur Tengah',
      Kecamatan: 'Alor Tengah Utara',
      Kabupaten: 'Alor',
      No_Telepon_HP: '082144556677',
      Status_Pernikahan: 'Menikah',
      Nama_Suami_Istri: 'Sarah Lopo-Mone',
      Rayon: 'Rayon II',
      Kategorial: 'PKB',
      Status_Keanggotaan: 'Tetap',
      Status_Baptis: 'Sudah',
      Tanggal_Baptis: '1976-02-14',
      Status_Sidi: 'Sudah',
      Tanggal_Sidi: '1993-10-31',
      Status_Nikah_Gereja: 'Sudah',
      Tanggal_Nikah_Gereja: '2001-07-20',
      Pendidikan_Terakhir: 'SLTA / SMA / SMK / MA / Sederajat',
      Pekerjaan: 'Wiraswasta / Pedagang',
      Status_Jiwa: 'Aktif',
      Catatan: 'Kepala Keluarga Rayon II',
    },
  ];

  const wsData = XLSX.utils.json_to_sheet(exampleRows, { header: headers });

  // Column widths for optimal readability
  wsData['!cols'] = [
    { wch: 14 }, // No_KK
    { wch: 24 }, // Nama_Kepala_Keluarga
    { wch: 18 }, // Hubungan_Keluarga
    { wch: 26 }, // Nama_Lengkap
    { wch: 16 }, // Nama_Panggilan
    { wch: 18 }, // NIK
    { wch: 14 }, // Jenis_Kelamin
    { wch: 16 }, // Tempat_Lahir
    { wch: 14 }, // Tanggal_Lahir
    { wch: 32 }, // Alamat
    { wch: 16 }, // Desa_Kelurahan
    { wch: 20 }, // Kecamatan
    { wch: 14 }, // Kabupaten
    { wch: 16 }, // No_Telepon_HP
    { wch: 18 }, // Status_Pernikahan
    { wch: 24 }, // Nama_Suami_Istri
    { wch: 14 }, // Rayon
    { wch: 14 }, // Kategorial
    { wch: 18 }, // Status_Keanggotaan
    { wch: 14 }, // Status_Baptis
    { wch: 14 }, // Tanggal_Baptis
    { wch: 14 }, // Status_Sidi
    { wch: 14 }, // Tanggal_Sidi
    { wch: 18 }, // Status_Nikah_Gereja
    { wch: 18 }, // Tanggal_Nikah_Gereja
    { wch: 28 }, // Pendidikan_Terakhir
    { wch: 26 }, // Pekerjaan
    { wch: 14 }, // Status_Jiwa
    { wch: 28 }, // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, wsData, 'DATA JEMAAT & KK');

  // Sheet 2: Petunjuk dan Referensi Pilihan
  const instructions = [
    { Kategori: '--- PANDUAN PENGISIAN & OTOMATISASI KARTU KELUARGA (KK) ---', Nilai_Pilihan: '', Keterangan: '' },
    {
      Kategori: '1. Pembuatan KK Otomatis',
      Nilai_Pilihan: 'Kolom No_KK & Nama_Kepala_Keluarga',
      Keterangan: 'Jika No_KK diisi sama pada beberapa baris, sistem akan otomatis menggabungkan anggota keluarga ke dalam 1 Kartu Keluarga. Jika KK belum ada di database, KK baru akan otomatis dibuatkan ke menu Kartu Keluarga!',
    },
    {
      Kategori: '2. Hubungan Kepala Keluarga',
      Nilai_Pilihan: 'Kepala Keluarga',
      Keterangan: 'Baris yang memiliki Hubungan_Keluarga "Kepala Keluarga" akan otomatis dijadikan Kepala Keluarga pada Kartu Keluarga tersebut.',
    },
    {
      Kategori: '3. Format Tanggal Wajib',
      Nilai_Pilihan: 'YYYY-MM-DD (Tahun-Bulan-Tanggal)',
      Keterangan: 'Contoh: 1985-04-12 atau 2012-08-25. Tanggal lahir wajib diisi.',
    },
    {
      Kategori: '4. Format NIK',
      Nilai_Pilihan: '16 Angka',
      Keterangan: 'Nomor Induk Kependudukan (NIK) jika diisi harus tepat 16 digit angka. Boleh dikosongkan jika belum memiliki KTP/NIK.',
    },
    { Kategori: '', Nilai_Pilihan: '', Keterangan: '' },
    { Kategori: '--- DAFTAR PILIHAN RESMI (REFERENSI GEREJA GMIT BETEL FUIMELANG) ---', Nilai_Pilihan: '', Keterangan: '' },
    ...rayons.map((r) => ({
      Kategori: 'Rayon Pelayanan',
      Nilai_Pilihan: r.name,
      Keterangan: `${r.code} - ${r.coverageArea || 'Wilayah pelayanan'}`,
    })),
    ...categorials.map((c) => ({
      Kategori: 'Kategorial Pelayanan',
      Nilai_Pilihan: c.code,
      Keterangan: `${c.name} (${c.targetAgeDesc || ''})`,
    })),
    { Kategori: 'Hubungan Keluarga', Nilai_Pilihan: 'Kepala Keluarga', Keterangan: 'Kepala Rumah Tangga' },
    { Kategori: 'Hubungan Keluarga', Nilai_Pilihan: 'Istri', Keterangan: 'Istri dalam KK' },
    { Kategori: 'Hubungan Keluarga', Nilai_Pilihan: 'Anak', Keterangan: 'Anak kandung/angkat' },
    { Kategori: 'Hubungan Keluarga', Nilai_Pilihan: 'Orang Tua', Keterangan: 'Ayah / Ibu' },
    { Kategori: 'Hubungan Keluarga', Nilai_Pilihan: 'Famili Lain', Keterangan: 'Kerabat / Anggota lain' },
    { Kategori: 'Jenis Kelamin', Nilai_Pilihan: 'Laki-laki', Keterangan: 'Pria' },
    { Kategori: 'Jenis Kelamin', Nilai_Pilihan: 'Perempuan', Keterangan: 'Wanita' },
    { Kategori: 'Status Pernikahan', Nilai_Pilihan: 'Belum Menikah', Keterangan: 'Lajang' },
    { Kategori: 'Status Pernikahan', Nilai_Pilihan: 'Menikah', Keterangan: 'Sudah Menikah' },
    { Kategori: 'Status Pernikahan', Nilai_Pilihan: 'Duda', Keterangan: 'Duda' },
    { Kategori: 'Status Pernikahan', Nilai_Pilihan: 'Janda', Keterangan: 'Janda' },
    { Kategori: 'Status Sakramen (Baptis/Sidi/Nikah)', Nilai_Pilihan: 'Sudah', Keterangan: 'Telah menerima sakramen' },
    { Kategori: 'Status Sakramen (Baptis/Sidi/Nikah)', Nilai_Pilihan: 'Belum', Keterangan: 'Belum menerima sakramen' },
    { Kategori: 'Status Keanggotaan', Nilai_Pilihan: 'Tetap', Keterangan: 'Warga Jemaat Tetap GMIT Betel' },
    { Kategori: 'Status Keanggotaan', Nilai_Pilihan: 'Tamu', Keterangan: 'Warga Jemaat Tamu' },
    { Kategori: 'Status Keanggotaan', Nilai_Pilihan: 'Titipan', Keterangan: 'Jemaat Titipan dari gereja lain' },
    { Kategori: 'Status Jiwa', Nilai_Pilihan: 'Aktif', Keterangan: 'Warga aktif bergereja' },
    { Kategori: 'Status Jiwa', Nilai_Pilihan: 'Pindah', Keterangan: 'Pindah domisili/mutasi' },
    { Kategori: 'Status Jiwa', Nilai_Pilihan: 'Meninggal', Keterangan: 'Meninggal dunia' },
    ...STANDARD_EDUCATION_OPTIONS.map((edu) => ({
      Kategori: 'Pendidikan Terakhir',
      Nilai_Pilihan: edu,
      Keterangan: 'Standar Nasional Pendidikan',
    })),
    ...STANDARD_OCCUPATION_OPTIONS.map((occ) => ({
      Kategori: 'Pekerjaan',
      Nilai_Pilihan: occ,
      Keterangan: 'Standar Profesi & Mata Pencaharian',
    })),
  ];

  const wsRef = XLSX.utils.json_to_sheet(instructions);
  wsRef['!cols'] = [{ wch: 36 }, { wch: 32 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsRef, 'PETUNJUK & REFERENSI');

  return wb;
}

/**
 * Initiates download of the official Excel template in the user browser
 */
export function downloadExcelTemplate(rayons: Rayon[], categorials: CategorialGroup[]) {
  const wb = createExcelTemplateWorkbook(rayons, categorials);
  XLSX.writeFile(wb, 'Format_Impor_Jemaat_dan_Kartu_Keluarga_GMIT_Betel_Fuimelang.xlsx');
}

/**
 * Exports current live church members and families into the exact same Excel format
 */
export function exportCurrentDataToExcel(
  members: Member[],
  families: Family[],
  rayons: Rayon[],
  categorials: CategorialGroup[]
) {
  const wb = XLSX.utils.book_new();

  const rows = members.map((m) => {
    const fam = families.find((f) => f.id === m.familyId);
    const ray = rayons.find((r) => r.id === m.rayonId);
    const cat = categorials.find((c) => c.id === m.categorialGroupId);

    return {
      No_KK: m.familyCardNo || fam?.familyNo || '',
      Nama_Kepala_Keluarga: fam?.headOfFamilyName || '',
      Hubungan_Keluarga: m.familyRole || 'Anggota',
      Nama_Lengkap: m.fullName,
      Nama_Panggilan: m.nickname || '',
      NIK: m.nik || '',
      Jenis_Kelamin: m.gender,
      Tempat_Lahir: m.birthPlace || '',
      Tanggal_Lahir: m.birthDate,
      Alamat: m.address,
      Desa_Kelurahan: m.kelurahan || 'Lembur Tengah',
      Kecamatan: m.kecamatan || 'Alor Tengah Utara',
      Kabupaten: m.kabupaten || 'Alor',
      No_Telepon_HP: m.phone || '',
      Status_Pernikahan: m.maritalStatus,
      Nama_Suami_Istri: m.spouseName || '',
      Rayon: ray?.name || m.rayonId,
      Kategorial: cat?.name || m.categorialGroupId,
      Status_Keanggotaan: m.membershipStatus,
      Status_Baptis: m.baptismStatus,
      Tanggal_Baptis: m.baptismDate || '',
      Status_Sidi: m.confirmationStatus,
      Tanggal_Sidi: m.confirmationDate || '',
      Status_Nikah_Gereja: m.marriageChurchStatus,
      Tanggal_Nikah_Gereja: m.marriageDate || '',
      Pendidikan_Terakhir: m.education || '',
      Pekerjaan: m.occupation || '',
      Status_Jiwa: m.status,
      Catatan: m.notes || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'DATA JEMAAT & KK');

  // Also include the reference sheet
  const templateWb = createExcelTemplateWorkbook(rayons, categorials);
  const refSheet = templateWb.Sheets['PETUNJUK & REFERENSI'];
  if (refSheet) {
    XLSX.utils.book_append_sheet(wb, refSheet, 'PETUNJUK & REFERENSI');
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(wb, `Data_Jemaat_dan_KK_GMIT_Betel_Fuimelang_${dateStr}.xlsx`);
}

/**
 * Parses an Excel (.xlsx/.xls) or CSV file and normalizes into Member & Family objects
 */
export async function parseExcelOrCsvFile(
  file: File,
  rayons: Rayon[],
  categorials: CategorialGroup[],
  existingFamilies: Family[] = []
): Promise<{
  rows: ParsedImportRow[];
  detectedFamilies: DetectedFamilyGroup[];
  totalValid: number;
  totalInvalid: number;
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Select the first sheet (or the sheet with 'DATA' in name)
  const sheetName = wb.SheetNames.find((n) => n.toUpperCase().includes('DATA')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    return { rows: [], detectedFamilies: [], totalValid: 0, totalInvalid: 0 };
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const parsedRows: ParsedImportRow[] = [];
  const familiesMap = new Map<string, DetectedFamilyGroup>();

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];

    // Build key map for flexible header matching
    const mapped: Record<string, any> = {};
    for (const key of Object.keys(raw)) {
      mapped[cleanKey(key)] = raw[key];
    }

    const getVal = (...aliases: string[]) => {
      for (const a of aliases) {
        const k = cleanKey(a);
        if (mapped[k] !== undefined && mapped[k] !== '') return mapped[k];
      }
      return '';
    };

    // Extract fields
    const fullName = String(getVal('Nama_Lengkap', 'Nama', 'fullName', 'Nama Jemaat')).trim();
    const familyCardNo = String(getVal('No_KK', 'Nomor_KK', 'NoKK', 'familyCardNo', 'No Kartu Keluarga')).trim();
    let headOfFamilyName = String(getVal('Nama_Kepala_Keluarga', 'Kepala_Keluarga', 'headOfFamilyName')).trim();
    let familyRole = String(getVal('Hubungan_Keluarga', 'Hubungan', 'familyRole', 'Status Hubungan')).trim();

    if (!familyRole) {
      if (headOfFamilyName && headOfFamilyName.toLowerCase() === fullName.toLowerCase()) {
        familyRole = 'Kepala Keluarga';
      } else {
        familyRole = 'Anggota';
      }
    }

    let genderStr = String(getVal('Jenis_Kelamin', 'Gender', 'Kelamin', 'JK')).trim();
    let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
    if (/perempuan|wanita|^p$|^w$/i.test(genderStr)) {
      gender = 'Perempuan';
    } else {
      gender = 'Laki-laki';
    }

    const rawBirthDate = getVal('Tanggal_Lahir', 'Tgl_Lahir', 'birthDate', 'Tanggal Lahir');
    const birthDate = normalizeExcelDate(rawBirthDate);
    const birthPlace = String(getVal('Tempat_Lahir', 'birthPlace', 'Tempat Lahir') || 'Fuimelang').trim();
    const address = String(getVal('Alamat', 'address', 'Alamat Rumah') || 'Desa Lembur Tengah').trim();
    const kelurahan = String(getVal('Desa_Kelurahan', 'Desa', 'Kelurahan', 'kelurahan') || 'Lembur Tengah').trim();
    const kecamatan = String(getVal('Kecamatan', 'kecamatan') || 'Alor Tengah Utara').trim();
    const kabupaten = String(getVal('Kabupaten', 'kabupaten') || 'Alor').trim();
    const phone = String(getVal('No_Telepon_HP', 'No_HP', 'Phone', 'Telepon', 'HP') || '').trim();
    const email = String(getVal('Email', 'email') || '').trim();

    let nik = String(getVal('NIK', 'nik', 'No_KTP') || '').trim();
    if (nik && nik.endsWith('.0')) nik = nik.replace('.0', '');

    let maritalStatusStr = String(getVal('Status_Pernikahan', 'maritalStatus', 'Status Nikah') || '').trim();
    let maritalStatus: 'Belum Menikah' | 'Menikah' | 'Duda' | 'Janda' = 'Belum Menikah';
    if (/menikah|kawin/i.test(maritalStatusStr) && !/belum/i.test(maritalStatusStr)) maritalStatus = 'Menikah';
    else if (/duda/i.test(maritalStatusStr)) maritalStatus = 'Duda';
    else if (/janda/i.test(maritalStatusStr)) maritalStatus = 'Janda';

    const spouseName = String(getVal('Nama_Suami_Istri', 'Pasangan', 'spouseName') || '').trim();

    // Rayon & Kategorial
    const rawRayon = String(getVal('Rayon', 'rayonId', 'Wilayah Rayon') || '');
    const rayon = resolveRayon(rawRayon, rayons);

    const rawCat = String(getVal('Kategorial', 'categorialGroupId', 'Kelompok') || '');
    const categorial = resolveCategorial(rawCat, birthDate, gender, categorials);

    // Membership & Sacraments
    let membershipStatusStr = String(getVal('Status_Keanggotaan', 'membershipStatus') || 'Tetap').trim();
    let membershipStatus: 'Tetap' | 'Tamu' | 'Titipan' = 'Tetap';
    if (/tamu/i.test(membershipStatusStr)) membershipStatus = 'Tamu';
    else if (/titip/i.test(membershipStatusStr)) membershipStatus = 'Titipan';

    const parseSacrament = (val: string): 'Sudah' | 'Belum' => (/sudah|^ya$|^y$/i.test(val) ? 'Sudah' : 'Belum');

    const baptismStatus = parseSacrament(String(getVal('Status_Baptis', 'Baptis', 'baptismStatus') || ''));
    const baptismDate = normalizeExcelDate(getVal('Tanggal_Baptis', 'Tgl_Baptis', 'baptismDate'));

    const confirmationStatus = parseSacrament(String(getVal('Status_Sidi', 'Sidi', 'confirmationStatus') || ''));
    const confirmationDate = normalizeExcelDate(getVal('Tanggal_Sidi', 'Tgl_Sidi', 'confirmationDate'));

    const marriageChurchStatus = parseSacrament(String(getVal('Status_Nikah_Gereja', 'Nikah_Gereja', 'marriageChurchStatus') || ''));
    const marriageDate = normalizeExcelDate(getVal('Tanggal_Nikah_Gereja', 'Tgl_Nikah', 'marriageDate'));

    const education = String(getVal('Pendidikan_Terakhir', 'Pendidikan', 'education') || 'SLTA / SMA / SMK / MA / Sederajat').trim();
    const occupation = String(getVal('Pekerjaan', 'occupation') || 'Petani / Pekebun').trim();

    let statusStr = String(getVal('Status_Jiwa', 'Status', 'status') || 'Aktif').trim();
    let status: 'Aktif' | 'Pindah' | 'Meninggal' = 'Aktif';
    if (/pindah/i.test(statusStr)) status = 'Pindah';
    else if (/meninggal/i.test(statusStr)) status = 'Meninggal';

    const notes = String(getVal('Catatan', 'Keterangan', 'notes') || '').trim();

    // Validation checks
    const errors: string[] = [];
    if (!fullName || fullName.length < 2) {
      errors.push('Nama lengkap minimal 2 karakter');
    }
    if (!birthDate) {
      errors.push('Tanggal lahir wajib diisi (format YYYY-MM-DD)');
    }
    if (nik && nik.length > 0 && nik.length !== 16) {
      errors.push(`NIK harus tepat 16 digit angka (saat ini ${nik.length} digit)`);
    }

    const rowObj: ParsedImportRow = {
      familyCardNo,
      headOfFamilyName,
      familyRole,
      fullName,
      nickname: String(getVal('Nama_Panggilan', 'Panggilan', 'nickname') || '').trim(),
      nik,
      gender,
      birthPlace,
      birthDate,
      address,
      kelurahan,
      kecamatan,
      kabupaten,
      phone,
      email,
      maritalStatus,
      spouseName,
      rayonId: rayon.id,
      rayonName: rayon.name,
      categorialGroupId: categorial.id,
      categorialGroupName: categorial.name,
      membershipStatus,
      baptismStatus,
      baptismDate,
      confirmationStatus,
      confirmationDate,
      marriageChurchStatus,
      marriageDate,
      education,
      occupation,
      status,
      notes,
      isValid: errors.length === 0,
      errors,
    };

    parsedRows.push(rowObj);

    // Grouping by Family (KK)
    const familyKey = familyCardNo || (headOfFamilyName ? `NAME_${headOfFamilyName.toLowerCase()}` : `ROW_${i}`);
    if (!familiesMap.has(familyKey)) {
      // Check if family already exists in database
      const existing = existingFamilies.find(
        (f) =>
          (familyCardNo && f.familyNo.toLowerCase() === familyCardNo.toLowerCase()) ||
          (headOfFamilyName && f.headOfFamilyName.toLowerCase() === headOfFamilyName.toLowerCase())
      );

      familiesMap.set(familyKey, {
        familyNo: familyCardNo || (existing ? existing.familyNo : `KK-BARU-${familiesMap.size + 1}`),
        headOfFamilyName: headOfFamilyName || (familyRole === 'Kepala Keluarga' ? fullName : `Keluarga ${fullName}`),
        address,
        rayonId: rayon.id,
        rayonName: rayon.name,
        phone,
        members: [rowObj],
        isNew: !existing,
      });
    } else {
      const group = familiesMap.get(familyKey)!;
      group.members.push(rowObj);
      if (familyRole === 'Kepala Keluarga') {
        group.headOfFamilyName = fullName;
      }
    }
  }

  const detectedFamilies = Array.from(familiesMap.values());
  const totalValid = parsedRows.filter((r) => r.isValid).length;
  const totalInvalid = parsedRows.filter((r) => !r.isValid).length;

  return {
    rows: parsedRows,
    detectedFamilies,
    totalValid,
    totalInvalid,
  };
}
