import { Router } from 'express';
import { getDb } from './db.ts';
import { getRequestUser } from './auth.ts';

export const n8nRouter = Router();

// Helper to get or create active n8n configuration
export function getN8nConfig() {
  const db = getDb();
  let row = db.prepare('SELECT * FROM n8n_config WHERE id = ?').get('default') as any;
  if (!row) {
    const defaultKey = 'n8n_bf_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    db.prepare(`
      INSERT INTO n8n_config (id, api_key, is_enabled, webhook_url, auto_broadcast_warta, notes, updated_at)
      VALUES (?, ?, 1, '', 1, 'Koneksi n8n WhatsApp Bot GMIT Betel Fuimelang', ?)
    `).run('default', defaultKey, new Date().toISOString());
    row = db.prepare('SELECT * FROM n8n_config WHERE id = ?').get('default') as any;
  }
  return row;
}

// Authentication middleware for n8n endpoints
function requireN8nAuth(req: any, res: any, next: any) {
  const config = getN8nConfig();

  // If already authenticated as an application user (e.g. admin browsing the UI)
  const appUser = getRequestUser(req);
  if (appUser && (appUser.role === 'Super Admin' || appUser.role === 'Admin')) {
    req.n8nAuthBy = 'admin_session';
    return next();
  }

  // Check if n8n integration is disabled
  if (!config.is_enabled) {
    return res.status(403).json({
      success: false,
      message: 'Integrasi n8n WhatsApp Bot dinonaktifkan oleh administrator.',
    });
  }

  // Check API Key
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-n8n-api-key'];
  const queryKey = req.query.api_key;

  let providedKey = '';
  if (customHeader) {
    providedKey = String(customHeader).trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  } else if (queryKey) {
    providedKey = String(queryKey).trim();
  }

  if (!providedKey || providedKey !== config.api_key) {
    return res.status(401).json({
      success: false,
      message: 'API Key n8n tidak valid atau tidak disertakan (Gunakan Header X-N8N-API-KEY atau Authorization: Bearer <KEY>).',
    });
  }

  req.n8nAuthBy = 'api_key';
  return next();
}

// 1. Health check & status
n8nRouter.get('/health', (req, res) => {
  const config = getN8nConfig();
  return res.json({
    success: true,
    status: 'online',
    church: 'GMIT BETEL FUIMELANG',
    service: 'SYSJEGER n8n WhatsApp Gateway',
    version: '2.1.0',
    integrationEnabled: Boolean(config.is_enabled),
    hasWebhookUrl: Boolean(config.webhook_url),
    timestamp: new Date().toISOString(),
  });
});

// 2. Get Integration Config (Admin / internal use)
n8nRouter.get('/config', (req, res) => {
  const appUser = getRequestUser(req);
  if (!appUser || (appUser.role !== 'Super Admin' && appUser.role !== 'Admin')) {
    return res.status(403).json({ success: false, message: 'Hanya Administrator yang dapat melihat konfigurasi n8n.' });
  }

  const config = getN8nConfig();
  const db = getDb();
  const inboxCount = (db.prepare('SELECT count(*) as count FROM whatsapp_inbox WHERE status = ?').get('Baru') as any)?.count || 0;

  return res.json({
    success: true,
    config: {
      apiKey: config.api_key,
      isEnabled: Boolean(config.is_enabled),
      webhookUrl: config.webhook_url || '',
      autoBroadcastWarta: Boolean(config.auto_broadcast_warta),
      notes: config.notes || '',
      updatedAt: config.updated_at,
    },
    inboxUnreadCount: inboxCount,
  });
});

// 3. Update Integration Config / Regenerate Key
n8nRouter.post('/config', (req, res) => {
  const appUser = getRequestUser(req);
  if (!appUser || (appUser.role !== 'Super Admin' && appUser.role !== 'Admin')) {
    return res.status(403).json({ success: false, message: 'Hanya Administrator yang dapat mengubah konfigurasi n8n.' });
  }

  const { isEnabled, webhookUrl, autoBroadcastWarta, notes, regenerateKey } = req.body || {};
  const db = getDb();
  let current = getN8nConfig();

  let newKey = current.api_key;
  if (regenerateKey) {
    newKey = 'n8n_bf_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  }

  const updatedEnabled = isEnabled !== undefined ? (isEnabled ? 1 : 0) : current.is_enabled;
  const updatedWebhook = webhookUrl !== undefined ? String(webhookUrl).trim() : current.webhook_url;
  const updatedAutoBroadcast = autoBroadcastWarta !== undefined ? (autoBroadcastWarta ? 1 : 0) : current.auto_broadcast_warta;
  const updatedNotes = notes !== undefined ? String(notes) : current.notes;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE n8n_config
    SET api_key = ?, is_enabled = ?, webhook_url = ?, auto_broadcast_warta = ?, notes = ?, updated_at = ?
    WHERE id = 'default'
  `).run(newKey, updatedEnabled, updatedWebhook, updatedAutoBroadcast, updatedNotes, now);

  return res.json({
    success: true,
    message: regenerateKey ? 'API Key berhasil diperbarui dan konfigurasi tersimpan' : 'Konfigurasi n8n berhasil diperbarui',
    config: {
      apiKey: newKey,
      isEnabled: Boolean(updatedEnabled),
      webhookUrl: updatedWebhook,
      autoBroadcastWarta: Boolean(updatedAutoBroadcast),
      notes: updatedNotes,
      updatedAt: now,
    },
  });
});

