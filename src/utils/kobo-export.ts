import type { Member } from '../types/index.ts';
import { calculateAge } from './church-logic.ts';

/**
 * Utility functions for exporting congregation data to KoboToolbox.
 * Supports:
 * 1. KoboToolbox-compliant Submissions CSV (with Kobo metadata headers)
 * 2. KoboToolbox v2 REST API compatible JSON
 * 3. KoboToolbox XLSForm Survey Schema definition (CSV format)
 */

// Helper to escape CSV values
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Helper to trigger browser download
export function downloadFile(content: string, fileName: string, contentType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Generate CSV formatted for KoboToolbox Data Import / Submissions
 */
export function generateKoboCsv(members: Member[]): string {
  const headers = [
    '_id',
    '_uuid',
    '_submission_time',
    '_status',
    '_submitted_by',
    'member_no',
    'full_name',
    'nickname',
    'nik',
    'family_card_no',
    'family_role',
    'gender',
    'birth_place',
    'birth_date',
    'age',
    'address',
    'kelurahan',
    'kecamatan',
    'kabupaten',
    'phone',
    'email',
    'marital_status',
    'spouse_name',
    'rayon_id',
    'rayon_name',
    'categorial_group_id',
    'categorial_group_name',
    'membership_status',
    'baptism_status',
    'baptism_date',
    'confirmation_status',
    'confirmation_date',
    'marriage_church_status',
    'marriage_date',
    'education',
    'occupation',
    'join_date',
    'status',
    'notes',
  ];

  const nowIso = new Date().toISOString();

  const rows = members.map((m, idx) => {
    const age = calculateAge(m.birthDate);
    const fakeUuid = `kobo-${m.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;
    const submissionTime = m.createdAt || nowIso;

    return [
      escapeCsv(idx + 1),
      escapeCsv(fakeUuid),
      escapeCsv(submissionTime),
      escapeCsv('approved'),
      escapeCsv('SYSJEGER_ADMIN'),
      escapeCsv(m.memberNo),
      escapeCsv(m.fullName),
      escapeCsv(m.nickname || ''),
      escapeCsv(m.nik || ''),
      escapeCsv(m.familyCardNo || ''),
      escapeCsv(m.familyRole || ''),
      escapeCsv(m.gender),
      escapeCsv(m.birthPlace || ''),
      escapeCsv(m.birthDate),
      escapeCsv(age),
      escapeCsv(m.address || ''),
      escapeCsv(m.kelurahan || ''),
      escapeCsv(m.kecamatan || ''),
      escapeCsv(m.kabupaten || ''),
      escapeCsv(m.phone || ''),
      escapeCsv(m.email || ''),
      escapeCsv(m.maritalStatus || ''),
      escapeCsv(m.spouseName || ''),
      escapeCsv(m.rayonId),
      escapeCsv(m.rayonName || `Rayon ${m.rayonId}`),
      escapeCsv(m.categorialGroupId),
      escapeCsv(m.categorialGroupName || m.categorialGroupId),
      escapeCsv(m.membershipStatus || ''),
      escapeCsv(m.baptismStatus || ''),
      escapeCsv(m.baptismDate || ''),
      escapeCsv(m.confirmationStatus || ''),
      escapeCsv(m.confirmationDate || ''),
      escapeCsv(m.marriageChurchStatus || ''),
      escapeCsv(m.marriageDate || ''),
      escapeCsv(m.education || ''),
      escapeCsv(m.occupation || ''),
      escapeCsv(m.joinDate || ''),
      escapeCsv(m.status || ''),
      escapeCsv(m.notes || ''),
    ].join(',');
  });

  // Prepend UTF-8 BOM so Excel and KoboToolbox correctly handle Indonesian characters
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generate JSON formatted for KoboToolbox v2 REST API (/api/v2/assets/{asset_uid}/data/)
 */
export function generateKoboJson(members: Member[]): string {
  const nowIso = new Date().toISOString();

  const results = members.map((m, idx) => {
    const age = calculateAge(m.birthDate);
    const fakeUuid = `kobo-${m.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;
    const submissionTime = m.createdAt || nowIso;

    return {
      _id: idx + 1,
      _uuid: fakeUuid,
      _submission_time: submissionTime,
      _status: 'submitted_via_web',
      _submitted_by: 'SYSJEGER_GMIT_BETEL',
      formhub: {
        uuid: 'gmit-betel-fuimelang-form',
      },
      member_no: m.memberNo,
      full_name: m.fullName,
      nickname: m.nickname || '',
      nik: m.nik || '',
      family_card_no: m.familyCardNo || '',
      family_role: m.familyRole,
      gender: m.gender,
      birth_place: m.birthPlace,
      birth_date: m.birthDate,
      age: age,
      address: m.address,
      kelurahan: m.kelurahan || '',
      kecamatan: m.kecamatan || '',
      kabupaten: m.kabupaten || '',
      phone: m.phone || '',
      email: m.email || '',
      marital_status: m.maritalStatus,
      spouse_name: m.spouseName || '',
      rayon_id: m.rayonId,
      rayon_name: m.rayonName || '',
      categorial_group_id: m.categorialGroupId,
      categorial_group_name: m.categorialGroupName || '',
      membership_status: m.membershipStatus,
      baptism_status: m.baptismStatus,
      baptism_date: m.baptismDate || '',
      confirmation_status: m.confirmationStatus,
      confirmation_date: m.confirmationDate || '',
      marriage_church_status: m.marriageChurchStatus,
      marriage_date: m.marriageDate || '',
      education: m.education || '',
      occupation: m.occupation || '',
      join_date: m.joinDate || '',
      status: m.status,
      notes: m.notes || '',
    };
  });

  return JSON.stringify({
    count: results.length,
    results,
    exported_at: nowIso,
    church: 'GMIT Betel Fuimelang - Klasis Alor Tengah Utara',
    system: 'SYSJEGER V2.0',
  }, null, 2);
}

/**
 * Generate standard KoboToolbox XLSForm Survey Schema in CSV format
 * (Includes survey questions, choices lists, and settings for field enumerators)
 */
export function generateKoboSurveySchema(): string {
  const content = `# KOBO TOOLBOX XLSFORM SCHEMA - GMIT BETEL FUIMELANG
# DESA LEMBUR TENGAH, KLASIS ALOR TENGAH UTARA
# Import file ini atau copy ke Excel untuk membuat form pendataan lapangan KoboToolbox

[survey]
type,name,label,hint,required
begin_group,group_personal,Data Pribadi Jemaat,Informasi identitas kependudukan jemaat,
text,member_no,Nomor Induk Anggota Jemaat,Format: GMIT-BF-2026-XXX,yes
text,full_name,Nama Lengkap Jemaat,Sesuai Akta Kelahiran atau KTP,yes
text,nickname,Nama Panggilan / Nama Akrab,,no
text,nik,Nomor Induk Kependudukan (NIK),Wajib 16 digit angka,no
text,family_card_no,Nomor Kartu Keluarga (KK),16 digit angka sesuai KK,no
select_one gender_list,gender,Jenis Kelamin,,yes
text,birth_place,Tempat Lahir,Contoh: Fuimelang / Kalabahi,no
date,birth_date,Tanggal Lahir,Pilih tanggal kelahiran,yes
select_one family_role_list,family_role,Status Dalam Keluarga,,yes
end_group,,,

begin_group,group_church,Data Pelayanan Gereja GMIT Betel,Wilayah rayon dan status sakramen gerejawi,
select_one rayon_list,rayon_id,Rayon Pelayanan,Pilih rayon tempat tinggal di Fuimelang,yes
select_one categorial_list,categorial_group_id,Kelompok Kategorial,Pilih kategorial pelayanan,yes
select_one membership_list,membership_status,Status Keanggotaan Jemaat,,yes
select_one sacrament_list,baptism_status,Status Baptisan Kudus,,yes
date,baptism_date,Tanggal Baptis (Jika Sudah),,no
select_one sacrament_list,confirmation_status,Status Peneguhan Sidi (Anggota Sidi),,yes
date,confirmation_date,Tanggal Sidi (Jika Sudah),,no
select_one sacrament_list,marriage_church_status,Status Nikah Kudus di Gereja,,yes
date,marriage_date,Tanggal Pemberkatan Nikah Gereja,,no
end_group,,,

begin_group,group_domicile,Alamat dan Kontak,Alamat domisili jemaat di Desa Lembur Tengah,
text,phone,Nomor HP / WhatsApp,Contoh: 0812-3456-7890,no
text,email,Alamat Email,,no
text,address,Alamat / Lingkungan / RT RW,Contoh: RT 01 / Fuimelang Pusat,yes
text,kelurahan,Desa / Kelurahan,Default: Lembur Tengah,yes
text,kecamatan,Kecamatan,Default: Alor Tengah Utara,yes
text,kabupaten,Kabupaten,Default: Alor,yes
select_one marital_list,marital_status,Status Pernikahan Sipil,,yes
text,spouse_name,Nama Pasangan (Suami / Istri),,no
select_one education_list,education,Pendidikan Terakhir,,no
select_one occupation_list,occupation,Pekerjaan / Mata Pencaharian,,no
select_one status_list,status,Status Keberadaan Jemaat,,yes
note,notes,Catatan Pelayanan Tambahan,,no
end_group,,,

[choices]
list_name,name,label
gender_list,Laki-laki,Laki-laki
gender_list,Perempuan,Perempuan
family_role_list,Kepala Keluarga,Kepala Keluarga
family_role_list,Istri,Istri
family_role_list,Anak,Anak
family_role_list,Orang Tua,Orang Tua
family_role_list,Famili Lain,Famili Lain
rayon_list,r1,Rayon I (Pusat & Pasar Lama)
rayon_list,r2,Rayon II (Kompleks SD Betel & Liku)
rayon_list,r3,Rayon III (Fuimelang Atas & Kebun Sirih)
rayon_list,r4,Rayon IV (Pesisir Pantai & Dermaga)
categorial_list,c1,Pelayanan Anak dan Remaja (PAR) (0-15 Thn)
categorial_list,c2,Gerakan Pemuda GMIT (GP GMIT) (16-30 Thn)
categorial_list,c3,Persekutuan Kaum Perempuan GMIT (PKP)
categorial_list,c4,Persekutuan Kaum Bapak GMIT (PKB)
categorial_list,c5,Persekutuan Usia Indah (Lansia) (>=60 Thn)
sacrament_list,Sudah,Sudah
sacrament_list,Belum,Belum
membership_list,Tetap,Anggota Tetap
membership_list,Tamu,Jemaat Tamu
membership_list,Titipan,Jemaat Titipan
marital_list,Belum Menikah,Belum Menikah
marital_list,Menikah,Menikah
marital_list,Duda,Duda
marital_list,Janda,Janda
status_list,Aktif,Aktif
status_list,Pindah,Pindah
status_list,Meninggal,Meninggal
education_list,Tidak / Belum Sekolah,Tidak / Belum Sekolah
education_list,SD / Sederajat,SD / Sederajat
education_list,SLTP / SMP / MTs / Sederajat,SLTP / SMP / MTs / Sederajat
education_list,SLTA / SMA / SMK / MA / Sederajat,SLTA / SMA / SMK / MA / Sederajat
education_list,Diploma (D1 / D2 / D3),Diploma (D1 / D2 / D3)
education_list,Sarjana (S1 / Terapan),Sarjana (S1 / Terapan)
education_list,Magister (S2),Magister (S2)
education_list,Doktor (S3),Doktor (S3)
occupation_list,Petani / Pekebun,Petani / Pekebun
occupation_list,Nelayan / Perikanan,Nelayan / Perikanan
occupation_list,Pegawai Negeri Sipil (PNS / ASN),Pegawai Negeri Sipil (PNS / ASN)
occupation_list,PPPK / Tenaga Honorer,PPPK / Tenaga Honorer
occupation_list,Guru / Dosen / Tenaga Pendidik,Guru / Dosen / Tenaga Pendidik
occupation_list,TNI / POLRI,TNI / POLRI
occupation_list,Tenaga Medis / Kesehatan,Tenaga Medis / Kesehatan
occupation_list,Wiraswasta / Pedagang,Wiraswasta / Pedagang
occupation_list,Pelajar / Mahasiswa,Pelajar / Mahasiswa
occupation_list,Pendeta / Rohaniwan / Pelayan Gereja,Pendeta / Rohaniwan / Pelayan Gereja
occupation_list,Pensiunan,Pensiunan
occupation_list,Belum / Tidak Bekerja,Belum / Tidak Bekerja

[settings]
form_title,form_id,version,default_language
Pendataan Jemaat GMIT Betel Fuimelang 2026,gmit_betel_fuimelang_pendataan,2026_01,Indonesian (id)
`;

  return '\uFEFF' + content;
}
