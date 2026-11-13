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

  const tabs = {
    machines: document.getElementById("machinesTab"),
    scopes: document.getElementById("scopesTab"),
    videos: document.getElementById("videosTab")
  };

  const panels = {
    machines: document.getElementById("machinesPanel"),
    scopes: document.getElementById("scopesPanel"),
    videos: document.getElementById("videosPanel")
  };

  function showTab(name) {
    Object.keys(tabs).forEach(key => {
      tabs[key].classList.toggle("active", key === name);
      panels[key].hidden = key !== name;
    });
  }

  Object.keys(tabs).forEach(name => {
    tabs[name].addEventListener("click", () => showTab(name));
  });

  const manageVideosLink =
    document.getElementById("manageVideosLink");

  manageVideosLink.hidden = !isOwnProfile;

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
    element.textContent = value ?? "";
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
    const adMap = new Map(ads.map(ad => [ad.machine_id, ad]));

    list.replaceChildren();

    if (!machines.length) {
      list.innerHTML =
        '<p class="profile-empty">Belum ada mesin terdaftar.</p>';
      return;
    }

    machines.forEach(machine => {
      const card = document.createElement("article");
      card.className = "profile-card";

      addText(card, "h3", machine.machine_name || "Mesin");

      const meta = document.createElement("div");
      meta.className = "profile-meta";

      [
        machine.category,
        `Jumlah: ${machine.quantity ?? 1}`,
        machine.machine_condition
      ].filter(Boolean).forEach(value => {
        addText(meta, "span", value, "profile-machine-tag");
      });

      addText(
        card,
        "p",
        `${machine.brand || "-"} · ${machine.model || "-"}`
      );

      card.appendChild(meta);

      if (machine.notes) addText(card, "p", machine.notes);

      const operators = Array.isArray(machine.operator_names)
        ? machine.operator_names.filter(name => String(name).trim())
        : [];

      const operatorSection = document.createElement("section");
      operatorSection.style.marginTop = "14px";

      addText(operatorSection, "strong", "Operator / Pekerja");

      if (operators.length) {
        const operatorList = document.createElement("div");
        operatorList.className = "profile-meta";
        operatorList.style.marginTop = "8px";

        operators.forEach(name => {
          addText(operatorList, "span", name, "profile-machine-tag");
        });

        operatorSection.appendChild(operatorList);
      } else {
        addText(operatorSection, "p", "Belum ada operator terdaftar.");
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

            addText(
              statusSection,
              "p",
              `Lowongan berlaku sampai ${new Date(ad.expires_at).toLocaleString("id-ID")}`
            );
          } else {
            addText(status, "span", "Lowongan kedaluwarsa");
          }
        }

        statusSection.appendChild(status);

        if (isOwnProfile) {
          const manageLink = document.createElement("a");
          manageLink.href = "inventaris-mesin.html";
          manageLink.textContent = "Kelola di Inventaris";
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

    try {
      list.textContent = "Memuat Scope...";

      const { data, error } = await db
        .from("scopes")
        .select("*")
        .eq("creator_id", targetUserId)
        .order("created_at", { ascending: false });

      console.log("SCOPE DEBUG:", { targetUserId, data, error });

      if (error) throw error;

      list.replaceChildren();

      if (!data || data.length === 0) {
        list.textContent = "Belum ada Scope.";
        return;
      }

      data.forEach(scope => {
        const card = document.createElement("article");
        card.className = "profile-card";

        const title = document.createElement("h3");
        title.textContent = scope.title || "Tanpa Judul";
        card.appendChild(title);

        const description = document.createElement("p");
        description.textContent = scope.description || "Tidak ada deskripsi.";
        card.appendChild(description);

        const details = [
          "Target: " + (scope.target_qty ?? 0) + " pcs",
          "Harga total: " + rupiah.format(scope.price_total ?? 0),
          "Status: " + (scope.status || "open"),
          "Deadline: " + (scope.deadline || "Tanpa deadline")
        ];

        details.forEach(value => {
          const p = document.createElement("p");
          p.textContent = value;
          card.appendChild(p);
        });

        if (Array.isArray(scope.job_desks) && scope.job_desks.length) {
          const desks = document.createElement("p");
          desks.textContent = "Pekerjaan: " + scope.job_desks.join(", ");
          card.appendChild(desks);
        }

        list.appendChild(card);
      });

    } catch (err) {
      console.error("LOAD SCOPE ERROR:", err);
      list.textContent = "Gagal menampilkan Scope: " + (err.message || err);
    }
  }

  async function loadVideos() {
    const list = document.getElementById("videoList");
    list.innerHTML =
      '<p class="profile-empty">Memuat video...</p>';

    const { data, error } = await db
      .from("user_videos")
      .select("id, title, description, youtube_url, created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent =
        "Gagal memuat video: " + error.message;
      return;
    }

    list.replaceChildren();

    if (!data || !data.length) {
      list.innerHTML =
        '<p class="profile-empty">Belum ada video Production.</p>';
      return;
    }

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns =
      "repeat(auto-fit, minmax(min(100%, 240px), 1fr))";
    grid.style.gap = "16px";

    data.forEach(video => {
      const card = document.createElement("article");
      card.className = "profile-card";

      const link = document.createElement("a");
      link.href = video.youtube_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "block";

      const thumbnail = document.createElement("img");
      const videoId = getYouTubeId(video.youtube_url);

      thumbnail.src =
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      thumbnail.alt = video.title;
      thumbnail.loading = "lazy";
      thumbnail.style.width = "100%";
      thumbnail.style.aspectRatio = "16 / 9";
      thumbnail.style.objectFit = "cover";
      thumbnail.style.borderRadius = "10px";

      link.appendChild(thumbnail);
      card.appendChild(link);

      addText(card, "h3", video.title);

      if (video.description) {
        addText(card, "p", video.description);
      }

      const watch = document.createElement("a");
      watch.href = video.youtube_url;
      watch.target = "_blank";
      watch.rel = "noopener noreferrer";
      watch.textContent = "Tonton di YouTube ↗";
      card.appendChild(watch);

      grid.appendChild(card);
    });

    list.appendChild(grid);
  }

  function getYouTubeId(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();

      if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0];
      }

      if (![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com"
      ].includes(host)) return null;

      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const parts = url.pathname.split("/").filter(Boolean);

      if (["shorts", "live", "embed"].includes(parts[0])) {
        return parts[1];
      }

      return null;
    } catch {
      return null;
    }
  }

  await Promise.all([
    loadMachines(),
    loadScopes(),
    loadVideos()
  ]);
});