// 4. GET /api/n8n/warta/latest - Returns formatted warta for WhatsApp Bot responses
n8nRouter.get('/warta/latest', requireN8nAuth, (req, res) => {
  const db = getDb();
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '5'), 10), 1), 10);

  const announcements = db.prepare(`
    SELECT id, title, date, category, content, author, is_important, image_url
    FROM announcements
    ORDER BY is_important DESC, date DESC
    LIMIT ?
  `).all(limit) as any[];

  // Build a WhatsApp-ready text summary
  let waSummary = `*WARTA JEMAAT & PENGUMUMAN GMIT BETEL FUIMELANG*\n`;
  waSummary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (announcements.length === 0) {
    waSummary += `Saat ini belum ada pengumuman warta aktif yang diterbitkan.\n`;
  } else {
    announcements.forEach((a, idx) => {
      const num = idx + 1;
      const star = a.is_important ? '⭐ ' : '';
      waSummary += `*${num}. ${star}${a.title.toUpperCase()}*\n`;
      waSummary += `🏷️ Kategori: ${a.category}\n`;
      if (a.date) waSummary += `📅 Tanggal: ${a.date}\n`;
      waSummary += `📝 ${a.content}\n`;
      if (a.author) waSummary += `👤 PJ: ${a.author}\n`;
      waSummary += `\n`;
    });
  }

  waSummary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  waSummary += `Tuhan Yesus Kepala Gereja Memberkati Kita Sekalian. 🙏\n_Majelis Jemaat GMIT Betel Fuimelang_`;

  return res.json({
    success: true,
    count: announcements.length,
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      date: a.date,
      content: a.content,
      author: a.author,
      isImportant: Boolean(a.is_important),
      imageUrl: a.image_url || null,
    })),
    whatsapp_message: waSummary,
  });
});

// 5. GET /api/n8n/schedules/upcoming - Returns worship schedule for WhatsApp Bot
n8nRouter.get('/schedules/upcoming', requireN8nAuth, (req, res) => {
  const db = getDb();
  const schedules = db.prepare(`
    SELECT * FROM service_schedules
    ORDER BY service_date ASC
    LIMIT 3
  `).all() as any[];

  let waText = `*JADWAL IBADAH & PELAYANAN GMIT BETEL FUIMELANG*\n`;
  waText += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (schedules.length === 0) {
    waText += `Jadwal ibadah mendatang sedang disiapkan oleh Majelis Jemaat.\n`;
  } else {
    schedules.forEach((s) => {
      waText += `⛪ *${s.service_name.toUpperCase()}*\n`;
      waText += `🗓️ Tanggal: ${s.service_date}\n`;
      waText += `🎙️ Pelayan Firman / Pengkhotbah: ${s.preacher || '-'}\n`;
      waText += `📖 Liturgos: ${s.liturgist || '-'}\n`;
      waText += `👥 Penatua Bertugas: ${s.elder_duty || '-'}\n`;
      waText += `🤝 Diaken Bertugas: ${s.deacon_duty || '-'}\n`;
      waText += `🎵 Pemandu Lagu & Organis: ${s.song_leader || '-'} / ${s.musicians || '-'}\n`;
      if (s.notes) waText += `📌 Catatan: ${s.notes}\n`;
      waText += `\n`;
    });
  }

  waText += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  waText += `Mari kita bersekutu dan memuji Tuhan bersama. Shalom! 🙏`;

  return res.json({
    success: true,
    count: schedules.length,
    schedules,
    whatsapp_message: waText,
  });
});

