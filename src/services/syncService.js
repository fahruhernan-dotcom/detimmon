/**
 * 2-Way Sync Engine — Phase 7: Google Workspace Integration
 * Sinkronisasi bidireksional antara Google Sheets dan Supabase
 * 
 * Arah SHEETS_TO_DB  : Google Sheets → persons / registrations / payments di Supabase
 * Arah DB_TO_SHEETS  : Supabase (status bayar, no tiket) → kolom admin Google Sheets
 * BIDIRECTIONAL      : Keduanya secara berurutan
 *
 * LPK Indonesia Dignity in Collaboration with KLTC®
 */
import { supabase } from '../lib/supabaseClient';
import {
  fetchFromGoogleOAuth,
  updateSheetPaymentStatus
} from './sheetsService';
import { externalSourceService } from './externalSourceService';
import { normalizeCertificateName, normalizeEmail, normalizeWhatsApp } from '../utils/normalizers';
import { detectPackageType, parseRawNominal } from '../utils/formatters';

// ─── Helper: start & finish a sync_job record ────────────────────────────────
async function createSyncJob(sourceId, eventId, direction, userId) {
  const { data, error } = await supabase
    .from('sync_jobs')
    .insert({
      source_id: sourceId,
      event_id: eventId,
      direction,
      triggered_by: userId || null,
      status: 'PROCESSING',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function finishSyncJob(jobId, stats, errorMessage = null) {
  await supabase
    .from('sync_jobs')
    .update({
      status: errorMessage ? 'FAILED' : 'DONE',
      records_scanned: stats.scanned || 0,
      records_inserted: stats.inserted || 0,
      records_updated: stats.updated || 0,
      records_skipped: stats.skipped || 0,
      records_failed: stats.failed || 0,
      error_message: errorMessage || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

async function writeSyncLog(jobId, sourceRowId, action, status, message, payload = null) {
  await supabase.from('sync_logs').insert({
    sync_job_id: jobId,
    source_row_id: sourceRowId,
    action_taken: action,  // INSERTED | UPDATED | SKIPPED | FAILED
    status,
    message,
    payload,
  });
}

// ─── Normalize package type from raw Google Sheets value ─────────────────────
function resolvePackageType(rawCat = '', nominal = 0) {
  const c = rawCat.toLowerCase();
  if (c.includes('mabar') || c.includes('rombongan') || nominal >= 500000) return 'MABAR';
  if (c.includes('early') || nominal < 100000) return 'EARLY_BIRD';
  return 'INDIVIDU';
}

// ─── SHEETS → DB: Insert / Update persons + registrations + payments ──────────
async function syncSheetsToDb({ registrants, source, jobId, eventId, onProgress }) {
  const stats = { scanned: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  for (const r of registrants) {
    stats.scanned++;
    try {
      const emailNorm = normalizeEmail(r.email);
      const waNorm = normalizeWhatsApp(r.whatsapp);

      // ── 1. Upsert Person ──────────────────────────────────────────────────
      let personId = null;
      let personAction = 'SKIPPED';

      if (emailNorm) {
        const { data: existing } = await supabase
          .from('persons')
          .select('id')
          .eq('email_normalized', emailNorm)
          .maybeSingle();
        if (existing) personId = existing.id;
      }

      if (!personId && waNorm) {
        const { data: existing } = await supabase
          .from('persons')
          .select('id')
          .eq('whatsapp_normalized', waNorm)
          .maybeSingle();
        if (existing) personId = existing.id;
      }

      if (personId) {
        // Update info terbaru jika berbeda
        await supabase.from('persons').update({
          full_name: normalizeCertificateName(r.nama),
          institution: r.instansi || null,
          city: r.kota || null,
          updated_at: new Date().toISOString(),
        }).eq('id', personId);
        personAction = 'UPDATED';
      } else {
        const { data: newPerson, error: pErr } = await supabase
          .from('persons')
          .insert({
            full_name: normalizeCertificateName(r.nama),
            email: emailNorm || null,
            whatsapp: waNorm || null,
            institution: r.instansi || null,
            city: r.kota || null,
          })
          .select('id')
          .single();

        if (pErr) throw pErr;
        personId = newPerson.id;
        personAction = 'INSERTED';
      }

      // ── 2. Upsert Registration (by source_row_id per event) ───────────────
      const packageType = resolvePackageType(r.kategori, r.nominal);
      const isMabar = packageType === 'MABAR';

      const { data: existingReg } = await supabase
        .from('registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('source_row_id', r.id)
        .maybeSingle();

      let regId = null;
      let regAction = 'SKIPPED';

      if (existingReg) {
        regId = existingReg.id;
        // Update status if changed in sheet
        const newStatus = r.statusBayar === 'LUNAS' ? 'LUNAS' : existingReg.status;
        if (newStatus !== existingReg.status) {
          await supabase.from('registrations').update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          }).eq('id', regId);
          regAction = 'UPDATED';
          stats.updated++;
        } else {
          stats.skipped++;
        }
      } else {
        const { data: newReg, error: rErr } = await supabase
          .from('registrations')
          .insert({
            event_id: eventId,
            person_id: personId,
            package_type: packageType,
            is_mabar: isMabar,
            total_due: r.nominal || 100000,
            status: r.statusBayar === 'LUNAS' ? 'LUNAS' : 'PENDING',
            source_system: 'GOOGLE_SHEETS',
            source_row_id: r.id,
            custom_notes: r.nomorTicket || null,
          })
          .select('id')
          .single();

        if (rErr) throw rErr;
        regId = newReg.id;
        regAction = 'INSERTED';
        stats.inserted++;
      }

      // ── 3. Upsert Payment if LUNAS ────────────────────────────────────────
      if (r.statusBayar === 'LUNAS' && regId) {
        const { data: existingPay } = await supabase
          .from('payments')
          .select('id')
          .eq('registration_id', regId)
          .eq('status', 'VERIFIED')
          .maybeSingle();

        if (!existingPay) {
          await supabase.from('payments').insert({
            registration_id: regId,
            amount: r.nominal || 100000,
            bank_destination: r.bank || null,
            proof_url: r.buktiUrl || null,
            status: 'VERIFIED',
            submitted_at: new Date().toISOString(),
            verified_at: new Date().toISOString(),
          }).select('id');
        }
      }

      await writeSyncLog(jobId, r.id, regAction === 'INSERTED' ? 'INSERTED' : regAction === 'UPDATED' ? 'UPDATED' : 'SKIPPED', 'SUCCESS',
        `${r.nama} | Row ${r.rowIndex} → ${regAction}`, { personId, regId });

      if (onProgress) onProgress({ current: stats.scanned, total: registrants.length, name: r.nama, action: regAction });
    } catch (err) {
      stats.failed++;
      await writeSyncLog(jobId, r.id, 'FAILED', 'ERROR', `Row ${r.rowIndex} gagal: ${err.message}`).catch(() => {});
    }
  }

  return stats;
}

// ─── DB → SHEETS: Write-back status + nomor tiket ke Google Sheets ────────────
async function syncDbToSheets({ spreadsheetId, accessToken, eventId, colMap, tabName, jobId, onProgress }) {
  const stats = { scanned: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  // Ambil semua registrasi LUNAS dari DB yang punya source_row_id
  const { data: regs, error } = await supabase
    .from('registrations')
    .select(`
      id, source_row_id, status, custom_notes,
      payments ( id, amount, status, verified_at )
    `)
    .eq('event_id', eventId)
    .eq('source_system', 'GOOGLE_SHEETS')
    .not('source_row_id', 'is', null);

  if (error) throw error;
  if (!regs || regs.length === 0) return stats;

  for (const reg of regs) {
    stats.scanned++;
    const rowIndex = reg.source_row_id + 1; // source_row_id is 0-indexed data row; sheet row = +2 because row 1 = header
    const sheetRowIndex = reg.source_row_id + 2; // row 1 = header

    try {
      const isVerified = reg.status === 'LUNAS' ||
        (reg.payments || []).some(p => p.status === 'VERIFIED');

      if (!isVerified) {
        stats.skipped++;
        continue;
      }

      await updateSheetPaymentStatus({
        spreadsheetId,
        accessToken,
        tabName: tabName || 'Form Responses 1',
        rowIndex: sheetRowIndex,
        colStatusIndex: colMap?.status ?? 12,
        colTicketIndex: colMap?.ticket ?? 13,
        colStatusEmailIndex: colMap?.statusEmail ?? 14,
        colBuktiIndex: colMap?.bukti ?? 6,
        status: 'LUNAS',
        nomorTicket: reg.custom_notes || '',
        statusEmail: 'TERKIRIM',
      });

      stats.updated++;
      await writeSyncLog(jobId, reg.source_row_id, 'UPDATED', 'SUCCESS',
        `DB→Sheets: Row ${sheetRowIndex} diupdate LUNAS`);

      if (onProgress) onProgress({ current: stats.scanned, total: regs.length, action: 'DB→Sheets LUNAS' });
    } catch (err) {
      stats.failed++;
      await writeSyncLog(jobId, reg.source_row_id || 0, 'FAILED', 'ERROR',
        `DB→Sheets Row ${sheetRowIndex}: ${err.message}`).catch(() => {});
    }
  }

  return stats;
}

// ─── PUBLIC INTERFACE ─────────────────────────────────────────────────────────
export const syncService = {
  /**
   * Ambil riwayat sync jobs untuk satu source
   */
  async getSyncJobs(sourceId, limit = 20) {
    let query = supabase
      .from('sync_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (sourceId) query = query.eq('source_id', sourceId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Ambil sync logs untuk satu job
   */
  async getSyncLogs(jobId) {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * MAIN: Jalankan sync dengan arah tertentu
   * @param {object} opts
   * @param {string} opts.sourceId         - external_sources.id
   * @param {string} opts.eventId          - UUID event
   * @param {string} opts.spreadsheetId    - Google Sheets ID
   * @param {string} opts.accessToken      - OAuth 2.0 Bearer
   * @param {string} [opts.direction]      - SHEETS_TO_DB | DB_TO_SHEETS | BIDIRECTIONAL
   * @param {string} [opts.userId]         - Auth user UUID
   * @param {function} [opts.onProgress]   - Progress callback
   */
  async runSync({ sourceId, eventId, spreadsheetId, accessToken, direction = 'BIDIRECTIONAL', userId, onProgress }) {
    const dir = direction.toUpperCase();
    const jobId_StoD = dir !== 'DB_TO_SHEETS' ? (await createSyncJob(sourceId, eventId, 'SHEETS_TO_DB', userId)).id : null;
    const jobId_DtoS = dir !== 'SHEETS_TO_DB' ? (await createSyncJob(sourceId, eventId, 'DB_TO_SHEETS', userId)).id : null;

    let sheetsData = null;
    let statsS = { scanned: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };
    let statsD = { scanned: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };

    // ── STEP 1: Fetch Google Sheets ───────────────────────────────────────
    try {
      sheetsData = await fetchFromGoogleOAuth(spreadsheetId, accessToken);

      // Simpan column_mapping yang terdeteksi ke DB
      await externalSourceService.saveColumnMapping(
        sourceId,
        sheetsData.colMap,
        sheetsData.tabName,
        null // presensi tab optional
      );
    } catch (err) {
      if (jobId_StoD) await finishSyncJob(jobId_StoD, statsS, `Fetch Sheets gagal: ${err.message}`);
      if (jobId_DtoS) await finishSyncJob(jobId_DtoS, statsD, `Fetch Sheets gagal: ${err.message}`);
      throw err;
    }

    // ── STEP 2: Sheets → DB ───────────────────────────────────────────────
    if (jobId_StoD && sheetsData.registrants.length > 0) {
      try {
        statsS = await syncSheetsToDb({
          registrants: sheetsData.registrants,
          source: sheetsData.source,
          jobId: jobId_StoD,
          eventId,
          onProgress: (p) => onProgress && onProgress({ ...p, phase: 'SHEETS_TO_DB' }),
        });
        await finishSyncJob(jobId_StoD, statsS);
      } catch (err) {
        await finishSyncJob(jobId_StoD, statsS, err.message);
      }
    } else if (jobId_StoD) {
      await finishSyncJob(jobId_StoD, statsS);
    }

    // ── STEP 3: DB → Sheets ───────────────────────────────────────────────
    if (jobId_DtoS) {
      try {
        statsD = await syncDbToSheets({
          spreadsheetId,
          accessToken,
          eventId,
          colMap: sheetsData.colMap,
          tabName: sheetsData.tabName,
          jobId: jobId_DtoS,
          onProgress: (p) => onProgress && onProgress({ ...p, phase: 'DB_TO_SHEETS' }),
        });
        await finishSyncJob(jobId_DtoS, statsD);
      } catch (err) {
        await finishSyncJob(jobId_DtoS, statsD, err.message);
      }
    }

    return {
      sheetsToDb: { jobId: jobId_StoD, ...statsS },
      dbToSheets: { jobId: jobId_DtoS, ...statsD },
      colMap: sheetsData.colMap,
      tabName: sheetsData.tabName,
      totalRows: sheetsData.registrants.length,
    };
  },
};

export default syncService;
