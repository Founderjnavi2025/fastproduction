document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;

  if (!db) {
    location.href = "login.html";
    return;
  }

  const message = document.getElementById("message");
  const params = new URLSearchParams(location.search);

  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData.user) {
    location.href = "login.html";
    return;
  }

  const currentUser = authData.user;
  const targetUserId = params.get("id") || currentUser.id;
  const isOwnProfile = targetUserId === currentUser.id;

  const editButton = document.getElementById("editProfileButton");
  editButton.hidden = !isOwnProfile;

  editButton.addEventListener("click", () => {
    location.href = "edit-profile.html";
  });

  const machinesTab = document.getElementById("machinesTab");
  const scopesTab = document.getElementById("scopesTab");
  const machinesPanel = document.getElementById("machinesPanel");
  const scopesPanel = document.getElementById("scopesPanel");

  machinesTab.addEventListener("click", () => {
    machinesTab.classList.add("active");
    scopesTab.classList.remove("active");
    machinesPanel.hidden = false;
    scopesPanel.hidden = true;
  });

  scopesTab.addEventListener("click", () => {
    scopesTab.classList.add("active");
    machinesTab.classList.remove("active");
    scopesPanel.hidden = false;
    machinesPanel.hidden = true;
  });

  const { data: profile, error: profileError } = await db
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
    profile.address || "";

  async function loadMachines() {
    const list = document.getElementById("machineList");
    list.innerHTML = '<p class="profile-empty">Memuat mesin...</p>';

    const { data, error } = await db
      .from("user_machines")
      .select("machine_name, category, brand, model, quantity, machine_condition, notes")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = "Gagal memuat mesin: " + error.message;
      return;
    }

    list.replaceChildren();

    if (!data.length) {
      list.innerHTML = '<p class="profile-empty">Belum ada mesin terdaftar.</p>';
      return;
    }

    data.forEach(machine => {
      const card = document.createElement("article");
      card.className = "profile-card";

      const title = document.createElement("h3");
      title.textContent = machine.machine_name || "Mesin";

      const meta = document.createElement("div");
      meta.className = "profile-meta";

      [
        machine.category,
        `Jumlah: ${machine.quantity ?? 1}`,
        machine.machine_condition
      ].filter(Boolean).forEach(value => {
        const tag = document.createElement("span");
        tag.textContent = value;
        meta.appendChild(tag);
      });

      const detail = document.createElement("p");
      detail.textContent =
        `${machine.brand || "-"} · ${machine.model || "-"}`;

      card.append(title, meta, detail);

      if (machine.notes) {
        const notes = document.createElement("p");
        notes.textContent = machine.notes;
        card.appendChild(notes);
      }

      list.appendChild(card);
    });
  }

  async function loadScopes() {
    const list = document.getElementById("scopeList");
    list.innerHTML = '<p class="profile-empty">Memuat Scope...</p>';

    const { data, error } = await db
      .from("scopes")
      .select("id, title, description, target_qty, deadline, status")
      .eq("creator_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = "Gagal memuat Scope.";
      console.error("Load scopes:", error);
      return;
    }

    list.replaceChildren();

    if (!data.length) {
      list.innerHTML = '<p class="profile-empty">Belum ada Scope.</p>';
      return;
    }

    data.forEach(scope => {
      const card = document.createElement("article");
      card.className = "profile-card";

      const title = document.createElement("h3");
      title.textContent = scope.title || "Tanpa Judul";

      const description = document.createElement("p");
      description.textContent = scope.description || "Tidak ada deskripsi.";

      const meta = document.createElement("div");
      meta.className = "profile-meta";

      [
        `Target: ${scope.target_qty ?? 0} pcs`,
        `Status: ${scope.status || "open"}`,
        scope.deadline
          ? `Deadline: ${new Date(scope.deadline).toLocaleDateString("id-ID")}`
          : "Tanpa deadline"
      ].forEach(value => {
        const tag = document.createElement("span");
        tag.textContent = value;
        meta.appendChild(tag);
      });

      card.append(title, description, meta);
      list.appendChild(card);
    });
  }

  await Promise.all([loadMachines(), loadScopes()]);
});
