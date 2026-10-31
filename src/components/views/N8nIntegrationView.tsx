import React, { useState, useEffect } from 'react';
import {
  Bot,
  Key,
  Copy,
  Check,
  RefreshCw,
  Send,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Code,
  Layers,
  Inbox,
  Terminal,
  Eye,
  EyeOff,
  Globe,
  MessageSquare,
  Sparkles,
  Phone,
  Search,
  BookOpen,
  Calendar,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { N8nIntegrationConfig, WhatsAppInboxItem } from '../../types/index.ts';
import {
  fetchN8nConfigApi,
  updateN8nConfigApi,
  fetchN8nInboxApi,
  testN8nWebhookApi,
  testN8nMemberLookupApi,
  testN8nLatestWartaApi,
  testN8nSchedulesApi,
  testN8nSubmitPrayerApi,
} from '../../services/api.ts';

export const N8nIntegrationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'endpoints' | 'template' | 'inbox' | 'tester'>('config');

  const [config, setConfig] = useState<N8nIntegrationConfig>({
    apiKey: '',
    isEnabled: true,
    webhookUrl: '',
    autoBroadcastWarta: true,
    notes: '',
  });
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [inboxItems, setInboxItems] = useState<WhatsAppInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // API Key reveal
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Webhook ping test state
  const [pingingWebhook, setPingingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<any>(null);

  // Live Bot Tester State
  const [testMode, setTestMode] = useState<'lookup' | 'warta' | 'schedules' | 'prayer'>('lookup');
  const [testQuery, setTestQuery] = useState('085173095482');
  const [testPrayerName, setTestPrayerName] = useState('Bpk. Kornelis');
  const [testPrayerPhone, setTestPrayerPhone] = useState('082144556677');
  const [testPrayerText, setTestPrayerText] = useState('Mohon dukungan doa untuk kesembuhan anggota keluarga yang sedang dirawat.');
  const [testerLoading, setTesterLoading] = useState(false);
  const [botReplyText, setBotReplyText] = useState<string>('');
  const [rawBotJson, setRawBotJson] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchN8nConfigApi();
      if (res?.success && res.config) {
        setConfig(res.config);
        setInboxCount(res.inboxUnreadCount || 0);
      }
      const inboxRes = await fetchN8nInboxApi();
      if (inboxRes?.success && inboxRes.messages) {
        setInboxItems(inboxRes.messages);
      }
    } catch (err: any) {
      console.error('Failed to load n8n config', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleCopyKey = () => {
    if (!config.apiKey) return;
    navigator.clipboard.writeText(config.apiKey);
    setCopiedKey(true);
    showNotification('API Key n8n berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await updateN8nConfigApi({
        isEnabled: config.isEnabled,
        webhookUrl: config.webhookUrl,
        autoBroadcastWarta: config.autoBroadcastWarta,
        notes: config.notes,
      });
      if (res?.success && res.config) {
        setConfig(res.config);
        showNotification('Pengaturan integrasi n8n berhasil disimpan!', 'success');
      } else {
        showNotification(res?.message || 'Gagal menyimpan konfigurasi.', 'error');
      }
    } catch (err: any) {
      showNotification(`Gagal menyimpan: ${err?.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Peringatan: Membuat ulang API Key akan memutuskan workflow n8n yang menggunakan kunci lama. Lanjutkan?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await updateN8nConfigApi({ regenerateKey: true });
      if (res?.success && res.config) {
        setConfig(res.config);
        showNotification('API Key n8n baru berhasil dibuat!', 'success');
      }
    } catch (err: any) {
      showNotification(`Gagal membuat ulang kunci: ${err?.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePingWebhook = async () => {
    if (!config.webhookUrl) {
      showNotification('Harap masukkan URL Webhook n8n terlebih dahulu.', 'error');
      return;
    }
    setPingingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await testN8nWebhookApi(config.webhookUrl);
      setWebhookTestResult(res);
      if (res?.success) {
        showNotification(`Berhasil terhubung ke n8n! (${res.durationMs}ms)`, 'success');
      } else {
        showNotification(res?.message || 'Gagal terhubung ke URL webhook.', 'error');
      }
    } catch (err: any) {
      setWebhookTestResult({ success: false, message: err?.message });
      showNotification(`Uji koneksi gagal: ${err?.message}`, 'error');
    } finally {
      setPingingWebhook(false);
    }
  };

  const handleExecuteBotTest = async () => {
    setTesterLoading(true);
    setBotReplyText('');
    setRawBotJson(null);
    try {
      if (testMode === 'lookup') {
        const res = await testN8nMemberLookupApi(testQuery, config.apiKey);
        setRawBotJson(res);
        setBotReplyText(res.whatsapp_response || JSON.stringify(res, null, 2));
      } else if (testMode === 'warta') {
        const res = await testN8nLatestWartaApi(config.apiKey);
        setRawBotJson(res);
        setBotReplyText(res.whatsapp_message || JSON.stringify(res, null, 2));
      } else if (testMode === 'schedules') {
        const res = await testN8nSchedulesApi(config.apiKey);
        setRawBotJson(res);
        setBotReplyText(res.whatsapp_message || JSON.stringify(res, null, 2));
      } else if (testMode === 'prayer') {
        const res = await testN8nSubmitPrayerApi(
          {
            senderPhone: testPrayerPhone,
            senderName: testPrayerName,
            messageText: testPrayerText,
            messageType: 'pokok_doa',
          },
          config.apiKey
        );
        setRawBotJson(res);
        setBotReplyText(res.whatsapp_reply || res.message);
        // Refresh inbox items
        const inboxRes = await fetchN8nInboxApi();
        if (inboxRes?.messages) setInboxItems(inboxRes.messages);
      }
    } catch (err: any) {
      setBotReplyText(`Terjadi kesalahan pengujian: ${err?.message}`);
    } finally {
      setTesterLoading(false);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-red-950/80 border-red-500/50 text-red-200'
              : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#071318] via-[#091824] to-[#0c1329] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-white">Integrasi n8n & WhatsApp Bot Jemaat</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  config.isEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                }`}
              >
                {config.isEnabled ? '● Bot Gateway Aktif' : '○ Nonaktif'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                REST API v2.1
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Hubungkan workflow <strong>n8n</strong> dan bot WhatsApp (Cloud API, WAHA, Evolution API, Baileys) ke database GMIT Betel Fuimelang untuk pencarian data jemaat otomatis, penyampaian warta, jadwal ibadah, dan permohonan doa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/n8n/workflow-template"
            download="gmit-betel-n8n-whatsapp-bot.json"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Unduh Workflow n8n</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'config'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Konfigurasi & API Key</span>
        </button>

        <button
          onClick={() => setActiveTab('endpoints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'endpoints'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Katalog Endpoint REST API</span>
        </button>

        <button
          onClick={() => setActiveTab('template')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'template'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Template n8n Siap Pakai</span>
        </button>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative ${
            activeTab === 'inbox'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Pesan Masuk WhatsApp</span>
          {inboxItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 ml-1">
              {inboxItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tester')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'tester'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Simulator Chat Bot</span>
        </button>
      </div>

      {/* Tab 1: Configuration */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* API Key Box */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>API Key n8n WhatsApp Gateway</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gunakan kunci ini pada header <code className="text-emerald-300">X-N8N-API-KEY</code> di node HTTP Request n8n Anda.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                    title={showKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleCopyKey}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Tersalin' : 'Salin Kunci'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value={config.apiKey || 'Loading API key...'}
                  className="w-full px-3.5 py-2.5 bg-[#050811] border border-slate-700 rounded-xl text-emerald-300 font-mono text-xs tracking-wider outline-none cursor-default"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Terakhir diperbarui: {config.updatedAt ? new Date(config.updatedAt).toLocaleString('id-ID') : '-'}
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Buat Kunci Baru (Regenerate)</span>
                </button>
              </div>
            </div>

            {/* Outbound Webhook Form */}
            <form onSubmit={handleSaveConfig} className="p-5 rounded-2xl bg-[#0c1329] border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Pengaturan Webhook Keluar ke n8n (Outbound Event)</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL Webhook n8n (Production / Test Webhook URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://n8n.domain-anda.com/webhook/gmit-warta-broadcast"
                    value={config.webhookUrl}
                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handlePingWebhook}
                    disabled={pingingWebhook || !config.webhookUrl}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {pingingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>Uji Ping</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  SYSJEGER akan mengirimkan payload JSON ke URL ini saat admin menerbitkan Warta Jemaat baru.
                </p>
              </div>

              {webhookTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    webhookTestResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/60 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    {webhookTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>Hasil Uji Koneksi Webhook:</span>
                  </div>
                  <p>{webhookTestResult.message}</p>
                </div>
              )}

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isEnabled"
                    checked={config.isEnabled}
                    onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="isEnabled" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Aktifkan Gateway API n8n & WhatsApp Bot
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoBroadcastWarta"
                    checked={config.autoBroadcastWarta}
                    onChange={(e) => setConfig({ ...config, autoBroadcastWarta: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="autoBroadcastWarta" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Kirim Otomatis Notifikasi Warta ke Webhook n8n saat Warta Diterbitkan
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan Integrasi</label>
                <input
                  type="text"
                  placeholder="Koneksi n8n WhatsApp Bot GMIT Betel Fuimelang"
                  value={config.notes}
                  onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pengaturan Integrasi'}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Guide Card */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Cara Menghubungkan ke n8n</span>
              </h4>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Buka instance <strong>n8n</strong> Anda (self-hosted atau n8n Cloud).
                </li>
                <li>
                  Klik menu <strong>Import from File</strong> dan pilih file <code className="text-emerald-300">gmit-betel-n8n-whatsapp-bot.json</code> yang sudah disediakan.
                </li>
                <li>
                  Salin <strong>API Key</strong> dari kotak di samping.
                </li>
                <li>
                  Hubungkan WhatsApp Gateway Anda (misalnya <em>Evolution API</em>, <em>WAHA</em>, atau <em>WhatsApp Business Cloud API</em>) ke webhook n8n.
                </li>
                <li>
                  Uji chat WhatsApp dengan mengirim perintah seperti: <em>"Warta terbaru"</em>, <em>"Jadwal ibadah"</em>, atau nomor HP/NIK jemaat.
                </li>
              </ol>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c1329] border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200">Arsitektur Alur Bot:</h4>
              <div className="p-3 rounded-xl bg-[#050811] text-[11px] text-slate-400 font-mono space-y-1.5 border border-slate-800">
                <div className="text-emerald-400">📱 WhatsApp Jemaat</div>
                <div className="text-slate-600 pl-4">↓ (Pesan Masuk)</div>
                <div className="text-blue-400">⚡ WhatsApp Gateway (WAHA/Evo)</div>
                <div className="text-slate-600 pl-4">↓ (Webhook)</div>
                <div className="text-amber-400">🔄 n8n Orchestrator Workflow</div>
                <div className="text-slate-600 pl-4">↓ (HTTP Request + API Key)</div>
                <div className="text-emerald-300 font-bold">🏛️ Database SYSJEGER Betel</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: REST API Endpoints */}
      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0c1329] border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="font-bold text-white">Base URL Server: </span>
              <code className="text-emerald-300 font-mono">{originUrl}/api/n8n</code>
            </div>
            <div className="text-slate-400 text-[11px]">
              Semua endpoint terproteksi memerlukan Header: <code className="text-amber-300">X-N8N-API-KEY: {config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'KEY'}</code>
            </div>
          </div>

          <div className="space-y-3">
            {/* Endpoint 1 */}
            <div className="p-4 rounded-2xl bg-[#0c1329] border border-emerald-500/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-500 text-slate-950">
                    GET
                  </span>
                  <code className="text-xs font-mono text-emerald-300">/api/n8n/warta/latest?limit=5</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${originUrl}/api/n8n/warta/latest`);
                    showNotification('URL endpoint berhasil disalin!', 'success');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin URL</span>
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Mengambil daftar warta dan pengumuman jemaat aktif terbaru. Mengembalikan array warta serta string <code className="text-amber-300">whatsapp_message</code> yang sudah terformat rapi dengan emotikon siap dikirim langsung oleh bot.
              </p>
            </div>

            {/* Endpoint 2 */}
            <div className="p-4 rounded-2xl bg-[#0c1329] border border-blue-500/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-500 text-white">
                    GET
                  </span>
                  <code className="text-xs font-mono text-blue-300">/api/n8n/schedules/upcoming</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${originUrl}/api/n8n/schedules/upcoming`);
                    showNotification('URL endpoint berhasil disalin!', 'success');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin URL</span>
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Mengambil jadwal kebaktian minggu ini, nama pengkhotbah/pelayan firman, liturgos, pemusik, dan presbiter yang bertugas.
              </p>
            </div>

            {/* Endpoint 3 */}
            <div className="p-4 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-500 text-slate-950">
                    POST
                  </span>
                  <code className="text-xs font-mono text-amber-300">/api/n8n/members/lookup</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${originUrl}/api/n8n/members/lookup`);
                    showNotification('URL endpoint berhasil disalin!', 'success');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin URL</span>
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Pencarian aman data jemaat berdasarkan nomor HP pengirim WhatsApp (otomatis), NIK, atau Nama. Mengembalikan status baptis, sidi, nomor kartu keluarga, dan rayon pelayanan jemaat.
              </p>
              <div className="p-2.5 rounded-lg bg-[#050811] text-[11px] font-mono text-slate-400">
                JSON Body: {`{ "query": "085173095482", "phone": "6285173095482" }`}
              </div>
            </div>

            {/* Endpoint 4 */}
            <div className="p-4 rounded-2xl bg-[#0c1329] border border-purple-500/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-purple-500 text-white">
                    POST
                  </span>
                  <code className="text-xs font-mono text-purple-300">/api/n8n/inbox/submit</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${originUrl}/api/n8n/inbox/submit`);
                    showNotification('URL endpoint berhasil disalin!', 'success');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin URL</span>
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Menerima permohonan doa, permintaan konseling pastoral, atau pesan pertanyaan warga jemaat dari WhatsApp langsung ke database Majelis Jemaat.
              </p>
              <div className="p-2.5 rounded-lg bg-[#050811] text-[11px] font-mono text-slate-400">
                JSON Body: {`{ "senderPhone": "628123456789", "senderName": "Ibu Maria", "messageType": "pokok_doa", "messageText": "Mohon doa kesembuhan..." }`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Template Workflow */}
      {activeTab === 'template' && (
        <div className="p-6 rounded-3xl bg-[#0c1329] border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Workflow Template n8n GMIT Betel Fuimelang</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Alur otomatisasi siap impor berisi node Webhook WhatsApp, Deteksi Intent Pesan, HTTP Request ke database, dan Switch Router.
              </p>
            </div>

            <a
              href="/api/n8n/workflow-template"
              download="gmit-betel-n8n-whatsapp-bot.json"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File .json Template</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#050811] border border-slate-800 space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Node 1</span>
              <h5 className="text-xs font-bold text-white">Webhook Inbound</h5>
              <p className="text-[11px] text-slate-400">Menangkap pesan chat yang dikirim jemaat ke nomor WhatsApp gereja.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050811] border border-slate-800 space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase">Node 2</span>
              <h5 className="text-xs font-bold text-white">Deteksi Perintah</h5>
              <p className="text-[11px] text-slate-400">Mendeteksi kata kunci seperti "warta", "jadwal", "cek data", atau "doa".</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050811] border border-slate-800 space-y-1">
              <span className="text-[10px] text-blue-400 font-bold uppercase">Node 3</span>
              <h5 className="text-xs font-bold text-white">HTTP Request API</h5>
              <p className="text-[11px] text-slate-400">Mengambil data resmi dari server database GMIT Betel secara aman.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050811] border border-slate-800 space-y-1">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Node 4</span>
              <h5 className="text-xs font-bold text-white">Respon WhatsApp</h5>
              <p className="text-[11px] text-slate-400">Mengirim balik teks format rapi dengan emotikon ke WhatsApp jemaat.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: WhatsApp Inbox */}
      {activeTab === 'inbox' && (
        <div className="p-6 rounded-3xl bg-[#0c1329] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Inbox className="w-5 h-5 text-emerald-400" />
                <span>Pesan Masuk WhatsApp Jemaat</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pokok doa dan permohonan yang dikirimkan warga jemaat melalui bot WhatsApp ke sistem database
              </p>
            </div>
            <span className="text-xs text-slate-400">{inboxItems.length} pesan tercatat</span>
          </div>

          {inboxItems.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#050811] border border-dashed border-slate-800 space-y-2">
              <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Belum ada pesan atau pokok doa yang masuk dari WhatsApp bot.</p>
              <button
                onClick={() => {
                  setActiveTab('tester');
                  setTestMode('prayer');
                }}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Coba simulasikan kirim pokok doa di Simulator Bot →
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {inboxItems.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.sender_name || 'Jemaat'}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{item.sender_phone}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.message_type}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{item.created_at}</span>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    "{item.message_text}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Live Bot Tester */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="p-5 rounded-2xl bg-[#0c1329] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Simulator Chat WhatsApp Bot</span>
            </h3>
            <p className="text-xs text-slate-400">
              Uji respon API bot secara langsung persis seperti balasan yang akan diterima jemaat di WhatsApp.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Perintah yang Diuji:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTestMode('lookup')}
                  className={`p-2 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    testMode === 'lookup'
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#050811] border-slate-800 text-slate-400'
                  }`}
                >
                  🔍 Cek Data Jemaat
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode('warta')}
                  className={`p-2 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    testMode === 'warta'
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#050811] border-slate-800 text-slate-400'
                  }`}
                >
                  📢 Ambil Warta Terbaru
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode('schedules')}
                  className={`p-2 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    testMode === 'schedules'
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#050811] border-slate-800 text-slate-400'
                  }`}
                >
                  ⛪ Jadwal Ibadah
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode('prayer')}
                  className={`p-2 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    testMode === 'prayer'
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#050811] border-slate-800 text-slate-400'
                  }`}
                >
                  🙏 Kirim Pokok Doa
                </button>
              </div>
            </div>

            {testMode === 'lookup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kata Kunci Pencarian (Nomor HP / NIK / Nama Jemaat):
                </label>
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Contoh: 085173095482 atau nama jemaat"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-mono"
                />
              </div>
            )}

            {testMode === 'prayer' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nama Jemaat</label>
                    <input
                      type="text"
                      value={testPrayerName}
                      onChange={(e) => setTestPrayerName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">No. WhatsApp</label>
                    <input
                      type="text"
                      value={testPrayerPhone}
                      onChange={(e) => setTestPrayerPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Isi Pokok Doa</label>
                  <textarea
                    rows={3}
                    value={testPrayerText}
                    onChange={(e) => setTestPrayerText(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleExecuteBotTest}
              disabled={testerLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
            >
              {testerLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{testerLoading ? 'Menguji API...' : 'Simulasikan Chat & Lihat Balasan Bot'}</span>
            </button>
          </div>

          {/* WhatsApp Chat Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Tampilan Balasan di Layar WhatsApp Jemaat:</span>
              </span>
            </div>

            <div className="rounded-2xl bg-[#071318] border-2 border-emerald-500/30 overflow-hidden shadow-2xl flex flex-col min-h-[340px]">
              {/* WA Chat Header */}
              <div className="px-4 py-2.5 bg-[#0a1e24] border-b border-emerald-500/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                  GB
                </div>
                <div>
                  <h6 className="text-xs font-bold text-white leading-tight">GMIT Betel Fuimelang Bot</h6>
                  <p className="text-[10px] text-emerald-400">online · bot resmi jemaat</p>
                </div>
              </div>

              {/* Chat Bubble Area */}
              <div className="p-4 flex-1 flex flex-col justify-end space-y-3">
                {botReplyText ? (
                  <div className="self-start max-w-[92%] p-3.5 rounded-2xl rounded-tl-sm bg-[#0e272a] border border-emerald-500/30 text-emerald-100 text-xs font-mono whitespace-pre-line leading-relaxed shadow-md">
                    {botReplyText}
                    <div className="text-[9px] text-emerald-400/60 text-right mt-1 font-sans">
                      {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Pilih perintah di samping lalu klik tombol "Simulasikan Chat" untuk melihat respon bot di sini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
