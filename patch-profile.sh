#!/data/data/com.termux/files/usr/bin/bash

# ============================================
# PATCH PROFILE.JS — Fix nama gak load
# ============================================

PROFILE_JS="assets/js/profile.js"

if [ ! -f "$PROFILE_JS" ]; then
  echo "❌ File $PROFILE_JS gak ketemu!"
  echo "Pastiin lo jalanin script ini di root folder project."
  exit 1
fi

# Backup dulu
cp "$PROFILE_JS" "$PROFILE_JS.bak.$(date +%s)"
echo "✅ Backup dibuat: $PROFILE_JS.bak.*"

# ============================================
# FIX 1: Guard window.db — jangan redirect
# ============================================
sed -i 's|if (!db) {\n    location.href = "login.html";\n    return;\n  }|PLACEHOLDER|g' "$PROFILE_JS"

# Pake python buat replace multi-line (sed susah buat multiline)
python3 - << 'PYEOF'
import re

path = "assets/js/profile.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# ============================================
# FIX 1: window.db guard — jangan redirect
# ============================================
old_db_guard = '''  const db = window.db;

  if (!db) {
    location.href = "login.html";
    return;
  }'''

new_db_guard = '''  const db = window.db;

  if (!db) {
    document.getElementById("profileName").textContent = "Koneksi gagal";
    document.getElementById("profileBio").textContent = "Supabase belum terhubung. Periksa config.js dan supabase.js.";
    document.getElementById("message").textContent = "Supabase belum terhubung. Periksa config.js dan supabase.js.";
    return;
  }'''

if old_db_guard in code:
    code = code.replace(old_db_guard, new_db_guard)
    print("✅ FIX 1: window.db guard — redirect diganti pesan error")
else:
    print("⚠️  FIX 1: pattern window.db gak ketemu (mungkin udah dipatch)")

# ============================================
# FIX 2: getUser() error → coba getSession() dulu
# ============================================
old_auth = '''  const { data: authData, error: authError } = await db.auth.getUser();

  if (authError || !authData.user) {
    location.href = "login.html";
    return;
  }

  const currentUser = authData.user;'''

new_auth = '''  let authData = await db.auth.getUser();

  // FIX: coba refresh session dulu sebelum redirect
  if (authData.error || !authData.data?.user) {
    const { data: sessionData } = await db.auth.getSession();
    if (sessionData?.session?.user) {
      authData = { data: { user: sessionData.session.user }, error: null };
    } else {
      location.href = "login.html";
      return;
    }
  }

  const currentUser = authData.data.user;'''

if old_auth in code:
    code = code.replace(old_auth, new_auth)
    print("✅ FIX 2: getUser() fallback ke getSession()")
else:
    print("⚠️  FIX 2: pattern auth gak ketemu (mungkin udah dipatch)")

# ============================================
# FIX 3: profile null → fallback ke user_metadata
# ============================================
old_profile = '''  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, full_name, bio, address")
    .eq("id", targetUserId)
    .maybeSingle();

  if (profileError || !profile) {
    message.textContent = profileError?.message || "Profil tidak ditemukan.";
    return;
  }

  document.getElementById("profileName").textContent =
    profile.full_name || "Pengguna FastProduction";
  document.getElementById("profileAvatar").textContent =
    (profile.full_name || "U").trim().charAt(0).toUpperCase();
  document.getElementById("profileBio").textContent =
    profile.bio || "Belum ada bio.";
  document.getElementById("profileAddress").textContent =
    profile.address || "";'''

new_profile = '''  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, full_name, bio, address")
    .eq("id", targetUserId)
    .maybeSingle();

  // FIX: jangan return kalau profile null, pake fallback
  const displayName =
    profile?.full_name ||
    currentUser.user_metadata?.full_name ||
    "Pengguna FastProduction";

  document.getElementById("profileName").textContent = displayName;
  document.getElementById("profileAvatar").textContent =
    displayName.trim().charAt(0).toUpperCase() || "U";
  document.getElementById("profileBio").textContent =
    profile?.bio || "Belum ada bio.";
  document.getElementById("profileAddress").textContent =
    profile?.address || "";

  // Cuma tampilin error kalau beneran gagal query (bukan karena null)
  if (profileError) {
    message.textContent = "Gagal memuat profil: " + profileError.message;
  }'''

if old_profile in code:
    code = code.replace(old_profile, new_profile)
    print("✅ FIX 3: profile null fallback ke user_metadata")
else:
    print("⚠️  FIX 3: pattern profile gak ketemu (mungkin udah dipatch)")

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("")
print("🎉 Patch selesai!")
PYEOF

echo ""
echo "============================================"
echo "✅ PATCH SELESAI"
echo "============================================"
echo ""
echo "📋 Yang udah dipatch:"
echo "  1. window.db gak ada → pesan error (gak redirect)"
echo "  2. getUser() error → coba getSession() dulu"
echo "  3. profile null → fallback ke user_metadata.full_name"
echo ""
echo "🔄 Coba buka profile.html lagi di browser"
echo "   Kalau masih gagal, cek Console (F12)"
echo ""
echo "💾 Backup tersimpan di: $PROFILE_JS.bak.*"
echo "   Restore: cp $PROFILE_JS.bak.TIMESTAMP $PROFILE_JS"
