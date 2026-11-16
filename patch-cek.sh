#!/data/data/com.termux/files/usr/bin/bash

# ============================================
# PATCH CEK.HTML — SSO Diagnostic lebih detail
# ============================================

CEK_HTML="cek.html"

if [ ! -f "$CEK_HTML" ]; then
  echo "❌ File $CEK_HTML gak ketemu!"
  echo "Pastiin lo jalanin script ini di root folder project."
  exit 1
fi

# Backup dulu
cp "$CEK_HTML" "$CEK_HTML.bak.$(date +%s)"
echo "✅ Backup dibuat: $CEK_HTML.bak.*"

# ============================================
# Tulis ulang cek.html dengan versi lebih bagus
# ============================================
cat > "$CEK_HTML" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cek SSO - FastProduction</title>
<style>
*{box-sizing:border-box}
body {
  font-family: 'DM Sans', Arial, sans-serif;
  background: #0b1018;
  color: #e5e7eb;
  padding: 20px;
  max-width: 720px;
  margin: auto;
  line-height: 1.5;
}
h2 { color: #a3e635; margin-top: 0; }
h3 { color: #60a5fa; font-size: 14px; margin: 20px 0 10px; }
button {
  background: #a3e635;
  color: #101810;
  border: 0;
  padding: 14px 20px;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 800;
  width: 100%;
  margin: 12px 0;
  cursor: pointer;
}
button:disabled { opacity: .4; cursor: wait; }
button.secondary { background: #263750; color: #cbd5e1; font-weight: 600; }
pre {
  background: #020617;
  padding: 15px;
  border-radius: 9px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  min-height: 150px;
  font-size: 12px;
  border: 1px solid #1e293b;
  line-height: 1.5;
}
.small { color: #9ca3af; font-size: 13px; }
.card {
  background: #111722;
  border: 1px solid #354052;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
}
.status-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #1e293b;
  font-size: 13px;
}
.status-row:last-child { border: 0; }
.status-ok { color: #6dffae; font-weight: bold; }
.status-fail { color: #ff7a7a; font-weight: bold; }
.status-warn { color: #ffd66b; font-weight: bold; }
.tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .5px;
  background: #1e293b;
  color: #94a3b8;
}
.tag.ok { background: rgba(109,255,174,.15); color: #6dffae; }
.tag.fail { background: rgba(255,122,122,.15); color: #ff7a7a; }
</style>
</head>
<body>

<h2>FastProduction SSO Diagnostic</h2>
<p class="small">Pengujian koneksi FastProduction ke Edge Function KonveksiBos.</p>

<div class="card">
  <div class="status-row"><span>Origin browser</span><strong id="origin">-</strong></div>
  <div class="status-row"><span>Client Supabase</span><strong id="clientStatus">-</strong></div>
  <div class="status-row"><span>Sesi FastProduction</span><strong id="sessionStatus">-</strong></div>
  <div class="status-row"><span>User ID</span><strong id="userId" style="font-family:monospace;font-size:11px">-</strong></div>
  <div class="status-row"><span>Token expires</span><strong id="tokenExp">-</strong></div>
</div>

<h3>Test bertahap</h3>
<button id="testSession" disabled>1. Test Session Supabase</button>
<button id="testEdge" class="secondary" disabled>2. Test Edge Function SSO</button>
<button id="testAll" class="secondary" disabled>3. Jalankan Semua Test</button>

<pre id="result">Menyiapkan diagnostic...</pre>

<script src="assets/js/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/supabase.js"></script>

<script>
(async function () {
  const $ = id => document.getElementById(id);
  const result = $("result");

  const KB_URL = "https://pbwkjdtqhzmqtcecsjot.supabase.co";
  const KB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBid2tqZHRxaHptcXRjZWNzam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NjI0NDAsImV4cCI6MjEwOTUzODQ0MH0.22jUMqyd1UoECMGzD1eB9clcHdS-N3gmySRA4yQW-ZM";

  let accessToken = null;
  let session = null;

  function log(label, value) {
    return label + ": " + value;
  }

  function fmtExp(ts) {
    if (!ts) return "-";
    const d = new Date(ts * 1000);
    const diff = Math.floor((d - Date.now()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return d.toLocaleString("id-ID") + " (" + (diff > 0 ? h + "j " + m + "m lagi" : "EXPIRED") + ")";
  }

  // ============================================
  // INIT
  // ============================================
  $("origin").textContent = location.origin;

  if (!window.db) {
    $("clientStatus").innerHTML = '<span class="tag fail">GAGAL</span>';
    $("sessionStatus").innerHTML = '<span class="tag fail">-</span>';
    result.textContent =
      "❌ window.db gak ada!\n\n" +
      "Kemungkinan penyebab:\n" +
      "1. config.js gagal load (cek path & isi file)\n" +
      "2. supabase.js gagal load\n" +
      "3. CDN @supabase/supabase-js gagal load (cek koneksi)\n\n" +
      "Fix: buka Console (F12) → liat error merah";
    return;
  }

  $("clientStatus").innerHTML = '<span class="tag ok">OK</span>';

  // ============================================
  // CEK SESSION
  // ============================================
  try {
    const { data, error } = await window.db.auth.getSession();

    if (error) throw error;

    session = data?.session;

    if (!session?.access_token) {
      $("sessionStatus").innerHTML = '<span class="tag fail">TIDAK ADA</span>';
      result.textContent =
        "❌ Sesi FastProduction gak ditemukan.\n\n" +
        "Langkah fix:\n" +
        "1. Buka login.html\n" +
        "2. Login ulang\n" +
        "3. Balik ke cek.html\n\n" +
        "Kalau masih gagal, cek localStorage di Console:\n" +
        "  Object.keys(localStorage).filter(k => k.includes('supabase'))";
      return;
    }

    accessToken = session.access_token;

    $("sessionStatus").innerHTML = '<span class="tag ok">AKTIF</span>';
    $("userId").textContent = session.user?.id || "-";
    $("tokenExp").textContent = fmtExp(session.expires_at);

    $("testSession").disabled = false;
    $("testEdge").disabled = false;
    $("testAll").disabled = false;

    result.textContent =
      "✅ Sesi FastProduction terdeteksi.\n\n" +
      log("User ID", session.user?.id) + "\n" +
      log("Email", session.user?.email || "-") + "\n" +
      log("Expires", fmtExp(session.expires_at));

  } catch (err) {
    $("sessionStatus").innerHTML = '<span class="tag fail">ERROR</span>';
    result.textContent = "❌ Error cek session: " + err.message;
    return;
  }

  // ============================================
  // TEST 1: SESSION
  // ============================================
  $("testSession").addEventListener("click", async () => {
    $("testSession").disabled = true;
    result.textContent = "Testing session Supabase...\n\n";

    try {
      const { data, error } = await window.db.auth.getUser();

      if (error) throw error;

      result.textContent +=
        "✅ getUser() OK\n" +
        log("User ID", data.user?.id) + "\n" +
        log("Email", data.user?.email || "-") + "\n" +
        log("Metadata", JSON.stringify(data.user?.user_metadata || {}));

    } catch (err) {
      result.textContent += "❌ getUser() GAGAL: " + err.message;
    } finally {
      $("testSession").disabled = false;
    }
  });

  // ============================================
  // TEST 2: EDGE FUNCTION
  // ============================================
  async function testEdge() {
    result.textContent = "Mengirim POST ke Edge Function KonveksiBos...\n\n";

    const start = Date.now();

    try {
      const response = await fetch(
        KB_URL + "/functions/v1/fastproduction-sso",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": KB_ANON,
            "Authorization": "Bearer " + accessToken
          },
          body: JSON.stringify({})
        }
      );

      const elapsed = Date.now() - start;
      const body = await response.json().catch(() => ({}));

      result.textContent +=
        "HTTP STATUS: " + response.status + "\n" +
        "HTTP OK: " + response.ok + "\n" +
        "DURASI: " + elapsed + "ms\n" +
        "SUCCESS: " + Boolean(body.success) + "\n" +
        "TOKEN HASH: " + (body.token_hash ? "DITERIMA" : "TIDAK ADA") + "\n" +
        "TOKEN TYPE: " + (body.type || "-") + "\n" +
        "ROOM ID: " + (body.room_id || "-") + "\n" +
        "ROOM NAME: " + (body.room_name || "-") + "\n" +
        "ERROR: " + (body.error || "Tidak ada") + "\n\n";

      if (!response.ok) {
        result.textContent +=
          "⚠️  Edge Function return error.\n\n" +
          "Kemungkinan penyebab:\n" +
          "- Token expired → login ulang\n" +
          "- Edge Function belum deploy\n" +
          "- CORS origin gak diizinkan\n" +
          "- Anon key salah\n\n" +
          "Cek log Edge Function di Supabase Dashboard.";
      } else if (!body.success) {
        result.textContent +=
          "⚠️  Response OK tapi success=false.\n" +
          "Cek error message di atas.";
      } else {
        result.textContent +=
          "✅ SSO BERHASIL!\n\n" +
          "Coba buka Lab Production dari profile.html";
      }

    } catch (err) {
      result.textContent +=
        "❌ FETCH GAGAL\n\n" +
        err.name + ": " + err.message + "\n\n" +
        "Kemungkinan penyebab:\n" +
        "- Koneksi internet putus\n" +
        "- CORS diblokir browser\n" +
        "- URL Edge Function salah\n" +
        "- Mixed content (HTTPS vs HTTP)\n\n" +
        "Cek Console (F12) buat detail error.";
    }
  }

  $("testEdge").addEventListener("click", async () => {
    $("testEdge").disabled = true;
    await testEdge();
    $("testEdge").disabled = false;
  });

  // ============================================
  // TEST 3: SEMUA
  // ============================================
  $("testAll").addEventListener("click", async () => {
    $("testAll").disabled = true;
    $("testSession").disabled = true;
    $("testEdge").disabled = true;

    result.textContent = "=== TEST SEMUA ===\n\n";

    // Test session
    result.textContent += "--- 1. SESSION ---\n";
    try {
      const { data, error } = await window.db.auth.getUser();
      if (error) throw error;
      result.textContent += "✅ getUser() OK — " + data.user?.email + "\n\n";
    } catch (err) {
      result.textContent += "❌ getUser() GAGAL: " + err.message + "\n\n";
      $("testAll").disabled = false;
      return;
    }

    // Test edge
    result.textContent += "--- 2. EDGE FUNCTION ---\n";
    await testEdge();

    $("testAll").disabled = false;
    $("testSession").disabled = false;
    $("testEdge").disabled = false;
  });

})();
</script>

</body>
</html>
HTMLEOF

echo ""
echo "============================================"
echo "✅ PATCH CEK.HTML SELESAI"
echo "============================================"
echo ""
echo "📋 Yang berubah:"
echo "  - Status card dengan indikator visual (OK/GAGAL)"
echo "  - Token expiry info + countdown"
echo "  - Test bertahap (session → edge → semua)"
echo "  - Error message lebih detail + saran fix"
echo "  - Durasi request (buat deteksi timeout)"
echo "  - User metadata ditampilin"
echo ""
echo "🔄 Buka cek.html di browser buat test"
echo ""
echo "💾 Backup tersimpan di: $CEK_HTML.bak.*"
echo "   Restore: cp $CEK_HTML.bak.TIMESTAMP $CEK_HTML"
