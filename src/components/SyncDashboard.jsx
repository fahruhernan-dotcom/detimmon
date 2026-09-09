/**
 * SyncDashboard — Monitor & Control 2-Way Sync Engine
 * Phase 7: Google Workspace Integration
 * LPK Indonesia Dignity in Collaboration with KLTC®
 */
import React, { useState, useEffect, useCallback } from "react";
import { syncService } from "../services/syncService";
import { externalSourceService } from "../services/externalSourceService";

const STATUS_COLOR = {
  DONE: "#34d399", PROCESSING: "#fbbf24", FAILED: "#f87171",
  QUEUED: "#60a5fa",
};
const ACTION_BADGE = {
  INSERTED: { bg: "#166534", color: "#bbf7d0", label: "Baru" },
  UPDATED:  { bg: "#1e3a5f", color: "#93c5fd", label: "Update" },
  SKIPPED:  { bg: "#292524", color: "#a8a29e", label: "Skip" },
  FAILED:   { bg: "#7f1d1d", color: "#fca5a5", label: "Error" },
};

function Badge({ status }) {
  const c = ACTION_BADGE[status] || ACTION_BADGE.SKIPPED;
  return (
    <span style={{
      background: c.bg, color: c.color, borderRadius: 4,
      padding: "1px 7px", fontSize: 10, fontWeight: 600
    }}>{c.label}</span>
  );
}

