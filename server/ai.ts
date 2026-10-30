import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

export const aiRouter = Router();

aiRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Keep the model configurable so Vercel can be upgraded without a code change.
// gemini-2.5-flash is the safe default; local drafts remain available without a key.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

aiRouter.get('/status', (_req, res) => {
  res.json({
    success: true,
    configured: Boolean(ai),
    provider: ai ? 'gemini' : 'local-draft',
    model: ai ? DEFAULT_MODEL : null,
  });
});

// 1. Asisten Khotbah & Renungan GMIT
aiRouter.post('/sermon', async (req, res) => {
  const {
    serviceType = 'Ibadah Minggu',
    scripture = 'Mazmur 23:1-6',
    topic = 'Tuhan Gembalaku yang Baik',
    liturgicalSeason = 'Umum',
    contextNotes = 'Jemaat sebagian besar bertani dan berkebun di Lembur Tengah Alor',
  } = req.body;

  const prompt = `Anda adalah seorang teolog dan pendeta berpengalaman di Gereja Masehi Injili di Timor (GMIT), melayani di Jemaat GMIT Betel Fuimelang, Desa Lembur Tengah, Klasis Alor Tengah Utara, Kabupaten Alor, Nusa Tenggara Timur (NTT).

Tolong susun draf dan pokok renungan / khotbah yang mendalam, alkitabiah, dan kontekstual dengan rincian berikut:
- Jenis Ibadah: ${serviceType}
- Nats Alkitab: ${scripture}
- Tema / Topik: ${topic}
- Periode/Tahun Gerejawi: ${liturgicalSeason}
- Konteks Jemaat: ${contextNotes}

Susun dalam format yang rapi dan mudah dibaca oleh Pendeta atau Majelis Jemaat:
1. JUDUL KHOTBAH: (Menarik, teologis, dan mudah diingat jemaat)
2. TEMA POKOK TEOLOGIS: (Intisari kebenaran firman Allah)
3. PENDAHULUAN: (Menghubungkan konteks kehidupan nyata jemaat di NTT/Alor dengan pergumulan iman)
4. TAFSIRAN DAN MAKNA NATS: (Latar belakang nats dan penjelasan inti firman)
5. BUTIR-BUTIR KHOTBAH (3 Poin Pokok):
   - Poin 1 + Ilustrasi Kontekstual & Aplikasi
   - Poin 2 + Ilustrasi Kontekstual & Aplikasi
   - Poin 3 + Ilustrasi Kontekstual & Aplikasi
6. KESIMPULAN & AJAKAN KOMITMEN: (Panggilan untuk bertindak dan hidup berbuah)
7. DOA SYAFAAT / DOA FIRMAN: (Naskah doa penutup yang menguatkan jemaat)`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah konsultan teologi dan asisten pastoral pastoral GMIT yang berpegang pada tradisi Reformasi Injili, ramah, kontekstual budaya Nusa Tenggara Timur, dan setia pada Kitab Suci.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini API call failed, generating contextual spiritual fallback:', err?.message);
  }

  // Spiritual fallback
  const fallback = `DRAF KERANGKA KHOTBAH JEMAAT GMIT BETEL FUIMELANG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jenis Ibadah    : ${serviceType}
Nats Alkitab    : ${scripture}
Tema            : ${topic}
Tahun Gerejawi  : ${liturgicalSeason}
Wilayah         : Desa Lembur Tengah, Klasis Alor Tengah Utara

1. JUDUL KHOTBAH:
"Tangan Tuhan yang Setia Menuntun di Lembah Kehidupan"

2. TEMA POKOK TEOLOGIS:
Pemeliharaan dan kesetiaan Allah yang berdaulat (Providentia Dei) yang melampaui segala pergumulan hidup, kekeringan tanah, dan keterbatasan manusiawi.

3. PENDAHULUAN:
Saudara-saudari yang dikasihi Tuhan Yesus Kristus di GMIT Betel Fuimelang. Di tanah Alor yang subur ini, ketika kita menanam jagung, merawat pohon kemiri, dan melaut, kita belajar satu hal: hasil jerih lelah kita selalu berada di bawah rahmat dan hujan yang Tuhan turunkan. Dalam perjalanan iman, tidak selamanya jalan yang kita tempuh datar dan terang; ada kalanya kita melewati masa sukar dan kekhawatiran keluarga. Nats kita hari ini (${scripture}) mengingatkan bahwa Gembala Agung kita tidak pernah tidur dan tidak pernah meninggalkan kawanan domba-Nya.

4. TAFSIRAN & MAKNA NATS (${scripture}):
Mazmur Daud ini lahir dari pengalaman nyata seorang gembala yang mengenal watak domba dan bahaya padang gurun. "Rumput yang hijau" dan "air yang tenang" bukan sekadar tempat nyaman secara fisik, melainkan kedamaian batin (syalom) yang hanya bisa diberikan oleh relasi akrab dengan Sang Pencipta. Tongkat dan gada Tuhan melambangkan wibawa perlindungan Allah dari musuh dan binatang buas spiritual.

5. BUTIR-BUTIR KHOTBAH:
Poin 1: Kepastian Bahwa Tuhan Mengenal dan Mencukupi Kebutuhan Kita
- Penjelasan: Kita sering khawatir akan hari esok, biaya pendidikan anak, atau hasil panen kebun. Namun pemeliharaan Allah bukan berdasarkan kelimpahan gudang kita, melainkan kekayaan anugerah-Nya.
- Aplikasi Kontekstual: Jadilah keluarga Kristen yang tekun bekerja dengan tangan sendiri, jujur dalam persekutuan jemaat, dan senantiasa bersyukur atas berkat harian yang Tuhan beri.

Poin 2: Menemukan Ketenangan di Tengah Lembah Bayang-bayang Kesusahan
- Penjelasan: Lembah bukan tempat kita berkemah dan berputus asa selamanya, melainkan lorong yang harus kita lalui bersama Yesus. Kegelapan tidak berkuasa memadamkan terang Kristus.
- Aplikasi Kontekstual: Jika ada keluarga di Rayon kita yang sedang sakit atau berduka, mari wujudkan persekutuan yang saling mengunjungi, mendoakan, dan menopang satu sama lain (koinonia sejati).

Poin 3: Kebajikan dan Kemurahan Tuhan Mengikuti Kita Sepanjang Hayat
- Penjelasan: Kata Ibrani "hesed" (kasih setia Allah) mengejar kita tanpa henti. Rumah Tuhan adalah pelabuhan kekal jiwa kita.
- Aplikasi Kontekstual: Hendaklah hidup kita menjadi saksi kemurahan Tuhan bagi sesama di desa dan lingkungan sekitar kita.

6. KESIMPULAN & AJAKAN KOMITMEN:
Jangan biarkan kecemasan melumpuhkan langkah kaki kita. Taruhlah seluruh pergumulan keluarga, anak-cucu, dan pelayanan gereja kita ke dalam tangan Tuhan yang berlubang paku. Ia telah mengalahkan maut dan Ia menyertai Jemaat Betel Fuimelang sampai akhir zaman.

7. DOA PENUTUP FIRMAN:
"Bapa Surgawi, Gembala kami yang baik, terima kasih untuk sabda firman-Mu yang mengalir sejuk ke dalam hati kami. Berkatilah setiap kepala keluarga, para ibu, pemuda, anak-anak, dan lansia di GMIT Betel Fuimelang. Pulihkan yang lemah, hiburkan yang berduka, dan berkatilah jerih lelah kami di ladang dan kebun. Terpujilah nama-Mu, kini dan sepanjang masa. Amin."`;

  return res.json({ success: true, text: fallback });
});

