(() => {
  const config = window.FASTPRODUCTION_CONFIG;

  if (
    !config?.SUPABASE_URL ||
    !config?.SUPABASE_ANON_KEY ||
    config.SUPABASE_URL.startsWith("ISI_") ||
    config.SUPABASE_ANON_KEY.startsWith("ISI_")
  ) {
    console.error("Konfigurasi Supabase belum valid.");
    return;
  }

  if (!window.supabase?.createClient) {
    console.error("Supabase JS CDN belum tersedia.");
    return;
  }

  window.db = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  console.log("FastProduction: Supabase connected.");
})();