function StatBox({ label, value, color = "var(--accent)" }) {
  return (
    <div style={{
      background: "var(--glass)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "12px 16px", textAlign: "center", flex: 1, minWidth: 80
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value ?? "–"}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function SyncDashboard({
  eventId,
  spreadsheetId,
  googleAccessToken,
  activeSourceId,
  onSyncComplete,
}) {
  const [jobs,       setJobs]       = useState([]);
  const [selJob,     setSelJob]     = useState(null);
  const [logs,       setLogs]       = useState([]);
  const [running,    setRunning]    = useState(false);
  const [progress,   setProgress]   = useState(null);
  const [direction,  setDirection]  = useState("BIDIRECTIONAL");
  const [error,      setError]      = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const data = await syncService.getSyncJobs(activeSourceId);
      setJobs(data);
    } catch (e) { setError(e.message); }
    finally { setLoadingJobs(false); }
  }, [activeSourceId]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  async function loadLogs(jobId) {
    setSelJob(jobId);
    try {
      const data = await syncService.getSyncLogs(jobId);
      setLogs(data);
    } catch (e) { setError(e.message); }
  }

  async function handleRunSync() {
    if (!spreadsheetId) { setError("Belum ada Spreadsheet ID. Konfigurasikan dulu di Pengaturan Sheets."); return; }
    if (!googleAccessToken) { setError("Login Google OAuth diperlukan untuk sync. Klik Login Google di halaman utama."); return; }
    if (!activeSourceId) { setError("Pilih source binding aktif terlebih dahulu."); return; }

    setRunning(true);
    setError(null);
    setProgress({ current: 0, total: 0, name: "", phase: "MEMULAI" });

    try {
      const result = await syncService.runSync({
        sourceId: activeSourceId,
        eventId,
        spreadsheetId,
        accessToken: googleAccessToken,
        direction,
        onProgress: (p) => setProgress(p),
      });

      await loadJobs();
      setProgress(null);
      if (onSyncComplete) onSyncComplete(result);
    } catch (e) {
      setError(`Sync gagal: ${e.message}`);
      await loadJobs();
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  const latestJob = jobs[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── CONTROLS ─────────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--glass)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "18px 20px"
      }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>
          🔄 Jalankan Sync
        </h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <select value={direction} onChange={e => setDirection(e.target.value)}
            style={{
              background: "var(--glass)", border: "1px solid var(--border)",
              color: "var(--text)", borderRadius: 8, padding: "8px 12px", fontSize: 13
            }}>
            <option value="BIDIRECTIONAL">⇄ Dua Arah</option>
            <option value="SHEETS_TO_DB">→ Sheets ke Database</option>
            <option value="DB_TO_SHEETS">← Database ke Sheets</option>
          </select>

          <button onClick={handleRunSync} disabled={running || !googleAccessToken}
            style={{
              background: running ? "#374151" : "var(--accent)", color: running ? "#9ca3af" : "#000",
              border: "none", borderRadius: 8, padding: "9px 22px", cursor: running ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6
            }}>
            {running ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                Sedang Sync...
              </>
            ) : "▶ Jalankan Sync"}
          </button>

          <button onClick={loadJobs} disabled={loadingJobs}
            style={{ background: "var(--glass)", border: "1px solid var(--border)", color: "var(--text)",
              borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13 }}>
            ↻ Refresh
          </button>
        </div>

        {!googleAccessToken && (
          <div style={{ background: "#78350f22", border: "1px solid #fbbf24", borderRadius: 8,
            padding: "10px 14px", color: "#fbbf24", fontSize: 12, marginBottom: 10 }}>
            ⚠️ Sync memerlukan akses Google OAuth. Klik <strong>Login Google</strong> di toolbar.
          </div>
        )}

        {/* Progress bar */}
        {running && progress && (
          <div style={{ background: "var(--glass)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
              Fase: <strong style={{ color: "var(--accent)" }}>{progress.phase}</strong>
              {progress.name && <> · {progress.name}</>}
              {progress.total > 0 && <> · {progress.current}/{progress.total}</>}
            </div>
            {progress.total > 0 && (
              <div style={{ background: "#374151", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`,
                  background: "var(--accent)", height: "100%", transition: "width 0.3s ease",
                  borderRadius: 6
                }} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: "#7f1d1d22", border: "1px solid #f87171", borderRadius: 8,
            padding: "10px 14px", color: "#fca5a5", fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {/* ── LATEST JOB STATS ─────────────────────────────────────────────── */}
      {latestJob && (
        <div>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)" }}>Hasil Sync Terakhir</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatBox label="Scanned"  value={latestJob.records_scanned}  color="#60a5fa" />
            <StatBox label="Inserted" value={latestJob.records_inserted} color="#34d399" />
            <StatBox label="Updated"  value={latestJob.records_updated}  color="#a78bfa" />
            <StatBox label="Skipped"  value={latestJob.records_skipped}  color="#9ca3af" />
            <StatBox label="Failed"   value={latestJob.records_failed}   color="#f87171" />
          </div>
        </div>
      )}

      {/* ── JOB HISTORY ──────────────────────────────────────────────────── */}
      <div>
        <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)" }}>
          Riwayat Sync Jobs {loadingJobs && <span style={{ fontSize: 11 }}>⏳</span>}
        </h4>
        {jobs.length === 0 && !loadingJobs && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            Belum ada riwayat sync. Jalankan sync pertama di atas.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.map(job => (
            <div key={job.id} onClick={() => loadLogs(job.id)}
              style={{
                background: selJob === job.id ? "var(--glass-hover, rgba(255,255,255,0.08))" : "var(--glass)",
                border: `1px solid ${selJob === job.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                transition: "border-color 0.2s"
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{
                    fontWeight: 600, fontSize: 13, marginRight: 8,
                    color: STATUS_COLOR[job.status] || "var(--text)"
                  }}>
                    {job.status === "DONE" ? "✅" : job.status === "FAILED" ? "❌" : "⏳"} {job.status}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {job.direction} · {new Date(job.started_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
                  ↓{job.records_inserted} +{job.records_updated} ⊘{job.records_skipped}
                  {job.records_failed > 0 && <span style={{ color: "#f87171" }}> ✕{job.records_failed}</span>}
                </div>
              </div>
              {job.error_message && (
                <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{job.error_message}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── SYNC LOGS DETAIL ─────────────────────────────────────────────── */}
      {selJob && logs.length > 0 && (
        <div>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)" }}>
            Log Detail Job
            <button onClick={() => { setSelJob(null); setLogs([]); }}
              style={{ background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: 12, marginLeft: 8 }}>
              (tutup)
            </button>
          </h4>
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {logs.map(log => (
              <div key={log.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--glass)", borderRadius: 8, padding: "7px 12px",
                fontSize: 12
              }}>
                <Badge status={log.action_taken} />
                <span style={{ color: log.status === "ERROR" ? "#f87171" : "var(--text)", flex: 1 }}>
                  {log.message}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 10, whiteSpace: "nowrap" }}>
                  Row {log.source_row_id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