// 6. POST /api/n8n/members/lookup - Search member by Phone (WA sender), NIK, or Name
n8nRouter.post('/members/lookup', requireN8nAuth, (req, res) => {
  const { query, phone, nik, name } = req.body || {};
  const db = getDb();

  let members: any[] = [];
  const searchTerm = String(query || phone || nik || name || '').trim();

  if (!searchTerm) {
    return res.status(400).json({
      success: false,
      message: 'Parameter query, phone, nik, atau name wajib diisi.',
    });
  }

  // Normalize phone digits
  const digitsOnly = searchTerm.replace(/\D/g, '');
  let phoneAlternative = '';
  if (digitsOnly.startsWith('62')) {
    phoneAlternative = '0' + digitsOnly.substring(2);
  } else if (digitsOnly.startsWith('0')) {
    phoneAlternative = '62' + digitsOnly.substring(1);
  }

  // Query database with rayon and family join
  members = db.prepare(`
    SELECT m.id, m.member_no, m.full_name, m.nickname, m.family_role, m.gender,
           m.birth_date, m.phone, m.marital_status, m.membership_status,
           m.baptism_status, m.confirmation_status,
           r.name as rayon_name, r.code as rayon_code,
           f.family_no, f.head_of_family_name
    FROM members m
    LEFT JOIN rayons r ON m.rayon_id = r.id
    LEFT JOIN families f ON m.family_id = f.id
    WHERE m.phone = ? OR m.phone = ? OR m.nik = ? OR m.member_no = ?
       OR m.full_name LIKE ? OR m.nickname LIKE ?
    LIMIT 5
  `).all(
    digitsOnly,
    phoneAlternative,
    digitsOnly,
    searchTerm,
    `%${searchTerm}%`,
    `%${searchTerm}%`
  ) as any[];

  let waResponse = '';
  if (members.length === 0) {
    waResponse = `Mohon maaf, data jemaat untuk "${searchTerm}" belum ditemukan di database GMIT Betel Fuimelang.\n\nSilakan pastikan nomor HP atau ejaan nama sesuai, atau hubungi Sekretariat Majelis Jemaat untuk verifikasi pendaftaran data jemaat.`;
  } else {
    waResponse = `*HASIL PENCARIAN DATA JEMAAT GMIT BETEL FUIMELANG*\n`;
    waResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    members.forEach((m, idx) => {
      waResponse += `👤 *${m.full_name.toUpperCase()}*\n`;
      waResponse += `🔢 No. Anggota: ${m.member_no}\n`;
      waResponse += `🏠 No. Kartu Keluarga: ${m.family_no || '-'}\n`;
      waResponse += `👑 Kepala Keluarga: ${m.head_of_family_name || '-'}\n`;
      waResponse += `📍 Rayon: ${m.rayon_name || '-'}\n`;
      waResponse += `📜 Status Baptis: ${m.baptism_status}\n`;
      waResponse += `🕊️ Status Sidi: ${m.confirmation_status}\n`;
      waResponse += `🏷️ Status Keanggotaan: ${m.membership_status}\n`;
      if (idx < members.length - 1) waResponse += `-------------------------\n`;
    });
    waResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    waResponse += `Untuk perubahan atau perbaikan data, silakan ajukan melalui bot ini atau Sekretariat Majelis.`;
  }

  return res.json({
    success: true,
    found: members.length > 0,
    count: members.length,
    members: members.map((m) => ({
      id: m.id,
      memberNo: m.member_no,
      fullName: m.full_name,
      familyRole: m.family_role,
      rayonName: m.rayon_name,
      familyNo: m.family_no,
      headOfFamilyName: m.head_of_family_name,
      baptismStatus: m.baptism_status,
      confirmationStatus: m.confirmation_status,
      membershipStatus: m.membership_status,
    })),
    whatsapp_response: waResponse,
  });
});

