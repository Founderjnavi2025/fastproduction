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
  const requestedId = params.get("id");

  const targetUserId = requestedId || currentUser.id;
  const isOwnProfile = targetUserId === currentUser.id;

  const profileEditor = document.getElementById("profileEditor");
  const profileForm = document.getElementById("profileForm");

  // Tampilkan form edit hanya untuk profil sendiri.
  profileEditor.hidden = !isOwnProfile;

  // TAB
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

  // LOAD PROFILE
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, full_name, bio, address")
    .eq("id", targetUserId)
    .maybeSingle();

  if (profileError || !profile) {
    message.textContent =
      profileError?.message || "Profil tidak ditemukan.";
    return;
  }

  document.getElementById("profileName").textContent =
    profile.full_name || "Pengguna FastProduction";

  document.getElementById("profileBio").textContent =
    profile.bio || "Belum ada bio.";

  document.getElementById("profileAddress").textContent =
    profile.address || "";

  document.getElementById("fullName").value =
    profile.full_name || "";

  document.getElementById("bio").value =
    profile.bio || "";

  document.getElementById("address").value =
    profile.address || "";

  // EDIT PROFILE SENDIRI
  if (isOwnProfile) {
    profileForm.addEventListener("submit", async event => {
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

      const { error } = await db
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id);

      if (error) {
        message.textContent = error.message;
        return;
      }

      document.getElementById("profileName").textContent =
        updates.full_name;

      document.getElementById("profileBio").textContent =
        updates.bio || "Belum ada bio.";

      document.getElementById("profileAddress").textContent =
        updates.address || "";

      message.textContent = "Profil berhasil diperbarui.";
    });
  }

  // LOAD MACHINES
  async function loadMachines() {
    const list = document.getElementById("machineList");

    list.innerHTML =
      '<p class="profile-empty">Memuat mesin...</p>';

    const { data, error } = await db
      .from("user_machines")
      .select("machine_name, category, brand, model, quantity, machine_condition, notes")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = "Tidak dapat memuat mesin: " + error.message;
      return;
    }

    list.replaceChildren();

    if (!data.length) {
      list.innerHTML =
        '<p class="profile-empty">Belum ada mesin terdaftar.</p>';
      return;
    }

    data.forEach(machine => {
      const card = document.createElement("article");
      card.className = "profile-card";

      const title = document.createElement("h3");
      title.textContent = machine.machine_name;

      const meta = document.createElement("div");
      meta.className = "profile-meta";

      [
        machine.category,
        `Jumlah: ${machine.quantity}`,
        machine.machine_condition
      ].forEach(value => {
        const tag = document.createElement("span");
        tag.textContent = value || "-";
        meta.appendChild(tag);
      });

      const detail = document.createElement("p");
      detail.textContent =
        `Merek: ${machine.brand || "-"} · Model: ${machine.model || "-"}`;

      const notes = document.createElement("p");
      notes.textContent = machine.notes || "";

      card.append(title, meta, detail, notes);
      list.appendChild(card);
    });
  }

  // LOAD SCOPES
  async function loadScopes() {
    const list = document.getElementById("scopeList");

    list.innerHTML =
      '<p class="profile-empty">Memuat Scope...</p>';

    const { data, error } = await db
      .from("scopes")
      .select("id, title, description, target_qty, deadline, status")
      .eq("creator_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent =
        "Data Scope belum tersedia atau belum dapat diakses.";
      console.error("Load scopes:", error);
      return;
    }

    list.replaceChildren();

    if (!data.length) {
      list.innerHTML =
        '<p class="profile-empty">Belum ada Scope.</p>';
      return;
    }

    data.forEach(scope => {
      const card = document.createElement("article");
      card.className = "profile-card";

      const title = document.createElement("h3");
      title.textContent = scope.title || "Tanpa Judul";

      const description = document.createElement("p");
      description.textContent =
        scope.description || "Tidak ada deskripsi.";

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

  await Promise.all([
    loadMachines(),
    loadScopes()
  ]);
});