// 2. Pembuat Warta Jemaat Otomatis
aiRouter.post('/warta', async (req, res) => {
  const {
    bulletinDate = new Date().toISOString().substring(0, 10),
    items = [],
    announcerName = 'Majelis Jemaat GMIT Betel Fuimelang',
    tone = 'Hangat dan Menghidupkan Persekutuan',
  } = req.body;

  const itemList = (Array.isArray(items) ? items : [items]).map((item) => String(item || '').trim()).filter(Boolean);
  const rawItems = itemList.join('\n- ');
  const itemDraft = itemList.length > 0
    ? itemList.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'Belum ada pokok warta yang dimasukkan. Tambahkan hanya informasi yang telah dikonfirmasi Majelis.';

  const prompt = `Anda adalah sekretariat Majelis Jemaat GMIT Betel Fuimelang, Klasis Alor Tengah Utara.
Buatlah Draf Warta Jemaat Mingguan resmi yang rapi, tertib, dan bernuansa pastoral untuk dibacakan pada Ibadah Minggu tanggal ${bulletinDate}.

Catatan / Pokok-pokok Warta:
- ${rawItems || 'Belum ada pokok warta yang diberikan. Jangan mengarang jadwal atau kegiatan; tandai bagian yang perlu dikonfirmasi.'}

Gaya Bahasa: ${tone}
Penyampai: ${announcerName}

Format Warta Jemaat harus mencakup:
1. KEPALA WARTA: (Nama Gereja, Wilayah Klasis, Tanggal Ibadah)
2. SALAM PEMBUKA & UCAPAN SELAMAT DATANG: (Bagi jemaat tetap maupun saudara seiman/tamu yang baru pertama kali beribadah)
3. WARTA PELAYANAN & JADWAL IBADAH SEPEKAN: (Ibadah Rayon 1-4, Ibadah Kategorial PAR, Pemuda, Kaum Ibu, Kaum Bapak)
4. WARTA KHUSUS MAJELIS & PENGUMUMAN PERISTIWA: (Sakramen, mutasi, ucapan syukur)
5. POKOK-POKOK DOA SYAFAAT SEPEKAN: (Bagi warga jemaat lansia, sakit, studi anak-anak, pertanian/usaha, dan pelayanan gereja)
6. KATA PENUTUP & SALAM BERKAT DARI MAJELIS`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah asisten administrasi gerejawi GMIT yang ahli menyusun warta jemaat dengan tata bahasa Indonesia yang baik, tertib liturgis, dan penuh persaudaraan kristiani. Jangan mengarang jadwal, pengumuman, atau peristiwa; tandai data yang belum tersedia untuk dikonfirmasi.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini API call failed, generating contextual fallback:', err?.message);
  }

  const fallback = `DRAF WARTA JEMAAT GMIT BETEL FUIMELANG
Klasis Alor Tengah Utara
Hari / Tanggal: ${bulletinDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dokumen ini adalah draf lokal. Periksa dan sahkan setiap informasi sebelum dibagikan.

I. SALAM PEMBUKA & UCAPAN SELAMAT DATANG
Majelis Jemaat GMIT Betel Fuimelang menyambut seluruh warga jemaat dan tamu dalam persekutuan kasih Tuhan Yesus Kristus.

II. WARTA PELAYANAN & KEGIATAN
${itemDraft}

III. WARTA KHUSUS MAJELIS
[Tambahkan hanya pengumuman, sakramen, mutasi, atau ucapan syukur yang telah dikonfirmasi.]

IV. POKOK DOA SYAFAAT
1. Doa bagi warga jemaat yang sedang sakit atau dalam pemulihan.
2. Doa bagi anak-anak, pemuda, dan keluarga dalam pendidikan serta pekerjaan.
3. Doa bagi pelayanan Majelis, rayon, dan seluruh warga jemaat.

V. PENUTUP
"Sebab segala sesuatu adalah dari Dia, dan oleh Dia, dan kepada Dia: Bagi Dialah kemuliaan sampai selama-lamanya!" (Roma 11:36)
Draf disiapkan untuk diperiksa oleh ${announcerName}.`;

  return res.json({ success: true, text: fallback });
});

// 3. Doa Pastoral & Kunjungan
aiRouter.post('/pastoral-prayer', async (req, res) => {
  const {
    category = 'ulang-tahun',
    memberName = 'Bapak/Ibu Jemaat',
    age = '',
    rayon = '',
    notes = '',
  } = req.body;

  const prompt = `Anda adalah seorang pendeta / presbiter GMIT Betel Fuimelang yang hendak melayani pastoral jemaat.

Buatlah materi kunjungan pastoral dan doa khusus dengan data berikut:
- Kategori Pelayanan: ${category}
- Nama Anggota Jemaat: ${memberName}
- Usia / Usia Pernikahan: ${age ? `${age} tahun` : 'Tidak disebutkan'}
- Rayon Pelayanan: ${rayon || 'GMIT Betel Fuimelang'}
- Catatan / Kondisi Khusus: ${notes || 'Kunjungan rutin pastoral'}

Hasilkan output yang terstruktur:
1. AYAT ALKITAB PENGUATAN: (Satu atau dua ayat firman Tuhan yang sangat mengena dan menenangkan)
2. PESAN PASTORAL SINGKAT (3 Menit): (Kata-kata penguatan iman yang hangat dan penuh kasih saat bercakap-cakap dengan keluarga)
3. NASKAH DOA PASTORAL: (Doa yang sungguh-sungguh, menyebut nama ${memberName}, mendoakan kesehatan, damai sejahtera, rezeki, dan perlindungan Tuhan bagi seisi rumah)
4. DRAF PESAN WHATSAPP: (Teks ucapan dan doa yang ringkas, hangat, siap di-copy paste ke WhatsApp anggota jemaat)`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah gembala jemaat yang penuh empati, memiliki bahasa pastoral yang lembut, menguatkan hati, dan berakar pada pengharapan di dalam Kristus Yesus.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini API call failed, generating fallback:', err?.message);
  }

  const fallback = `MATERI KUNJUNGAN PASTORAL & DOA PELAYANAN
GMIT Betel Fuimelang — Pelayanan Rayon: ${rayon || 'Semua Rayon'}
Sasaran: ${memberName} (${category.toUpperCase()})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. AYAT ALKITAB PENGUATAN:
"TUHAN memberkati engkau dan melindungi engkau; TUHAN menyinari engkau dengan wajah-Nya dan memberi engkau kasih karunia; TUHAN menghadapkan wajah-Nya kepadamu dan memberi engkau damai sejahtera." (Bilangan 6:24-26)

2. PESAN PASTORAL SINGKAT (3 Menit):
"Bapak/Ibu/Saudara ${memberName} yang dikasihi Kristus. Kami dari Majelis Jemaat datang dengan sukacita dan kasih Tuhan. Kehidupan kita adalah untaian anugerah dari Sang Khalik. Dalam setiap fase yang dilalui—sukacita, pergumulan, maupun pergantian usia—tangan pemeliharaan Tuhan selalu merangkul kita. Jangan bimbang melangkah, sebab Ia yang telah memulai pekerjaan yang baik dalam hidup Saudara, akan meneruskannya sampai pada akhirnya."

3. NASKAH DOA PASTORAL:
"Ya Tuhan Allah Bapa kami yang bertahta dalam kerajaan sorga, kami bersyukur atas kasih setia-Mu yang tak berkesudahan. Pada saat yang teduh dan penuh rahmat ini, kami membawa hamba-Mu, saudara kami ${memberName} beserta seluruh anggota keluarganya ke hadirat-Mu yang kudus. 

Tuhan, jamahlah hidupnya dengan tangan-Mu yang berkuasa. Karuniakanlah kesehatan prima bagi tubuhnya, ketenangan batin dalam rohnya, dan hikmat surgawi dalam setiap keputusan dan pekerjaannya sehari-hari. Berkati mata air rezekinya di tanah dan kebun ini, cukupkanlah segala kebutuhan rumah tangganya, dan bentengilah tempat kediamannya dengan para malaikat-Mu yang kudus.

Bila ada pergumulan atau beban yang dipikul di dalam hati yang sunyi, biarlah damai sejahtera Kristus yang melampaui segala akal memelihara hati dan pikirannya. Jadikanlah saudara kami ${memberName} saksi kasih-Mu yang bercahaya di tengah keluarga, jemaat Betel Fuimelang, dan masyarakat luas. Di dalam nama Yesus Kristus, Tuhan dan Juruselamat kami yang hidup, kami memohon dan mengucap syukur. Amin."

4. DRAF PESAN WHATSAPP:
"Shalom Saudara/Bapak/Ibu *${memberName}* terkasih. Majelis Jemaat dan seluruh saudara seiman di GMIT Betel Fuimelang mengucapkan selamat atas ${category}. Kiranya kasih, penyertaan, dan berkat Tuhan Yesus senantiasa melimpah bagi Saudara dan seisi keluarga (Bilangan 6:24-26). Tetap bersukacita dan andalkan Tuhan selalu! Tuhan Yesus memberkati."`;

  return res.json({ success: true, text: fallback });
});