// 7. POST /api/n8n/inbox/submit - Receive WhatsApp prayer requests, messages, or questions from bot
n8nRouter.post('/inbox/submit', requireN8nAuth, (req, res) => {
  const { senderPhone, senderName, messageType, messageText } = req.body || {};

  if (!senderPhone || !messageText) {
    return res.status(400).json({
      success: false,
      message: 'senderPhone dan messageText wajib disertakan.',
    });
  }

  const db = getDb();
  const id = 'wa-msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const type = String(messageType || 'pokok_doa').trim();
  const name = senderName ? String(senderName).trim() : 'Warga Jemaat (WhatsApp)';

  db.prepare(`
    INSERT INTO whatsapp_inbox
    (id, sender_phone, sender_name, message_type, message_text, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'Baru', ?)
  `).run(id, String(senderPhone).trim(), name, type, String(messageText).trim(), now);

  const confirmationReply = `Shalom ${name}, terima kasih. Pesan dan ${type === 'pokok_doa' ? 'pokok doa' : 'permohonan'} Anda telah diterima oleh Sekretariat Majelis Jemaat GMIT Betel Fuimelang (ID: ${id}). Majelis akan menindaklanjuti dalam doa dan pelayanan. Tuhan Yesus memberkati. 🙏`;

  return res.json({
    success: true,
    message: 'Pesan berhasil diterima dan tersimpan di database Majelis Jemaat.',
    ticketId: id,
    whatsapp_reply: confirmationReply,
  });
});

