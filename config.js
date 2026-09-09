/**
 * Configuration loader for client-side JavaScript.
 * Automatically attempts to fetch dynamic environment variables from the local server (/api/config),
 * with robust fallbacks to localStorage or sensible defaults.
 */

const DIGNITI_CONFIG = {
  spreadsheetId: '1A2B3C4D5E6F7G8H9I0J_DIGNITI_SHEET_ID',
  tabRegistrasi: 'DB_Registrasi_Webinar',
  tabPresensi: 'DB_Presensi_&_Sertifikat',
  sheetsApiKey: '',
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbx_DIGNITI_GAS_DEPLOYMENT_ID/exec',
  adminPhone: '6289681077483',
  defaultSpeaker: 'diyah',
  serverPort: 8080
};

// Fetch live .env config from server if running via Node.js
async function loadServerConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      Object.assign(DIGNITI_CONFIG, data);
      console.log('✅ Configuration loaded from .env via Node.js server:', DIGNITI_CONFIG);
    }
  } catch (e) {
    console.log('ℹ️ Running in direct static file mode (Using local config)');
  }
}

// Auto load config on script execution
loadServerConfig();