// 4. Analisis & Rekomendasi Pelayanan Majelis
aiRouter.post('/insights', async (req, res) => {
  const { statsSummary } = req.body;

  const prompt = `Anda adalah penasihat strategis pelayanan GMIT (Gereja Masehi Injili di Timor).
Berikut adalah ringkasan data statistik Jemaat GMIT Betel Fuimelang saat ini:
${JSON.stringify(statsSummary || {}, null, 2)}

Berdasarkan data di atas, berikan 4 hingga 5 REKOMENDASI STRATEGIS & PASTORAL untuk Majelis Jemaat GMIT Betel Fuimelang:
1. Prioritas Pembinaan Kategorial (Anak & Remaja / Pemuda / Kaum Ibu / Kaum Bapak)
2. Perhatian Khusus Sakramen & Pelayanan Sidi
3. Pendampingan Jemaat Lanjut Usia & Lansia
4. Optimalisasi Persekutuan Rayon Pelayanan
5. Pengelolaan Sumber Daya & Partisipasi Warga Jemaat`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah konsultan kepemimpinan gerejawi GMIT yang bijaksana, praktis, dan berwawasan luas.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini API call failed, generating fallback:', err?.message);
  }

  const fallback = `ANALISIS STRATEGIS PELAYANAN MAJELIS JEMAAT GMIT BETEL FUIMELANG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wilayah: Desa Lembur Tengah, Klasis Alor Tengah Utara, Kabupaten Alor, NTT

1. REKOMENDASI SAKRAMEN SIDI & KATEKISASI KELUARGA
Prioritaskan penjaringan bagi anak-anak muda usia 15-20 tahun yang sudah dibaptis namun belum mengaku percaya (Sidi). Buka kelas katekisasi berkala yang adaptif dengan jadwal sekolah/kuliah dan kegiatan perkebunan, agar generasi muda memiliki dasar doktrin Reformed yang kokoh.

2. PENGUATAN PERSEKUTUAN RAYON I s/d IV
Rayon merupakan urat nadi persekutuan jemaat di pedesaan. Majelis Rayon disarankan membuat jadwal rotasi ibadah rumah tangga yang variatif (disertai diskusi firman dan pelayanan kasih antar-tetangga), sehingga warga jemaat yang jarang ke gedung gereja tetap terpelihara rohaninya.

3. PELAYANAN LANSIA & KUNJUNGAN ORANG SAKIT
Warga jemaat lanjut usia memerlukan lawatan pastoral berkala serta pelayanan perjamuan kudus di rumah bagi yang memiliki keterbatasan fisik. Penatua dan diaken di rayon perlu mencatat warga lansia untuk kunjungan rutin tiap bulan.

4. PEMBERDAYAAN PEMUDA & GENERASI DIGITAL (PAR & GP)
Libatkan pemuda gereja dalam tim multimedia, operator warta digital, musik ibadah, dan pengasuh Sekolah Minggu. Hal ini membentengi pemuda dari arus sekuler dan menumbuhkan rasa kepemilikan terhadap gereja lokal.

5. TRANSPARANSI KEUANGAN & KEMANDIRIAN GEREJA
Pertahankan tradisi warta keuangan terbuka tiap ibadah minggu. Ajak jemaat memahami persembahan persepuluhan dan tanggungan kas gereja sebagai ungkapan syukur atas berkat hasil bumi (jagung, kemiri, cengkeh) dan rezeki keluarga.`;

  return res.json({ success: true, text: fallback });
});

