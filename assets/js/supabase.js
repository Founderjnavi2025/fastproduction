(() => {
  const config = window.FASTPRODUCTION_CONFIG;

  if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY ||
      config.SUPABASE_URL.startsWith("https://desnuldfjxawlzjixofx.supabase.co") ||
      config.SUPABASE_ANON_KEY.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlc251bGRmanhhd2x6aml4b2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODk2ODksImV4cCI6MjExMDA2NTY4OX0.1ezJ5MXWXYm1e6m-0RkQPWL9JyqTi9Ic6fAH1yLTqXI")) {
    console.error("Isi konfigurasi Supabase terlebih dahulu.");
    return;
  }

  window.db = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );
})();
