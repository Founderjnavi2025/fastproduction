document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;
  const message = document.getElementById("message");

  if (!db) return location.href = "login.html";

  const { data: authData, error: authError } = await db.auth.getUser();

  if (authError || !authData.user) {
    location.href = "login.html";
    return;
  }

  const user = authData.user;

  const { data: profile, error } = await db
    .from("profiles")
    .select("full_name, bio, address")
    .eq("id", user.id)
    .single();

  if (error) {
    message.textContent = error.message;
    return;
  }

  document.getElementById("fullName").value = profile.full_name || "";
  document.getElementById("bio").value = profile.bio || "";
  document.getElementById("address").value = profile.address || "";

  document.getElementById("profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Menyimpan...";

    const updates = {
      full_name: document.getElementById("fullName").value.trim(),
      bio: document.getElementById("bio").value.trim(),
      address: document.getElementById("address").value.trim()
    };

    if (!updates.full_name) {
      message.textContent = "Nama tidak boleh kosong.";
      return;
    }

    const { error: updateError } = await db
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    message.textContent = updateError
      ? updateError.message
      : "Profil berhasil diperbarui.";
  });
});