// ==========================================
// 5. [BARU] AI KONSELING & BIMBINGAN IMAN ROHANI
// ==========================================
aiRouter.post('/spiritual-counseling', async (req, res) => {
  const {
    topic = 'Mengatasi Kekhawatiran Hidup & Rezeki Keluarga',
    question = '',
    category = 'pergumulan-hidup',
    userContext = 'Warga jemaat GMIT di pedesaan Alor yang sedang bergumul',
  } = req.body;

  const prompt = `Anda adalah Pembimbing Iman Rohani & Konselor Pastoral Kristen beraliran Reformasi/Presbiterial (GMIT - Gereja Masehi Injili di Timor).
Warga jemaat atau pelayan gereja datang berkonsultasi mengenai:
- Kategori Masalah: ${category}
- Topik Konseling: ${topic}
- Pertanyaan / Pergumulan: "${question || topic}"
- Konteks Jemaat: ${userContext}

Susun bimbingan rohani yang penuh empati, kasih kebapaan, ramah budaya Nusa Tenggara Timur, dan berlandaskan Kitab Suci:
1. POKOK JAWABAN & PENGHIBURAN IMAN: (Bahasa yang hangat, menyejukkan hati yang cemas atau ragu, tidak menghakimi)
2. KEBENARAN ALKITAB: (Kutip 2-3 ayat firman Tuhan TB LAI yang relevan lengkap dengan penjelasan maknanya)
3. LANGKAH-LANGKAH PRAKTIS MENGHADAPINYA: (3 tindakan nyata kristiani dalam doa, keluarga, dan persekutuan)
4. DOA PRIBADI PENYERAHAN: (Naskah doa yang menyentuh hati jemaat saat bersujud di hadapan Tuhan)
5. ANJURAN PASTORAL: (Pesan bijak untuk tetap menjalin komunikasi dengan Pendeta atau Penatua/Diaken di Rayon setempat)`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah konselor rohani kristen dan gembala GMIT yang penuh hikmat, penuh empati, menguatkan yang letih lesu, dan selalu menuntun umat kembali kepada Kristus Sang Gembala Agung.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini counseling failed, using spiritual fallback:', err?.message);
  }

  const fallback = `BIMBINGAN IMAN & KONSELING ROHANI KRISTEN
Jemaat GMIT Betel Fuimelang — Menghadapi: ${topic}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PENGHIBURAN & PENGUATAN IMAN
Saudaraku yang dikasihi Kristus, pertama-tama ketahuilah bahwa pergumulan atau kekhawatiran yang sedang Anda rasakan bukanlah tanda bahwa Tuhan meninggalkan Anda. Di dalam Alkitab, tokoh-tokoh besar seperti Daud, Elia, bahkan para rasul pernah mengalami saat-saat di mana beban terasa begitu berat dan masa depan tampak berkabut. Namun Allah kita adalah "Immanuel"—Allah beserta kita. Ia tidak pernah membiarkan air mata doa saudara jatuh sia-sia ke tanah.

2. NATS FIRMAN TUHAN PENGUATAN (TB LAI):
- Filipi 4:6-7: "Janganlah hendaknya kamu kuatir tentang apa pun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus."
  *Makna:* Kekhawatiran ingin merampas damai kita, tetapi doa yang disertai ucapan syukur adalah kunci yang melepaskan damai surgawi ke dalam batin.
- Matius 6:26: "Pandanglah burung-burung di langit, yang tidak menabur dan tidak menuai dan tidak mengumpulkan bekal dalam lumbung, namun diberi makan oleh Bapamu yang di sorga. Bukankah kamu jauh melebihi burung-burung itu?"
  *Makna:* Bapa di sorga sangat menghargai nilai hidup saudara; Ia pasti mencukupkan kebutuhan saudara tepat pada waktu-Nya.

3. TIGA LANGKAH PRAKTIS ROHANI:
1. Mulailah dan Akhiri Hari dengan Mezbah Doa: Luangkan waktu 10 menit pagi dan malam untuk meletakkan semua beban di kaki salib Yesus sebelum mulai memikirkan pekerjaan.
2. Jangan Menyendiri: Libatkan diri dalam persekutuan ibadah rumah tangga Rayon di Betel Fuimelang. Beban yang dipikul bersama saudara seiman akan terasa jauh lebih ringan.
3. Fokus pada Hal yang Bisa Dikerjakan Hari Ini: Berusahalah dengan setia dan jujur di kebun, ladang, atau pekerjaan Anda, lalu serahkan hasil akhirnya kepada kedaulatan Allah.

4. DOA PRIBADI PENYERAHAN:
"Tuhan Yesus, kepada-Mu aku datang dengan hati yang lelah dan penuh beban. Engkau tahu setiap air mata, kekhawatiran keluarga, dan pergumulan yang tak sanggup kuucapkan dengan kata-kata. Ampuni aku bila sering kali aku bimbang dan meragukan kuasa pemeliharaan-Mu. Hari ini aku meletakkan seluruh kekhawatiranku ke dalam tangan-Mu. Berikan aku damai sejahtera dan kekuatan baru untuk melangkah. Pimpinlah aku selalu dalam terang kasih-Mu. Demi nama Yesus Kristus, Juruselamatku yang setia. Amin."

5. PESAN PASTORAL:
Jika beban ini terasa terlalu berat untuk ditanggung sendiri, jangan ragu untuk berbagi dengan Pendeta Ketua Majelis Jemaat atau Penatua/Diaken di Rayon Anda. Gereja ada untuk menjadi pelabuhan kasih dan penopang doa bagi setiap anggota kawanan domba Kristus.`;

  return res.json({ success: true, text: fallback });
});

// ==========================================
// 6. [BARU] AI SANTAPAN ROHANI & RENUNGAN HARIAN
// ==========================================
aiRouter.post('/daily-devotional', async (req, res) => {
  const {
    timing = 'Renungan Pagi Hari',
    theme = 'Ketenangan Batin & Kekuatan Menjalani Hari',
    scripture = 'Ratapan 3:22-23',
    audience = 'Keluarga Kristen GMIT',
  } = req.body;

  const prompt = `Anda adalah seorang penulis renungan rohani Kristen harian beraliran Reformed (GMIT - NTT).
Tolong buatkan Santapan Rohani Harian yang segar, menyentuh, dan menguatkan jiwa dengan parameter:
- Waktu Renungan: ${timing} (Pagi/Malam/Keluarga)
- Tema Renungan: ${theme}
- Rujukan Nats: ${scripture}
- Sasaran: ${audience}

Format Renungan:
1. JUDUL RENUNGAN: (Puitis, menyentuh, mudah dipahami)
2. AYAT EMAS HARI INI: (Kutip lengkap nats TB LAI)
3. INTI RENUNGAN: (2-3 paragraf hangat yang mengaitkan firman dengan kehidupan sehari-hari jemaat pedesaan/perkotaan)
4. REFLEKSI & APLIKASI: (1 tindakan praktis hari ini)
5. DOA PENYERAHAN DIRI: (Doa singkat yang dalam)
6. FORMAT PESAN WHATSAPP: (Teks rapi ber-emoji dan cetak tebal siap disebarkan ke grup WhatsApp Rayon GMIT Betel Fuimelang)`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah pelayan firman yang memiliki panggilan menulis santapan rohani harian yang memulihkan semangat, mengajarkan kesetiaan kristiani, dan mempererat persekutuan keluarga.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini devotional failed, using fallback:', err?.message);
  }

  const fallback = `SANTAPAN ROHANI HARIAN — GMIT BETEL FUIMELANG
Waktu: ${timing} | Tema: ${theme}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. JUDUL:
"Rahmat Baru di Setiap Fajar Menyingsing"

2. AYAT EMAS HARI INI:
"Tak berkesudahan kasih setia TUHAN, tak habis-habisnya rahmat-Nya, selalu baru tiap pagi; besar kesetiaan-Mu!" (Ratapan 3:22-23 - TB LAI)

3. INTI RENUNGAN:
Ketika fajar menyingsing di atas perbukitan Alor dan kokok ayam pertama terdengar di kampung, udara pagi mengingatkan kita bahwa hari kemarin telah berlalu bersama segala lelah dan kekurangannya. Hari ini adalah kanvas bersih yang Tuhan bentangkan kembali bagi hidup kita. 

Nabi Yeremia menulis kata-kata indah dalam Ratapan 3 justru ketika kota Yerusalem sedang hancur. Dalam situasi yang paling kelam sekalipun, mata iman Yeremia tidak terpaku pada abu reruntuhan, melainkan pada karakter Allah yang setia. Rahmat Tuhan tidak seperti bekal manusia yang bisa habis atau kedaluwarsa. Kasih setia Tuhan seperti mata air pegunungan yang senantiasa mengalir segar bagi siapa saja yang haus akan pertolongan-Nya.

Apapun tugas yang menanti bapak, ibu, dan saudara hari ini—di kebun, di laut, di sekolah, di kantor, maupun di dalam rumah tangga—ingatlah bahwa anugerah Tuhan cukup untuk menopang setiap detik langkah kita. Anda tidak melangkah sendirian.

4. REFLEKSI & APLIKASI PRAKTIS:
Tersenyumlah dan ucapkan sepatah kata penguatan kepada anggota keluarga Anda pagi ini: "Tuhan beserta kita hari ini."

5. DOA PENYERAHAN HARI INI:
"Tuhan Allah yang Maharahim, puji dan syukur kami naikkan atas nafas hidup dan terang fajar yang baru. Kami serahkan segenap jiwa dan raga, pikiran dan pekerjaan kami sepanjang hari ini ke dalam lindungan-Mu. Tuntun kaki kami agar tidak tersandung, jagalah lidah kami agar hanya menuturkan perkataan kasih, dan mampukan kami menjadi berkat bagi sesama di sekitar kami. Di dalam nama Tuhan Yesus Kristus kami berdoa. Amin."

6. FORMAT SIAP SHARE WHATSAPP:
🌅 *SANTAPAN ROHANI GMIT BETEL FUIMELANG*
_${timing} | ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}_

📖 *Ayat Hari Ini:*
_"Tak berkesudahan kasih setia TUHAN, tak habis-habisnya rahmat-Nya, selalu baru tiap pagi; besar kesetiaan-Mu!"_ *(Ratapan 3:22-23)*

🌿 *Mutiara Firman:*
Rahmat Tuhan tidak pernah habis. Seperti embun segar yang membasahi bumi Lembur Tengah di waktu pagi, demikianlah kasih setia Allah tercurah baru untuk menopang setiap langkah, kerja keras, dan doa keluarga kita hari ini. Jangan bimbang, Yesus setia beserta kita!

🙏 *Doa Singkat:*
_Tuhan, berkati keluarga kami, pulihkan yang lelah, dan cukupkan rezeki kami hari ini. Amin._

🕊️ _Salam Kasih & Doa dari Majelis Jemaat GMIT Betel Fuimelang_`;

  return res.json({ success: true, text: fallback });
});

