/**
 * ExternalSourceModal — Konfigurasi binding Google Sheets per event
 * Phase 7: Google Workspace Integration
 * LPK Indonesia Dignity in Collaboration with KLTC®
 */
import React, { useState, useEffect } from "react";
import { externalSourceService } from "../services/externalSourceService";
import { fetchFromGoogleOAuth } from "../services/sheetsService";
import { useConfirm } from "../context/ConfirmContext";

const DIRECTION_OPTS = [
  { value: "BIDIRECTIONAL", label: "⇄ Dua Arah (Direkomendasikan)" },
  { value: "SHEETS_TO_DB",  label: "→ Sheets ke Supabase saja" },
  { value: "DB_TO_SHEETS",  label: "← Supabase ke Sheets saja" },
];

export default function ExternalSourceModal({ eventId, onClose, onSaved, googleAccessToken }) {
  const confirm = useConfirm();
  const [sources,  setSources]  = useState([]);
  const [form,     setForm]     = useState(null);   // null = list mode, object = edit mode
  const [loading,  setLoading]  = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [testMsg,  setTestMsg]  = useState(null);   // {ok, msg}
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => { loadSources(); }, [eventId]);

  async function loadSources() {
    setLoading(true);
    try {
      const data = await externalSourceService.getByEvent(eventId);
      setSources(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function openNew() {
    setForm({
      id: null,
      label: "",
      external_sheet_id: "",
      external_drive_folder_id: "",
      sheet_tab_registrasi: "",
      sheet_tab_presensi: "",
      sync_direction: "BIDIRECTIONAL",
      auto_sync_interval_minutes: 0,
      is_active: true,
    });
    setTestMsg(null);
    setError(null);
  }

  function openEdit(src) {
    setForm({ ...src });
    setTestMsg(null);
    setError(null);
  }

  async function handleTest() {
    if (!form?.external_sheet_id) {
      setTestMsg({ ok: false, msg: "Masukkan Spreadsheet ID terlebih dahulu." });
      return;
    }
    if (!googleAccessToken) {
      setTestMsg({ ok: false, msg: "Login Google OAuth diperlukan untuk test koneksi. Klik tombol Login Google di halaman utama." });
      return;
    }

    setTesting(true);
    setTestMsg(null);
    try {
      const result = await fetchFromGoogleOAuth(form.external_sheet_id, googleAccessToken);
      const rowCount = result.registrants?.length || 0;
      const tab = result.tabName || "?";
      setTestMsg({ ok: true, msg: `✅ Koneksi berhasil! Sheet tab: "${tab}" — ${rowCount} baris ditemukan.` });

      // Auto-fill tab names from detection result
      setForm(f => ({
        ...f,
        sheet_tab_registrasi: result.tabName || f.sheet_tab_registrasi,
      }));
    } catch (e) {
      setTestMsg({ ok: false, msg: `❌ Gagal: ${e.message}` });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!form?.external_sheet_id?.trim()) {
      setError("Spreadsheet ID wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await externalSourceService.upsert({ ...form, event_id: eventId });
      await loadSources();
      setForm(null);
      if (onSaved) onSaved(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: 'Hapus Binding Google Sheets?',
      description: 'Apakah Anda yakin ingin menghapus konfigurasi binding ini? Riwayat sinkronisasi terkait akan ikut terhapus.',
      note: 'Tindakan ini tidak dapat dibatalkan.',
      variant: 'danger',
      confirmText: 'Hapus Binding',
      cancelText: 'Batalkan'
    });
    if (!ok) return;
    try {
      await externalSourceService.remove(id);
      await loadSources();
    } catch (e) { setError(e.message); }
  }

  async function handleToggle(src) {
    try {
      await externalSourceService.toggleActive(src.id, !src.is_active);
      await loadSources();
    } catch (e) { setError(e.message); }
  }

  const F = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 640, width: "95%" }}>
        <div className="modal-header">
          <h2 className="modal-title">🔗 Konfigurasi Google Sheets</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div style={{ background: "#7f1d1d22", border: "1px solid #f87171", borderRadius: 8,
            padding: "10px 14px", color: "#fca5a5", fontSize: 13, margin: "12px 0" }}>
            {error}
          </div>
        )}

        {/* ── LIST MODE ─────────────────────────────────────────────── */}
        {!form && (
          <>
            <div style={{ marginBottom: 16 }}>
              <button className="action-btn" onClick={openNew} style={{ background: "var(--accent)", color: "#000" }}>
                + Tambah Binding Baru
              </button>
            </div>

            {loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Memuat...</p>}

            {!loading && sources.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                <p>Belum ada Google Sheets yang dihubungkan ke event ini.</p>
              </div>
            )}

            {sources.map(src => (
              <div key={src.id} style={{
                background: "var(--glass)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "14px 16px", marginBottom: 12,
                display: "flex", flexDirection: "column", gap: 6
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{
                      fontWeight: 600, fontSize: 14, color: src.is_active ? "var(--accent)" : "var(--text-muted)"
                    }}>
                      {src.is_active ? "🟢" : "🔴"} {src.label || "Google Sheets"}
                    </span>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      ID: {src.external_sheet_id?.substring(0, 32)}...
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Tab: {src.sheet_tab_registrasi || "auto-detect"} · Arah: {src.sync_direction}
                    </div>
                    {src.last_synced_at && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Sync terakhir: {new Date(src.last_synced_at).toLocaleString("id-ID")}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleToggle(src)} title={src.is_active ? "Nonaktifkan" : "Aktifkan"}
                      style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6,
                        padding: "4px 10px", cursor: "pointer", color: "var(--text)", fontSize: 12 }}>
                      {src.is_active ? "Nonaktif" : "Aktifkan"}
                    </button>
                    <button onClick={() => openEdit(src)}
                      style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6,
                        padding: "4px 10px", cursor: "pointer", color: "var(--accent)", fontSize: 12 }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(src.id)}
                      style={{ background: "transparent", border: "1px solid #f87171", borderRadius: 6,
                        padding: "4px 10px", cursor: "pointer", color: "#f87171", fontSize: 12 }}>
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── FORM MODE ─────────────────────────────────────────────── */}
        {form && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Label</label>
              <input className="config-input" value={form.label} onChange={F("label")}
                placeholder="Contoh: Webinar Oktober 2026" style={{ width: "100%", boxSizing: "border-box" }} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Spreadsheet ID <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input className="config-input" value={form.external_sheet_id} onChange={F("external_sheet_id")}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 12 }} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Ambil dari URL spreadsheet: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Google Drive Folder ID (opsional)
              </label>
              <input className="config-input" value={form.external_drive_folder_id} onChange={F("external_drive_folder_id")}
                placeholder="Folder ID untuk backup bukti transfer"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 12 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Tab Registrasi (opsional)
                </label>
                <input className="config-input" value={form.sheet_tab_registrasi} onChange={F("sheet_tab_registrasi")}
                  placeholder="Form Responses 1" style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Tab Presensi/Sertifikat (opsional)
                </label>
                <input className="config-input" value={form.sheet_tab_presensi} onChange={F("sheet_tab_presensi")}
                  placeholder="DB_Presensi_&_Sertifikat" style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Arah Sync</label>
                <select className="config-input" value={form.sync_direction} onChange={F("sync_direction")}
                  style={{ width: "100%", boxSizing: "border-box" }}>
                  {DIRECTION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Auto Sync (menit, 0 = manual)
                </label>
                <input type="number" className="config-input" value={form.auto_sync_interval_minutes}
                  onChange={F("auto_sync_interval_minutes")} min={0} max={1440}
                  style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Test Connection */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={handleTest} disabled={testing}
                style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 18px", cursor: testing ? "not-allowed" : "pointer", fontSize: 13 }}>
                {testing ? "⏳ Menguji..." : "🔌 Test Koneksi"}
              </button>
              {testMsg && (
                <span style={{ fontSize: 12, color: testMsg.ok ? "#34d399" : "#f87171" }}>
                  {testMsg.msg}
                </span>
              )}
            </div>

            {!googleAccessToken && (
              <div style={{ background: "#78350f22", border: "1px solid #fbbf24", borderRadius: 8,
                padding: "10px 14px", color: "#fbbf24", fontSize: 12 }}>
                ⚠️ Login Google OAuth diperlukan untuk test koneksi dan menjalankan sync. Klik <strong>Login Google</strong> di halaman utama.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button onClick={() => { setForm(null); setError(null); }}
                style={{ background: "var(--glass)", border: "1px solid var(--border)", color: "var(--text)",
                  borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}>
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 8,
                  padding: "8px 24px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600 }}>
                {saving ? "Menyimpan..." : form.id ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
