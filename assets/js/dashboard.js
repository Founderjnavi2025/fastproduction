document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;
  if (!db) return location.href = "login.html";

  const { data, error } = await db.auth.getUser();

  if (error || !data.user) {
    location.href = "login.html";
    return;
  }

  const user = data.user;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  document.getElementById("welcome").textContent =
    `Halo, ${profileError ? "User" : profile.full_name}`;

  document.getElementById("email").textContent = user.email;

  document.getElementById("logoutButton").addEventListener("click", async () => {
    const { error } = await db.auth.signOut();

    if (error) {
      document.getElementById("message").textContent = error.message;
      return;
    }

    location.href = "login.html";
  });
});
