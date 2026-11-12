document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  const showMessage = (message, type = "error") => {
    const el = document.getElementById("authMessage");
    if (!el) return;
    el.textContent = message;
    el.className = `message show ${type}`;
  };

  const setLoading = (button, loading, label) => {
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Memproses..." : label;
  };

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!window.db) {
        showMessage("Koneksi Supabase belum tersedia. Periksa konfigurasi.");
        return;
      }

      const fullName = document.getElementById("full_name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const button = document.getElementById("registerButton");

      if (fullName.length < 2) {
        showMessage("Nama lengkap minimal 2 karakter.");
        return;
      }

      if (password.length < 8) {
        showMessage("Password minimal 8 karakter.");
        return;
      }

      setLoading(button, true, "Buat Akun ↗");

      try {
        const { data, error } = await window.db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (error) throw error;

        if (data.session) {
          showMessage("Pendaftaran berhasil. Mengalihkan ke dashboard...", "success");
          setTimeout(() => location.href = "dashboard.html", 900);
        } else {
          showMessage("Pendaftaran berhasil. Silakan periksa email untuk verifikasi akun.", "success");
          registerForm.reset();
          setLoading(button, false, "Buat Akun ↗");
        }
      } catch (error) {
        showMessage(error.message || "Pendaftaran gagal. Silakan coba lagi.");
        setLoading(button, false, "Buat Akun ↗");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!window.db) {
        showMessage("Koneksi Supabase belum tersedia. Periksa konfigurasi.");
        return;
      }

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const button = document.getElementById("loginButton");

      setLoading(button, true, "Masuk ↗");

      try {
        const { error } = await window.db.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        showMessage("Login berhasil. Mengalihkan...", "success");
        setTimeout(() => location.href = "dashboard.html", 700);
      } catch (error) {
        showMessage(error.message || "Login gagal. Periksa email dan password.");
        setLoading(button, false, "Masuk ↗");
      }
    });
  }
});