// 8. GET /api/n8n/inbox - View WhatsApp messages received (Admin only)
n8nRouter.get('/inbox', (req, res) => {
  const appUser = getRequestUser(req);
  if (!appUser) {
    return res.status(401).json({ success: false, message: 'Harap login terlebih dahulu.' });
  }

  const db = getDb();
  const messages = db.prepare(`
    SELECT * FROM whatsapp_inbox
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  return res.json({
    success: true,
    messages,
  });
});

// 9. POST /api/n8n/test-webhook - Test sending ping payload to n8n Webhook URL
n8nRouter.post('/test-webhook', async (req, res) => {
  const appUser = getRequestUser(req);
  if (!appUser || (appUser.role !== 'Super Admin' && appUser.role !== 'Admin')) {
    return res.status(403).json({ success: false, message: 'Hanya Administrator yang dapat menguji webhook.' });
  }

  const config = getN8nConfig();
  const targetUrl = String(req.body?.webhookUrl || config.webhook_url || '').trim();

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      message: 'URL Webhook n8n belum diisi. Silakan masukkan URL webhook dari workflow n8n Anda terlebih dahulu.',
    });
  }

  try {
    const payload = {
      event: 'test.ping',
      source: 'SYSJEGER GMIT Betel Fuimelang',
      timestamp: new Date().toISOString(),
      church: {
        name: 'GMIT Betel Fuimelang',
        klasis: 'Klasis Alor Tengah Utara',
      },
      sampleWarta: {
        title: 'Uji Koneksi Webhook n8n WhatsApp Bot',
        category: 'Warta Ibadah',
        content: 'Ini adalah pesan uji koneksi otomatis dari sistem SYSJEGER ke workflow n8n Anda.',
      },
    };

    const startTime = Date.now();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SYSJEGER-n8n-Gateway/2.1',
      },
      body: JSON.stringify(payload),
    });
    const durationMs = Date.now() - startTime;

    return res.json({
      success: true,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      durationMs,
      message: response.ok
        ? `Berhasil terhubung ke n8n! n8n merespon dengan status ${response.status} (${response.statusText}) dalam ${durationMs}ms.`
        : `n8n merespon dengan status HTTP ${response.status} (${response.statusText}).`,
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      message: `Gagal mengirim ke URL n8n: ${err?.message || 'Server n8n tidak merespon'}. Pastikan URL dapat diakses dari internet dan workflow n8n sedang aktif (Listening).`,
    });
  }
});

// 10. GET /api/n8n/workflow-template - Ready-to-import n8n Workflow JSON
n8nRouter.get('/workflow-template', (req, res) => {
  const config = getN8nConfig();
  const currentOrigin = `${req.protocol}://${req.get('host') || 'localhost:3000'}`;

  const workflowJson = {
    name: "GMIT Betel Fuimelang - WhatsApp Bot Workflow",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "gmit-whatsapp-bot",
          responseMode: "lastNode",
          options: {}
        },
        id: "webhook-whatsapp-inbound",
        name: "WhatsApp Inbound Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [240, 300]
      },
      {
        parameters: {
          jsCode: `// Normalisasi pesan masuk WhatsApp
const body = $input.first().json.body || $input.first().json;
const messageText = (body.message || body.text || body.body || "").trim().toLowerCase();
const senderPhone = body.from || body.phone || body.sender || "";
const senderName = body.name || body.pushName || "Warga Jemaat";

let intent = "menu";
if (messageText.includes("warta") || messageText.includes("pengumuman")) {
  intent = "warta";
} else if (messageText.includes("jadwal") || messageText.includes("ibadah") || messageText.includes("khotbah")) {
  intent = "jadwal";
} else if (messageText.includes("jemaat") || messageText.includes("data") || messageText.includes("nik") || messageText.includes("kk")) {
  intent = "cek_data";
} else if (messageText.includes("doa") || messageText.includes("mohon doa") || messageText.includes("konseling")) {
  intent = "doa";
}

return {
  json: {
    messageText,
    senderPhone,
    senderName,
    intent,
    rawQuery: body.message || body.text || ""
  }
};`
        },
        id: "code-detect-intent",
        name: "Deteksi Perintah WhatsApp",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [460, 300]
      },
      {
        parameters: {
          dataType: "string",
          value1: "={{ $json.intent }}",
          rules: {
            rules: [
              { value2: "warta", output: 0 },
              { value2: "jadwal", output: 1 },
              { value2: "cek_data", output: 2 },
              { value2: "doa", output: 3 }
            ]
          },
          fallbackOutput: 4
        },
        id: "switch-intent",
        name: "Pilah Perintah",
        type: "n8n-nodes-base.switch",
        typeVersion: 3,
        position: [700, 300]
      },
      {
        parameters: {
          url: `${currentOrigin}/api/n8n/warta/latest`,
          authentication: "none",
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: config.api_key }
            ]
          }
        },
        id: "http-get-warta",
        name: "Ambil Warta SYSJEGER",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [980, 140]
      },
      {
        parameters: {
          url: `${currentOrigin}/api/n8n/schedules/upcoming`,
          authentication: "none",
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: config.api_key }
            ]
          }
        },
        id: "http-get-schedules",
        name: "Ambil Jadwal SYSJEGER",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [980, 260]
      },
      {
        parameters: {
          method: "POST",
          url: `${currentOrigin}/api/n8n/members/lookup`,
          authentication: "none",
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "query", value: "={{ $json.rawQuery }}" },
              { name: "phone", value: "={{ $json.senderPhone }}" }
            ]
          },
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: config.api_key }
            ]
          }
        },
        id: "http-lookup-member",
        name: "Cari Jemaat SYSJEGER",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [980, 380]
      },
      {
        parameters: {
          method: "POST",
          url: `${currentOrigin}/api/n8n/inbox/submit`,
          authentication: "none",
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "senderPhone", value: "={{ $json.senderPhone }}" },
              { name: "senderName", value: "={{ $json.senderName }}" },
              { name: "messageType", value: "pokok_doa" },
              { name: "messageText", value: "={{ $json.rawQuery }}" }
            ]
          },
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: config.api_key }
            ]
          }
        },
        id: "http-submit-prayer",
        name: "Kirim Doa ke Majelis",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [980, 500]
      }
    ],
    connections: {
      "WhatsApp Inbound Webhook": {
        main: [[{ node: "Deteksi Perintah WhatsApp", type: "main", index: 0 }]]
      },
      "Deteksi Perintah WhatsApp": {
        main: [[{ node: "Pilah Perintah", type: "main", index: 0 }]]
      },
      "Pilah Perintah": {
        main: [
          [{ node: "Ambil Warta SYSJEGER", type: "main", index: 0 }],
          [{ node: "Ambil Jadwal SYSJEGER", type: "main", index: 0 }],
          [{ node: "Cari Jemaat SYSJEGER", type: "main", index: 0 }],
          [{ node: "Kirim Doa ke Majelis", type: "main", index: 0 }]
        ]
      }
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="gmit-betel-n8n-whatsapp-bot.json"');
  return res.json(workflowJson);
});
