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
    message.textContent =
      profileError?.message || "Profil tidak ditemukan.";
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

  const rupiah = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });

  function addText(parent, tag, value, className = "") {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  async function loadMachines() {
    const list = document.getElementById("machineList");
    list.innerHTML =
      '<p class="profile-empty">Memuat mesin...</p>';

    const [machineResult, adResult] = await Promise.all([
      db.from("user_machines")
        .select("id, machine_name, category, brand, model, quantity, machine_condition, notes, operator_names")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false }),

      db.from("machine_job_ads")
        .select("id, machine_id, status, published_at, expires_at")
        .eq("owner_id", targetUserId)
    ]);

    if (machineResult.error) {
      list.textContent =
        "Gagal memuat mesin: " + machineResult.error.message;
      return;
    }

    if (adResult.error) {
      list.textContent =
        "Gagal memuat status lowongan: " + adResult.error.message;
      return;
    }

    const machines = machineResult.data || [];
    const ads = adResult.data || [];

    const adMap = new Map(
      ads.map(ad => [ad.machine_id, ad])
    );

    list.replaceChildren();

    if (!machines.length) {
      list.innerHTML =
        '<p class="profile-empty">Belum ada mesin terdaftar.</p>';
      return;
    }

    machines.forEach(machine => {
      const card = document.createElement("article");
      card.className = "profile-card";

      addText(
        card,
        "h3",
        machine.machine_name || "Mesin"
      );

      const meta = document.createElement("div");
      meta.className = "profile-meta";

      [
        machine.category,
        `Jumlah: ${machine.quantity ?? 1}`,
        machine.machine_condition
      ].filter(Boolean).forEach(value => {
        const tag = addText(meta, "span", value);
        tag.className = "profile-machine-tag";
      });

      const detail = addText(
        card,
        "p",
        `${machine.brand || "-"} · ${machine.model || "-"}`
      );

      card.append(meta, detail);

      if (machine.notes) {
        addText(card, "p", machine.notes);
      }

      const operators = Array.isArray(machine.operator_names)
        ? machine.operator_names.filter(name => String(name).trim())
        : [];

      const operatorSection = document.createElement("section");
      operatorSection.style.marginTop = "14px";

      addText(
        operatorSection,
        "strong",
        "Operator / Pekerja"
      );

      if (operators.length) {
        const operatorList = document.createElement("div");
        operatorList.className = "profile-meta";
        operatorList.style.marginTop = "8px";

        operators.forEach(name => {
          const tag = addText(operatorList, "span", name);
          tag.className = "profile-machine-tag";
        });

        operatorSection.appendChild(operatorList);
      } else {
        addText(
          operatorSection,
          "p",
          "Belum ada operator terdaftar."
        );
      }

      card.appendChild(operatorSection);

      const ad = adMap.get(machine.id);

      if (!operators.length) {
        const statusSection = document.createElement("section");
        statusSection.style.marginTop = "14px";

        const status = document.createElement("div");
        status.className = "profile-meta";

        if (!ad) {
          addText(status, "span", "Belum membuka lamaran");
        } else {
          const expired =
            new Date(ad.expires_at).getTime() <= Date.now();

          if (ad.status === "published" && !expired) {
            addText(status, "span", "Sedang membuka lamaran");

            const expiry = new Date(ad.expires_at);
            addText(
              statusSection,
              "p",
              `Lowongan berlaku sampai ${expiry.toLocaleString("id-ID")}`
            );
          } else {
            addText(status, "span", "Lowongan kedaluwarsa");
          }
        }

        statusSection.appendChild(status);

        if (isOwnProfile) {
          const manageLink = document.createElement("a");
          manageLink.href = "inventaris-mesin.html";
          manageLink.textContent = ad &&
            ad.status === "published" &&
            new Date(ad.expires_at).getTime() <= Date.now()
              ? "Perbarui di Inventaris"
              : "Kelola di Inventaris";

          manageLink.style.display = "inline-block";
          manageLink.style.marginTop = "8px";
          statusSection.appendChild(manageLink);
        }

        card.appendChild(statusSection);
      }

      list.appendChild(card);
    });
  }

  async function loadScopes() {
    const list = document.getElementById("scopeList");
    list.innerHTML =
      '<p class="profile-empty">Memuat Scope...</p>';

    const { data, error } = await db
      .from("scopes")
      .select("id, title, description, target_qty, price_total, job_desks, deadline, status")
      .eq("creator_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent =
        "Gagal memuat Scope: " + error.message;
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

      addText(card, "h3", scope.title || "Tanpa Judul");

      addText(
        card,
        "p",
        scope.description || "Tidak ada deskripsi."
      );

      const price = addText(
        card,
        "p",
        scope.price_total !== null
          ? `Harga total: ${rupiah.format(scope.price_total)}`
          : "Harga belum ditentukan"
      );

      price.style.color = "#c6ff69";
      price.style.fontWeight = "800";

      const meta = document.createElement("div");
      meta.className = "profile-meta";

      [
        `Target: ${scope.target_qty ?? 0} pcs`,
        `Status: ${scope.status || "open"}`,
        scope.deadline
          ? `Deadline: ${new Date(scope.deadline).toLocaleDateString("id-ID")}`
          : "Tanpa deadline"
      ].forEach(value => {
        const tag = addText(meta, "span", value);
        tag.className = "profile-machine-tag";
      });

      card.append(meta);

      const desks = Array.isArray(scope.job_desks)
        ? scope.job_desks
        : [];

      if (desks.length) {
        const deskSection = document.createElement("section");
        deskSection.style.marginTop = "18px";

        addText(deskSection, "strong", "Rangkaian Pekerjaan");

        const deskList = document.createElement("div");
        deskList.className = "profile-meta";
        deskList.style.marginTop = "10px";

        desks.forEach(desk => {
          const tag = addText(deskList, "span", desk);
          tag.className = "profile-machine-tag";
        });

        deskSection.appendChild(deskList);
        card.appendChild(deskSection);
      }

      list.appendChild(card);
    });
  }

  await Promise.all([
    loadMachines(),
    loadScopes()
  ]);
});