// ==========================================
// 7. [BARU] AI PENUNTUN LITURGI & IBADAH KHUSUS
// ==========================================
aiRouter.post('/liturgy-order', async (req, res) => {
  const {
    serviceType = 'Ibadah Rumah Tangga / Persekutuan Rayon',
    theme = 'Keluarga yang Berakar dan Berbuah di Dalam Kristus',
    scripture = 'Yosua 24:15',
    rayon = 'Rayon I s/d IV GMIT Betel Fuimelang',
  } = req.body;

  const prompt = `Anda adalah ahli liturgi gerejawi GMIT (Gereja Masehi Injili di Timor).
Susunlah Tata Ibadah lengkap untuk:
- Jenis Ibadah: ${serviceType}
- Tema Ibadah: ${theme}
- Nats Alkitab: ${scripture}
- Tempat/Wilayah: ${rayon}

Susun Tata Ibadah GMIT yang tertib, hidup, partisipatif, lengkap dengan usulan nyanyian (KJ / PKJ / NKB / Kidung GMIT):
1. PANGGILAN BERIBADAH (Ajakan Liturgos)
2. VOTUM & SALAM (Pelayan & Jemaat)
3. NYANYIAN PEMBUKA (Pilih nomor lagu KJ/PKJ yang sesuai)
4. HUKUM KASIH / PETUNJUK HIDUP (Matius 22:37-40 atau nats lain)
5. PENGAKUAN DOSA & BERITA ANUGERAH (Liturgos & Pelayan)
6. NYANYIAN PENYESALAN / SYUKUR
7. PEMBERITAAN FIRMAN (Doa Epiklese, Bacaan Alkitab, Khotbah Singkat, Saat Teduh)
8. PENGAKUAN IMAN RASULI (Opsional / Bila Minggu)
9. PERSEMBAHAN SYUKUR (Ajakan memberi & Doa Persembahan)
10. DOA SYAFAAT BERSAMA (Pokok doa keluarga tuan rumah, rayon, orang sakit, gereja)
11. PENGUTUSAN & BERKAT RASULI`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah penyusun liturgi GMIT yang berpedoman pada Tata Gereja GMIT, berteologi Reformed, khidmat, dan mudah dipraktikkan oleh Majelis Rayon dan pemandu pujian.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini liturgy failed, using fallback:', err?.message);
  }

  const fallback = `TATA IBADAH GMIT BETEL FUIMELANG
Jenis Ibadah: ${serviceType}
Tema: ${theme}
Nats: ${scripture}
Wilayah: ${rayon}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PANGGILAN BERIBADAH
Liturgos: "Bapak, ibu, dan saudara-saudari yang dikasihi Tuhan Yesus Kristus. Pada sore/malam hari ini, kita bersekutu di rumah keluarga yang terkasih dalam naungan kasih Allah. Marilah kita menyatukan hati, merendahkan diri, dan mengarahkan pandangan kita kepada Sang Sumber Kehidupan. Jemaat diundang berdiri."

2. VOTUM & SALAM
Pelayan : "Pertolongan kita adalah dalam nama TUHAN yang menjadikan langit dan bumi, yang memelihara kesetiaan-Nya sampai selama-lamanya dan tidak meninggalkan perbuatan tangan-Nya."
Jemaat  : "Amin."
Pelayan : "Kasih karunia dan damai sejahtera dari Allah Bapa kita, dan dari Tuhan Yesus Kristus menyertai saudara sekalian."
Jemaat  : "Dan menyertai saudara juga." (Jemaat duduk kembali)

3. NYANYIAN PEMBUKA:
Menyanyikan KJ No. 10 - "Pujilah Tuhan, Sang Raja" (Bait 1 & 2)

4. PENGAKUAN DOSA & BERITA ANUGERAH
Liturgos: "Marilah kita memeriksa hati kita dan dengan tulus mengakui segala kelemahan, kelalaian, dan dosa kita di hadapan Tuhan..."
(Saat Teduh Sejenak)
Doa Pengakuan Dosa dipimpin Liturgos.
Pelayan : "Dengarkanlah berita anugerah pengampunan dari firman Tuhan: 'Jika kita mengaku dosa kita, maka Ia adalah setia dan adil, sehingga Ia akan mengampuni segala dosa kita dan menyucikan kita dari segala kejahatan' (1 Yohanes 1:9)."

5. NYANYIAN SYUKUR PENGAMPUNAN:
Menyanyikan PKJ No. 179 - "Kasih Paling Agung" (Bait 1)

6. PEMBERITAAN FIRMAN TUHAN
a. Doa Epiklese (Memohon Bimbingan Roh Kudus)
b. Pembacaan Kitab Suci: ${scripture}
c. Khotbah / Renungan Pastoral Singkat (10-15 Menit)
d. Saat Teduh & Perenungan Batin

7. PERSEMBAHAN SYUKUR
Diaken/Liturgos: "Marilah kita mengucap syukur kepada Tuhan melalui persembahan yang kita bawa dengan hati yang rela, mengingat firman-Nya: 'Hendaklah masing-masing memberikan menurut kerelaan hatinya, jangan dengan sedih hati atau karena paksaan, sebab Allah mengasihi orang yang memberi dengan sukacita'."
Menyanyikan KJ No. 289 - "Tuhan, Pencipta Semesta" (Sambil kantong persembahan diedarkan)
Doa Persembahan dipimpin oleh salah seorang anggota keluarga atau Diaken.

8. DOA SYAFAAT BERSAMA
Pokok Doa:
1. Mengucap syukur atas kesehatan dan berkat bagi keluarga tuan rumah tempat ibadah.
2. Mendoakan anggota keluarga yang sedang sakit di rumah atau rumah sakit.
3. Mendoakan pendidikan anak-anak sekolah dan masa depan pemuda gereja.
4. Mendoakan usaha pertanian, perkebunan, dan pekerjaan jemaat di Desa Lembur Tengah.
5. Ditutup dengan bersama-sama mengucapkan "Doa Bapa Kami".

9. PENGUTUSAN & BERKAT
Pelayan : "Pulanglah ke dalam kehidupanmu sehari-hari dengan damai sejahtera. Jadilah garam dan terang di tengah keluarga dan masyarakat. Terimalah berkat Tuhan: TUHAN memberkati engkau dan melindungi engkau; TUHAN menyinari engkau dengan wajah-Nya dan memberi engkau kasih karunia; TUHAN menghadapkan wajah-Nya kepadamu dan memberi engkau damai sejahtera."
Jemaat  : (Menyanyikan) "Amin... Amin... Amin!" (Haleluya / NKB 225)`;

  return res.json({ success: true, text: fallback });
});

