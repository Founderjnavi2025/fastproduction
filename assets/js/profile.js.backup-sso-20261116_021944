document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;

  if (!db) {
    location.href = "login.html";
    return;
  }

  const message = document.getElementById("message");
  const params = new URLSearchParams(location.search);

  const { data: authData, error: authError } = await db.auth.getUser();

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

  /* ---------- TABS ---------- */

  const tabs = {
    machines: document.getElementById("machinesTab"),
    scopes: document.getElementById("scopesTab"),
    videos: document.getElementById("videosTab"),
    designs: document.getElementById("designsTab"),
    labProduction: document.getElementById("labProductionTab")
  };

  const panels = {
    machines: document.getElementById("machinesPanel"),
    scopes: document.getElementById("scopesPanel"),
    videos: document.getElementById("videosPanel"),
    designs: document.getElementById("designsPanel"),
    labProduction: document.getElementById("labProductionPanel")
  };

  function showTab(name) {
    Object.keys(tabs).forEach(key => {
      const active = key === name;
      tabs[key].classList.toggle("active", active);
      tabs[key].setAttribute("aria-selected", active ? "true" : "false");
      panels[key].hidden = !active;
    });
  }

  Object.keys(tabs).forEach(name => {
    tabs[name].addEventListener("click", () => showTab(name));
  });

  // Lab Production hanya tersedia di profil pemilik akun yang sedang login.
  tabs.labProduction.hidden = !isOwnProfile;

  document.getElementById("manageVideosLink").hidden = !isOwnProfile;
  document.getElementById("manageDesignsLink").hidden = !isOwnProfile;

  /* ---------- LAB PRODUCTION SSO ---------- */

  const labButton = document.getElementById("openLabProduction");
  const labStatus = document.getElementById("labProductionStatus");

  if (labButton && labStatus) {
    labButton.addEventListener("click", async () => {
      if (!isOwnProfile || labButton.disabled) return;

      // Buka tab lebih awal agar tidak diblokir popup blocker.
      const popup = window.open("about:blank", "_blank");

      if (!popup) {
        labStatus.textContent =
          "Popup diblokir browser. Izinkan popup untuk FastProduction lalu coba lagi.";
        return;
      }

      labButton.disabled = true;
      labButton.textContent = "Menghubungkan...";
      labStatus.textContent = "Memverifikasi akun FastProduction...";

      try {
        const { data: sessionData, error: sessionError } =
          await db.auth.getSession();

        if (sessionError) throw sessionError;

        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi FastProduction tidak ditemukan. Silakan login ulang.");
        }

        labStatus.textContent = "Menghubungkan ke KonveksiBos...";

        // Supabase client otomatis mengirim access token sesi FastProduction.
        const { data, error } = await db.functions.invoke("fastproduction-sso", {
          body: {}
        });

        if (error) {
          let detail = error.message || "SSO gagal";

          try {
            const response = await error.context?.json();
            if (response?.error) detail = response.error;
          } catch (_) {}

          throw new Error(detail);
        }

        if (!data?.success || !data?.token_hash || !data?.room_id) {
          throw new Error(data?.error || "Respons SSO tidak lengkap.");
        }

        // Token hash dikirim lewat URL fragment agar tidak ikut dikirim ke server web.
        const handoff = new URLSearchParams({
          token_hash: data.token_hash,
          type: data.type || "magiclink",
          room_id: data.room_id
        });

        const destination =
          "https://konveksibos.vercel.app/#sso=" +
          encodeURIComponent(handoff.toString());

        labStatus.textContent =
          "Berhasil terhubung. Membuka workspace produksi...";

        popup.location.replace(destination);

      } catch (err) {
        console.error("LAB PRODUCTION SSO ERROR:", err);

        try {
          popup.close();
        } catch (_) {}

        labStatus.textContent =
          "Gagal membuka Lab Production: " +
          (err.message || "Kesalahan tidak diketahui");

      } finally {
        labButton.disabled = false;
        labButton.textContent = "Masuk Lab Production →";
      }
    });
  }

  /* ---------- PROFILE ---------- */

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

  /* ---------- HELPERS ---------- */

  const rupiah = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function emptyState(text) {
    return el("p", "profile-empty", text);
  }

  function tag(text, accent = false) {
    return el("span", accent ? "tag accent" : "tag", text);
  }

  function getYouTubeId(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();

      if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0];
      }

      if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
        return null;
      }

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

  /* ---------- MACHINES ---------- */

  async function loadMachines() {
    const list = document.getElementById("machineList");

    try {
      list.replaceChildren(emptyState("Memuat mesin..."));

      const { data: machines, error } = await db
        .from("user_machines")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      list.replaceChildren();

      if (!machines || machines.length === 0) {
        list.appendChild(emptyState("Belum ada mesin terdaftar."));
        return;
      }

      const adResult = await db
        .from("machine_job_ads")
        .select("*")
        .eq("owner_id", targetUserId);

      const ads = adResult.error ? [] : (adResult.data || []);
      const adMap = new Map(ads.map(ad => [ad.machine_id, ad]));

      machines.forEach(machine => {
        const card = el("article", "profile-card");

        card.appendChild(el("strong", "", machine.machine_name || "Mesin"));
        card.appendChild(el(
          "p",
          "",
          [machine.brand, machine.model].filter(Boolean).join(" · ") || "—"
        ));

        const meta = el("div", "meta");
        if (machine.category) meta.appendChild(tag(machine.category));
        meta.appendChild(tag(`Jumlah: ${machine.quantity ?? 1}`));
        if (machine.machine_condition) {
          meta.appendChild(tag(machine.machine_condition, true));
        }
        card.appendChild(meta);

        if (machine.notes) {
          card.appendChild(el("p", "", machine.notes));
        }

        const operators = Array.isArray(machine.operator_names)
          ? machine.operator_names.filter(name => String(name).trim())
          : [];

        if (operators.length) {
          const opMeta = el("div", "meta");
          operators.forEach(name => opMeta.appendChild(tag(name)));
          card.appendChild(opMeta);
        } else {
          const ad = adMap.get(machine.id);
          let statusText = "Belum membuka lamaran";
          let accent = false;

          if (ad) {
            const expired = new Date(ad.expires_at).getTime() <= Date.now();
            if (ad.status === "published" && !expired) {
              statusText = "Sedang membuka lamaran";
              accent = true;
            } else {
              statusText = "Lowongan kedaluwarsa";
            }
          }

          const statusMeta = el("div", "meta");
          statusMeta.appendChild(tag(statusText, accent));
          card.appendChild(statusMeta);

          if (isOwnProfile) {
            const link = el("a", "", "Kelola di Inventaris →");
            link.href = "inventaris-mesin.html";
            link.style.display = "inline-block";
            link.style.marginTop = "10px";
            link.style.color = "var(--accent)";
            link.style.fontSize = "12px";
            link.style.fontWeight = "600";
            link.style.textDecoration = "none";
            card.appendChild(link);
          }
        }

        list.appendChild(card);
      });

    } catch (err) {
      console.error("LOAD MACHINE ERROR:", err);
      list.replaceChildren(emptyState("Gagal menampilkan mesin: " + (err.message || err)));
    }
  }

  /* ---------- SCOPES ---------- */

  async function loadScopes() {
    const list = document.getElementById("scopeList");

    try {
      list.replaceChildren(emptyState("Memuat Scope..."));

      const { data, error } = await db
        .from("scopes")
        .select("*")
        .eq("creator_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      list.replaceChildren();

      if (!data || data.length === 0) {
        list.appendChild(emptyState("Belum ada Scope."));
        return;
      }

      data.forEach(scope => {
        const card = el("article", "profile-card");

        card.appendChild(el("strong", "", scope.title || "Tanpa Judul"));
        card.appendChild(el("p", "", scope.description || "Tidak ada deskripsi."));

        const meta = el("div", "meta");
        meta.appendChild(tag(`${scope.target_qty ?? 0} pcs`));
        meta.appendChild(tag(rupiah.format(scope.price_total ?? 0), true));
        meta.appendChild(tag(scope.status || "open"));
        if (scope.deadline) meta.appendChild(tag(scope.deadline));
        card.appendChild(meta);

        if (Array.isArray(scope.job_desks) && scope.job_desks.length) {
          card.appendChild(el("p", "", scope.job_desks.join(" · ")));
        }

        list.appendChild(card);
      });

    } catch (err) {
      console.error("LOAD SCOPE ERROR:", err);
      list.replaceChildren(emptyState("Gagal menampilkan Scope: " + (err.message || err)));
    }
  }

  /* ---------- VIDEOS ---------- */

  async function loadVideos() {
    const list = document.getElementById("videoList");

    list.replaceChildren(emptyState("Memuat video..."));

    const { data, error } = await db
      .from("user_videos")
      .select("id, title, description, youtube_url, created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      list.replaceChildren(emptyState("Gagal memuat video: " + error.message));
      return;
    }

    list.replaceChildren();

    if (!data || !data.length) {
      list.appendChild(emptyState("Belum ada video Production."));
      return;
    }

    data.forEach(video => {
      const card = el("article", "profile-card");
      const videoId = getYouTubeId(video.youtube_url);

      if (videoId) {
        const thumb = el("div", "video-thumb");
        const img = document.createElement("img");
        img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        img.alt = video.title || "Video";
        img.loading = "lazy";
        thumb.appendChild(img);
        card.appendChild(thumb);
      }

      card.appendChild(el("strong", "", video.title || "Tanpa Judul"));

      if (video.description) {
        card.appendChild(el("p", "", video.description));
      }

      const watch = el("a", "", "Tonton di YouTube →");
      watch.href = video.youtube_url;
      watch.target = "_blank";
      watch.rel = "noopener noreferrer";
      watch.style.display = "inline-block";
      watch.style.marginTop = "10px";
      watch.style.color = "var(--accent)";
      watch.style.fontSize = "12px";
      watch.style.fontWeight = "600";
      watch.style.textDecoration = "none";
      card.appendChild(watch);

      list.appendChild(card);
    });
  }

  /* ---------- DESIGNS ---------- */

  async function loadDesigns() {
    const list = document.getElementById("designList");

    try {
      list.replaceChildren(emptyState("Memuat desain..."));

      const { data, error } = await db
        .from("user_designs")
        .select("id, title, description, image_url, created_at")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      list.replaceChildren();

      if (!data || data.length === 0) {
        list.appendChild(emptyState("Belum ada desain."));
        return;
      }

      data.forEach(design => {
        const card = el("article", "profile-card");

        if (design.image_url) {
          const thumb = el("div", "design-thumb");
          const img = document.createElement("img");
          img.src = design.image_url;
          img.alt = design.title || "Design";
          img.loading = "lazy";
          img.onerror = () => thumb.remove();
          thumb.appendChild(img);
          card.appendChild(thumb);
        }

        card.appendChild(el("strong", "", design.title || "Tanpa Judul"));

        if (design.description) {
          card.appendChild(el("p", "", design.description));
        }

        const meta = el("div", "meta");
        meta.appendChild(tag("Harga · Segera"));
        card.appendChild(meta);

        list.appendChild(card);
      });
    } catch (err) {
      console.error("LOAD DESIGNS ERROR:", err);
      list.replaceChildren(emptyState("Gagal memuat desain: " + err.message));
    }
  }

  /* ---------- RUN ---------- */

  await Promise.all([
    loadMachines(),
    loadScopes(),
    loadVideos(),
    loadDesigns()
  ]);
});
