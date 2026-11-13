document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;
  const message = document.getElementById("message");
  const form = document.getElementById("profileForm");
  const saveButton = document.getElementById("saveButton");

  if (!db) {
    location.href = "login.html";
    return;
  }

  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData.user) {
    location.href = "login.html";
    return;
  }

  const user = authData.user;

  const { data: profile, error } = await db
    .from("profiles")
    .select("full_name, bio, address")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    message.textContent = error?.message || "Profil tidak ditemukan.";
    return;
  }

  document.getElementById("fullName").value = profile.full_name || "";
  document.getElementById("bio").value = profile.bio || "";
  document.getElementById("address").value = profile.address || "";

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const updates = {
      full_name: document.getElementById("fullName").value.trim(),
      bio: document.getElementById("bio").value.trim(),
      address: document.getElementById("address").value.trim()
    };

    if (!updates.full_name) {
      message.textContent = "Nama tidak boleh kosong.";
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Menyimpan...";
    message.textContent = "";

    const { error: updateError } = await db
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    saveButton.disabled = false;
    saveButton.textContent = "Simpan Perubahan";

    if (updateError) {
      message.textContent = updateError.message;
      return;
    }

    message.textContent = "Profil berhasil diperbarui.";

    setTimeout(() => {
      location.href = "profile.html";
    }, 700);
  });
});