// ==========================================
// 8. [BARU] AI SEKOLAH MINGGU & PEMBINA PAR GMIT
// ==========================================
aiRouter.post('/sunday-school', async (req, res) => {
  const {
    ageGroup = 'Anak Tanggung (Usia 7-10 Tahun)',
    storyTheme = 'Yesus Meredakan Angin Ribut di Danau',
    scripture = 'Markus 4:35-41',
  } = req.body;

  const prompt = `Anda adalah Pengasuh PAR (Persekutuan Anak & Remaja) GMIT yang sangat disukai anak-anak di Alor NTT.
Susunlah bahan ajar Sekolah Minggu yang hidup, ceria, interaktif, dan penuh teladan iman dengan data:
- Kelompok Usia: ${ageGroup}
- Judul / Cerita Alkitab: ${storyTheme}
- Nats Alkitab: ${scripture}

Format Bahan Ajar:
1. JUDUL CERITA MENARIK: (Gaya anak-anak yang memicu rasa ingin tahu)
2. AYAT HAFALAN MINGGU INI: (Pendek, mudah dihafal dengan gerakan tangan)
3. ALAT PERAGA SEDERHANA: (Bahan alamiah yang ada di kampung: tempurung kelapa, daun, batu, mangkok air)
4. NASKAH BERCERITA INTERAKTIF: (Ada dialog, tiruan suara angin/ombak, dan pertanyaan langsung ke anak)
5. LAGU PUJIAN ANAK: (Judul lagu ceria Sekolah Minggu yang pas)
6. KUIS / PERMAINAN SERU (3 Pertanyaan):
7. AKTIVITAS TANGAN / KREATIF: (Craft sederhana yang bisa dibawa pulang ke orang tua)
8. DOA BERSAMA ANAK-ANAK: (Bahasa anak-anak yang tulus)`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah guru Sekolah Minggu GMIT yang penuh sukacita, kreatif, komunikatif, dan mengasihi dunia anak-anak.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini sunday school failed, using fallback:', err?.message);
  }

  const fallback = `BAHAN AJAR SEKOLAH MINGGU / PAR GMIT BETEL FUIMELANG
Kelompok: ${ageGroup} | Cerita: ${storyTheme}
Nats: ${scripture}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. JUDUL CERITA:
"Jangan Takut, Ada Yesus di Perahu Kita!"

2. AYAT HAFALAN MINGGU INI (Disertai Gerakan):
"Mengapa kamu begitu takut? Mengapa kamu tidak percaya?" (Markus 4:40)
*Gerakan:* Tangan di dada saat kata 'takut', kedua tangan terbuka ke atas saat kata 'percaya'.

3. ALAT PERAGA SEDERHANA ALOR:
- Sebuah wadah/baskom berisi air.
- Perahu kecil yang dilipat dari daun pisang atau kertas bekas.
- Kipas dari anyaman daun lontar untuk membuat hembusan angin ombak tiruan.

4. NASKAH BERCERITA INTERAKTIF:
(Guru menyapa dengan senyum lebar)
"Halo adik-adik semua! Siapa di sini yang pernah naik perahu motor di laut Kalabahi? Angkat tangan! Waktu perahu bergoyang kena ombak, rasanya bagaimana? Takut atau seru?
Nah, dengarkan ya! Suatu hari, Yesus dan murid-murid-Nya naik perahu di danau besar. Yesus yang lelah setelah mengajar seharian tidur nyenyak di bagian belakang perahu beralaskan bantal.
Tiba-tiba... Wuuuushhhh! (Guru mengajak anak meniup udara bersama-sama: Wuuushhh!).
Angin kencang datang! Gelombang air masuk ke perahu! Byurrr! Murid-murid panik: 'Tuhan, tolong! Kita mau tenggelam!'
Tetapi apa yang Yesus lakukan adik-adik? Yesus bangun, lalu memandang angin dan ombak itu sambil berkata: 'Diam! Tenanglah!'
Seketika itu juga danau menjadi sangat teduh dan tenang sekali. Wow! Angin dan ombak pun taat pada perintah Yesus!"

5. LAGU PUJIAN SEKOLAH MINGGU:
"Bila Badai Menyerang Hidupmu, Jangan Takut Yesus Besertamu" & "Yesus di Dalam Perahu, Kita Tersenyum Tenang Menghadapi Badai."

6. KUIS SERU UNTUK ADIK-ADIK:
1. Apa yang sedang Yesus lakukan sebelum angin ribut datang? (Jawab: Sedang tidur di perahu)
2. Apa perkataan Yesus yang membuat angin dan danau menjadi tenang? (Jawab: "Diam! Tenanglah!")
3. Kalau kita sedang takut gelap atau takut sakit di rumah, kepada siapa kita harus berdoa minta tolong? (Jawab: Kepada Tuhan Yesus!)

7. AKTIVITAS TANGAN KREATIF:
Membuat perahu kertas bertuliskan nama masing-masing anak dan menulis ayat hafalan di layar perahu untuk ditempel di dinding kamar tidur rumah.

8. DOA PENUTUP ANAK:
"Tuhan Yesus yang baik, terima kasih karena Engkau selalu menjaga kami. Kalau kami takut, ingatkan kami bahwa Engkau ada dekat kami. Berkatilah bapak, mama, bapak guru, ibu guru, dan teman-teman kami. Dalam nama Tuhan Yesus, kami berdoa. Amin!"`;

  return res.json({ success: true, text: fallback });
});

