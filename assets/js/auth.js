document.addEventListener("DOMContentLoaded", () => {
  const db = window.db;
  const message = document.getElementById("message");

  if (!db) {
    message.textContent = "Konfigurasi Supabase belum diisi.";
    return;
  }

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Memproses login...";

    const { error } = await db.auth.signInWithPassword({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value
    });

    if (error) {
      message.textContent = error.message;
      return;
    }

    location.href = "dashboard.html";
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Membuat akun...";

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) {
      message.textContent = error.message;
      return;
    }

    message.textContent = data.session
      ? "Akun berhasil dibuat. Silakan login."
      : "Pendaftaran berhasil. Silakan periksa email untuk verifikasi.";
  });
});