// ==========================================
// 9. [BARU] AI PENELAAHAN ALKITAB (PA RAYON & KATEGORIAL)
// ==========================================
aiRouter.post('/bible-study', async (req, res) => {
  const {
    scripture = 'Yakobus 2:14-26',
    topic = 'Iman Tanpa Perbuatan Adalah Mati',
    audience = 'Persekutuan Doa Rayon I s/d IV GMIT Betel Fuimelang',
  } = req.body;

  const prompt = `Anda adalah seorang teolog dan fasilitator Penelaahan Alkitab (PA) GMIT yang handal.
Susunlah Panduan Bahan PA Rayon / Kategorial yang mendalam, membangkitkan diskusi akrab antar-warga, dan praktis dengan rincian:
- Nats Alkitab: ${scripture}
- Topik Bahasan: ${topic}
- Peserta: ${audience}

Format Panduan PA:
1. PENGANTAR & TUJUAN PA: (Apa yang ingin dicapai melalui PA ini)
2. LATAR BELAKANG HISTORIS & TEOLOGIS: (Konteks penulisan nats)
3. MAKNA KATA KUNCI & PENJELASAN AYAT POKOK
4. 4 PERTANYAAN DISKUSI KELOMPOK RAYON:
   - Pertanyaan 1 (Observasi fakta teks)
   - Pertanyaan 2 (Interpretasi makna nats)
   - Pertanyaan 3 (Konfrontasi pergumulan nyata di kampung/lingkungan)
   - Pertanyaan 4 (Aplikasi konkret sepekan ke depan)
5. KESIMPULAN FASILITATOR: (Ringkasan kebenaran firman untuk ditutup)
6. KOMITMEN BERSAMA & DOA PENUTUP`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah fasilitator PA Alkitab yang mendorong partisipasi aktif, tidak menggurui, dan menuntun persekutuan jemaat untuk hidup saling mengasihi.',
        },
      });
      return res.json({ success: true, text: response.text || '' });
    }
  } catch (err: any) {
    console.warn('Gemini bible study failed, using fallback:', err?.message);
  }

  const fallback = `PANDUAN PENELAAHAN ALKITAB (PA) RAYON
GMIT BETEL FUIMELANG — DESA LEMBUR TENGAH
Nats: ${scripture} | Topik: ${topic}
Peserta: ${audience}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PENGANTAR & TUJUAN PA:
Tujuan PA ini adalah agar setiap warga jemaat di rayon memahami bahwa pengakuan iman Kristen kita bukan sekadar ucapan bibir di hari Minggu, melainkan harus terbukti nyata dalam kepedulian sosial, gotong-royong, dan kasih persaudaraan sehari-hari.

2. LATAR BELAKANG TEOLOGIS:
Surat Yakobus ditulis untuk jemaat Kristen mula-mula yang tersebar. Banyak di antara mereka yang rajin beribadah namun tidak peduli kepada saudara seiman yang miskin dan lapar. Yakobus menegaskan bahwa iman sejati adalah iman yang bergerak, bekerja, dan membuahkan perbuatan baik.

3. MAKNA AYAT KUNCI:
- "Apakah gunanya... jika seseorang mengatakan memiliki iman, tetapi ia tidak mempunyai perbuatan?" (ay. 14): Yakobus tidak mempertentangkan kasih karunia Allah, melainkan menyadarkan bahwa buah dari pohon anugerah adalah kasih dalam perbuatan nyata.
- Teladan Abraham dan Rahab (ay. 21-25): Keduanya membuktikan kepercayaannya kepada Allah melalui tindakan ketaatan yang nyata.

4. EMPAT PERTANYAAN DISKUSI RAYON:
1. [Observasi] Menurut Yakobus 2:15-16, apa contoh konkret yang diberikan Yakobus tentang iman yang tidak disertai perbuatan?
2. [Interpretasi] Mengapa iman yang tidak memiliki perbuatan diumpamakan seperti tubuh tanpa roh (mati)?
3. [Pergumulan Nyata] Di lingkungan RT/Rayon kita di Fuimelang, apa saja tantangan yang sering membuat kita sulit mempraktikkan kasih kepada tetangga yang membutuhkan?
4. [Aplikasi Konkret] Minggu ini, satu tindakan nyata apa yang dapat kita lakukan sebagai keluarga atau kelompok rayon untuk menolong sesama yang sedang kesusahan?

5. KESIMPULAN FASILITATOR:
Iman sejati tidak tinggal diam di dalam kepala. Iman sejati memiliki mata yang melihat penderitaan sesama, memiliki telinga yang mendengar keluhan tetangga, dan memiliki tangan yang terulur untuk menolong. Jemaat GMIT Betel Fuimelang dipanggil menjadi jemaat yang berbuah lebat di tanah Alor.

6. KOMITMEN & DOA PENUTUP:
"Bapa yang Mahakasih, terima kasih atas firman-Mu yang menegur dan memperbaharui hidup kami. Ampunilah kami bila iman kami sering kali hanya sebatas kata-kata. Berilah kami Roh Kudus agar tangan kami ringan menolong sesama, hati kami lembut mengampuni, dan hidup kami menjadi saluran berkat di Rayon kami masing-masing. Di dalam nama Yesus Kristus, Sang Teladan Kasih Sejati. Amin."`;

  return res.json({ success: true, text: fallback });
});

// 10. AI Generator Berita & Agenda Kegiatan Gereja Otomatis
aiRouter.post('/church-news', async (req, res) => {
  const {
    mode = 'news', // 'news' (Berita & Bakti) | 'agenda' (Agenda & Jadwal Kegiatan)
    category = 'Kegiatan Jemaat',
    title = '',
    date = '',
    startTime = '',
    endTime = '',
    location = '',
    coordinator = '',
    participants = '',
    notes = '',
    imageUrl = '',
  } = req.body;

  const isAgenda = mode === 'agenda';

  const prompt = isAgenda
    ? `Anda adalah sekretariat liturgi dan panitia hari raya/kegiatan gerejawi di Gereja Masehi Injili di Timor (GMIT) Betel Fuimelang, Desa Lembur Tengah, Klasis Alor Tengah Utara, Kabupaten Alor, NTT.
Tugas Anda adalah menyusun AGENDA KEGIATAN & RUNDOWN PELAYANAN GEREJAWI yang sangat rinci, teratur, praktis, dan bersemangat kristiani dengan data:
- Kategori Agenda: ${category}
- Nama/Tema Acara: ${title}
- Hari & Tanggal: ${date}
- Waktu: ${startTime} s/d ${endTime} WITA
- Tempat/Lokasi: ${location}
- Koordinator / Penanggung Jawab: ${coordinator}
- Sasaran / Peserta: ${participants}
- Hal-Hal Khusus / Perlengkapan: ${notes}

Susun rancangan agenda ini dalam format yang sangat rapi dan siap dijalankan:

1. NAMA KEGIATAN & TEMA RESMI:
(Judul dan tema teologis yang memberi motivasi pelayanan)

2. AYAT PENDORONG & LANDASAN TEOLOGIS:
(Nats Alkitab penuntun persiapan ibadah / kegiatan, misal 1 Korintus 14:40 atau Roma 12:11)

3. RUNDOWN JADWAL ACARA TERPERINCI (WITA):
- Waktu mulai hingga selesai
- Rincian tahapan (Doa Pembukaan, Pujian, Sambutan/Arahan, Inti Kegiatan, Istirahat Kasih, Evaluasi & Doa Pengutusan)
- Penanggung Jawab / Seksi Pelaksana untuk setiap sesi

4. DAFTAR PERLENGKAPAN & PERSIAPAN:
- Daftar alat yang perlu dibawa oleh jemaat/peserta
- Pembagian konsumsi dan logistik persaudaraan

5. FORMAT BROADCAST UNDANGAN WHATSAPP JEMAAT:
(Format teks undangan ber-emoji kristiani yang ramah, sopan, dan jelas untuk disebar ke grup WA Rayon I - IV & Kategorial)

6. DOA PERSIAPAN & PENGUTUSAN PANITIA:
(Doa khusus bagi majelis, panitia, dan seluruh jemaat agar kegiatan berjalan lancar dalam damai sejahtera Kristus)`
    : `Anda adalah jurnalis gerejawi dan sekretariat komunikasi GMIT Betel Fuimelang, Desa Lembur Tengah, Klasis Alor Tengah Utara, NTT.
Tugas Anda adalah menyusun Laporan Berita / Warta Liputan Kegiatan Gerejawi & Bakti Jumat yang sangat hidup, inspiratif, kristiani, dan resmi dengan rincian:
- Kategori Kegiatan: ${category}
- Nama/Tema Kegiatan: ${title}
- Waktu Pelaksanaan: ${date}
- Tempat/Lokasi: ${location}
- Koordinator / Penanggung Jawab: ${coordinator}
- Peserta/Partisipasi: ${participants}
- Catatan / Hasil Pekerjaan: ${notes}

Buatlah laporan berita gereja yang lengkap dengan bagian-bagian berikut:

1. JUDUL BERITA RESMI:
(Judul yang menarik, menggugah persaudaraan, dan bernuansa iman Kristen GMIT)

2. AYAT ALKITAB RUJUKAN:
(Ayat penopang semangat kerja bersama, gotong royong, dan pelayanan kasih, contoh Kolose 3:23, Galatia 6:2, atau Mazmur 133:1)

3. RINGKASAN WARTA SINGKAT (1 Paragraf):
(Intisari kegiatan untuk dibacakan pada warta mimbar atau rangkuman cepat)

4. LIPUTAN BERITA LENGKAP:
- Pembukaan & Latar Belakang Semangat Gotong Royong
- Jalannya kegiatan hanya berdasarkan catatan; tandai [perlu konfirmasi] bila belum tersedia
- Hasil nyata hanya berdasarkan catatan; jangan membuat jumlah atau klaim keberhasilan
- Kesaksian/pesan hanya bila kutipan diberikan; jangan membuat kutipan
- Usulan tindak lanjut harus diberi label usulan, bukan keputusan resmi

5. TEKS FORMAT WHATSAPP SIAP SEBAR:
(Format teks dengan emoji kristiani, tebal, miring, poin-poin rapi, cocok dibagikan ke grup WA Rayon & Jemaat GMIT)

6. DOA SYUKUR PENUTUP KEGIATAN:
(Naskah doa penutup tanpa mengklaim kelancaran atau hasil yang tidak tercantum dalam catatan)`;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: isAgenda
            ? 'Anda adalah koordinator pelayanan jemaat GMIT Betel Fuimelang yang teliti, tertib organisatoris, dan berjiwa penggembalaan kristiani. Gunakan hanya data input untuk fakta kegiatan; jangan mengarang tanggal, lokasi, peserta, atau hasil.'
            : 'Anda adalah redaktur media jemaat GMIT yang berwawasan kasih Kristus dan teliti dalam penyusunan berita pelayanan gereja. Jangan mengarang jumlah peserta, hasil pekerjaan, kutipan kesaksian, atau keberhasilan; tandai informasi yang perlu dikonfirmasi.',
        },
      });
      return res.json({
        success: true,
        text: response.text || '',
        mode,
        category,
        title,
        date,
        startTime,
        endTime,
        location,
        coordinator,
        imageUrl,
      });
    }
  } catch (err: any) {
    console.warn('Gemini church news/agenda failed, using fallback:', err?.message);
  }

  const fallback = isAgenda
    ? `DRAF AGENDA & JADWAL PELAYANAN KEGIATAN GEREJA
GMIT BETEL FUIMELANG — KLASIS ALOR TENGAH UTARA
Kategori: ${category || '[kategori belum diisi]'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Draf ini hanya memakai data yang dimasukkan. Lengkapi dan sahkan sebelum dipublikasikan.

1. NAMA KEGIATAN:
${title || '[nama kegiatan belum diisi]'}

2. LANDASAN PELAYANAN:
"Segala sesuatu harus berlangsung dengan sopan dan teratur." (1 Korintus 14:40)

3. RANCANGAN RUNDOWN (WITA):
• ${startTime || '[waktu mulai]'} — Pembukaan dan doa.
• [atur waktu] — Pelaksanaan inti: ${title || '[nama kegiatan]'}.
• ${endTime || '[waktu selesai]'} — Evaluasi, doa, dan penutupan.

4. DATA PERSIAPAN:
• Lokasi: ${location || '[lengkapi lokasi]'}
• Peserta: ${participants || '[lengkapi peserta]'}
• Koordinator: ${coordinator || '[lengkapi koordinator]'}
• Catatan/perlengkapan: ${notes || '[lengkapi kebutuhan kegiatan]'}

5. DRAF UNDANGAN WHATSAPP:
Shalom. Majelis mengundang jemaat untuk ${title || '[nama kegiatan]'} pada ${date || '[tanggal]'}, pukul ${startTime || '[waktu]'}–${endTime || '[waktu]'} WITA di ${location || '[lokasi]'}. Koordinator: ${coordinator || '[nama]'}.
Catatan: ${notes || '[tambahkan catatan yang diperlukan]'}

6. DOA PERSIAPAN:
"Bapa Surgawi, berikanlah hikmat kepada Majelis dan panitia dalam mempersiapkan ${title || 'kegiatan ini'}. Sertai seluruh peserta dan jadikan pelayanan ini berlangsung tertib, aman, dan untuk kemuliaan nama-Mu. Amin."`
    : `DRAF LAPORAN WARTA & BERITA KEGIATAN GEREJA
GMIT BETEL FUIMELANG — KLASIS ALOR TENGAH UTARA
Kategori: ${category || '[kategori belum diisi]'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Draf ini tidak menambahkan hasil, jumlah peserta, atau pekerjaan yang tidak diberikan. Verifikasi sebelum dipublikasikan.

1. JUDUL BERITA:
${title || '[judul kegiatan belum diisi]'}

2. AYAT RUJUKAN:
"Segala sesuatu yang kamu lakukan, perbuatlah dengan segenap hatimu seperti untuk Tuhan dan bukan untuk manusia." (Kolose 3:23)

3. RINGKASAN BERDASARKAN INPUT:
Kegiatan ${title || '[nama kegiatan]'} pada ${date || '[tanggal]'} di ${location || '[lokasi]'}, dikoordinasi oleh ${coordinator || '[koordinator]'}.
Peserta: ${participants || '[lengkapi peserta]'}.

4. CATATAN / HASIL YANG DILAPORKAN:
${notes || '[Lengkapi hasil nyata kegiatan setelah dikonfirmasi. Jangan menuliskan hasil yang belum terjadi.]'}

5. DRAF PESAN WHATSAPP:
Shalom. Berikut informasi kegiatan ${title || '[nama kegiatan]'} pada ${date || '[tanggal]'} di ${location || '[lokasi]'}.
Peserta: ${participants || '[peserta]'}.
Catatan/hasil: ${notes || '[lengkapi setelah konfirmasi]'}.

6. DOA PENUTUP:
"Bapa Surgawi, kami menyerahkan setiap pelayanan jemaat ke dalam penyertaan-Mu. Berkatilah Majelis, koordinator, dan seluruh peserta, dan tuntun kami untuk menyampaikan laporan dengan jujur serta membangun persekutuan. Amin."`;

  return res.json({
    success: true,
    text: fallback,
    mode,
    category,
    title,
    date,
    startTime,
    endTime,
    location,
    coordinator,
    imageUrl,
  });
});

