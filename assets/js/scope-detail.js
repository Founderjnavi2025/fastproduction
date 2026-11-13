(() => {
  const root = document.getElementById("detailRoot");
  const db = window.db;

  const JOB_DESKS = [
    "Pembuatan pola",
    "Marker",
    "Potong bahan",
    "Fusing",
    "Sablon",
    "Bordir",
    "Printing",
    "Jahit",
    "Obras",
    "Kam / Overdeck",
    "Jahit rantai",
    "Pasang resleting",
    "Lubang kancing",
    "Pasang kancing",
    "Pasang label",
    "Trimming benang",
    "Washing",
    "Setrika / Steam",
    "Quality Control",
    "Lipat barang",
    "Packaging"
  ];

  const esc = value => String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]
  );

  const rupiah = value =>
    "Rp" + Number(value || 0).toLocaleString("id-ID");

  const dateFormat = value => {
    if (!value) return "Belum ditentukan";
    return new Date(value + "T00:00:00").toLocaleDateString(
      "id-ID",
      { day: "numeric", month: "long", year: "numeric" }
    );
  };

  const chips = jobs => {
    if (!Array.isArray(jobs) || !jobs.length) {
      return '<p>Belum ada jenis pekerjaan.</p>';
    }

    return `
      <div class="job-chips">
        ${jobs.map(job =>
          `<span class="job-chip">${esc(job)}</span>`
        ).join("")}
      </div>
    `;
  };

  async function init() {
    if (!db) {
      root.innerHTML = '<div class="empty-note">Koneksi database belum tersedia.</div>';
      return;
    }

    const { data: authData, error: authError } =
      await db.auth.getUser();

    if (authError || !authData.user) {
      window.location.replace("index.html");
      return;
    }

    const user = authData.user;
    const params = new URLSearchParams(window.location.search);
    const scopeId = params.get("id");

    if (!scopeId) {
      root.innerHTML = '<div class="empty-note">ID Scope tidak ditemukan.</div>';
      return;
    }

    const { data: scope, error: scopeError } = await db
      .from("scopes")
      .select(`
        id,
        creator_id,
        title,
        description,
        target_qty,
        deadline,
        status,
        price_total,
        job_desks,
        created_at,
        creator:profiles!scopes_creator_id_fkey(full_name)
      `)
      .eq("id", scopeId)
      .maybeSingle();

    if (scopeError || !scope) {
      root.innerHTML = '<div class="empty-note">Scope tidak ditemukan atau tidak dapat dimuat.</div>';
      return;
    }

    const isOwner = scope.creator_id === user.id;

    let isPublished = false;

    const { data: publication, error: publicationError } =
      await db
        .from("scope_publications")
        .select("scope_id")
        .eq("scope_id", scopeId)
        .maybeSingle();

    if (!publicationError && publication) {
      isPublished = true;
    }

    if (!isOwner && !isPublished) {
      root.innerHTML = '<div class="empty-note">Scope ini belum dipublikasikan.</div>';
      return;
    }

    renderScope(scope, isOwner, isPublished);
    await loadOffers(scope, user, isOwner, isPublished);
  }

  function renderScope(scope, isOwner, isPublished) {
    const status = String(scope.status || "unknown").toUpperCase();
    const ownerName = scope.creator?.full_name || "Pengguna FastProduction";
    const jobs = Array.isArray(scope.job_desks) ? scope.job_desks : [];

    root.innerHTML = `
      <section class="detail-header">
        <div class="detail-title-row">
          <h1>${esc(scope.title)}</h1>
          <span class="scope-status">${esc(status)}</span>
        </div>

        <p class="detail-owner">
          Pemilik: ${esc(ownerName)}
        </p>

        <div class="detail-stats">
          <div class="detail-stat">
            <strong>${Number(scope.target_qty || 0).toLocaleString("id-ID")}</strong>
            <small>Target produksi / pcs</small>
          </div>

          <div class="detail-stat">
            <strong>${rupiah(scope.price_total)}</strong>
            <small>Harga total produksi</small>
          </div>
        </div>

        <p>Deadline: ${esc(dateFormat(scope.deadline))}</p>
        <p>Dipublikasikan: ${isPublished ? "Ya" : "Belum"}</p>
      </section>

      <section class="detail-section">
        <h2 class="accent">Detail Produksi</h2>
        <p>${esc(scope.description || "Tidak ada deskripsi tambahan.")}</p>
        <p>Target produksi: ${Number(scope.target_qty || 0).toLocaleString("id-ID")} pcs</p>
        <p>Harga total: ${rupiah(scope.price_total)}</p>
        <p>Deadline: ${esc(dateFormat(scope.deadline))}</p>
      </section>

      <section class="detail-section">
        <h2 class="accent">Jenis Pekerjaan</h2>
        ${chips(jobs)}
      </section>

      <div id="offerArea"></div>
      <section class="detail-section">
        <h2 class="accent" id="offerHeading">
          ${isOwner ? "Penawaran Masuk" : "Penawaran Saya"}
        </h2>
        <div id="offerList">
          <div class="empty-note">Memuat penawaran...</div>
        </div>
      </section>
    `;

    const offerArea = document.getElementById("offerArea");

    if (!isOwner && scope.status === "open" && isPublished) {
      offerArea.innerHTML = renderOfferForm();
      bindOfferForm(scope);
    } else if (!isOwner) {
      offerArea.innerHTML = `
        <section class="detail-section">
          <p>Scope ini tidak sedang menerima penawaran.</p>
        </section>
      `;
    }
  }

  function renderOfferForm() {
    return `
      <section class="detail-section">
        <h2 class="accent">Ajukan Penawaran</h2>

        <form class="offer-form" id="offerForm">
          <div>
            <label for="offerMessage">Pesan penawaran</label>
            <textarea
              id="offerMessage"
              maxlength="3000"
              required
              placeholder="Jelaskan kemampuan, pengalaman, atau rencana produksi..."
            ></textarea>
          </div>

          <fieldset class="job-group">
            <legend>PILIH PEKERJAAN YANG SANGGUP DIKERJAKAN</legend>
            <div class="job-options">
              ${JOB_DESKS.map(job => `
                <label class="job-option">
                  <input
                    type="checkbox"
                    name="offerJobDesk"
                    value="${esc(job)}"
                  >
                  ${esc(job)}
                </label>
              `).join("")}
            </div>
          </fieldset>

          <button class="submit-offer" type="submit">
            Kirim Penawaran
          </button>

          <div class="offer-status" id="offerStatus"></div>
        </form>
      </section>
    `;
  }

  function bindOfferForm(scope) {
    const form = document.getElementById("offerForm");
    const button = form.querySelector("button");
    const status = document.getElementById("offerStatus");

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const message = document.getElementById("offerMessage").value.trim();

      const jobDesks = Array.from(
        form.querySelectorAll('input[name="offerJobDesk"]:checked')
      ).map(input => input.value);

      if (!message) {
        status.textContent = "Pesan penawaran wajib diisi.";
        return;
      }

      if (!jobDesks.length) {
        status.textContent = "Pilih minimal satu jenis pekerjaan.";
        return;
      }

      button.disabled = true;
      button.textContent = "Mengirim...";
      status.textContent = "";

      const { data: authData } = await db.auth.getUser();

      if (!authData.user) {
        window.location.replace("index.html");
        return;
      }

      const { error } = await db
        .from("scope_comments")
        .insert({
          scope_id: scope.id,
          commenter_id: authData.user.id,
          message,
          job_desks: jobDesks
        });

      if (error) {
        status.textContent = "Gagal mengirim: " + error.message;
        button.disabled = false;
        button.textContent = "Kirim Penawaran";
        return;
      }

      status.textContent = "Penawaran berhasil dikirim.";
      form.reset();
      button.disabled = false;
      button.textContent = "Kirim Penawaran";

      await loadOffers(
        scope,
        authData.user,
        false,
        true
      );
    });
  }


  async function loadOffers(scope, user, isOwner, isPublished) {
    const list = document.getElementById("offerList");

    let query = db
      .from("scope_comments")
      .select(`
        id,
        commenter_id,
        message,
        job_desks,
        created_at,
        commenter:profiles!scope_comments_commenter_id_fkey(full_name)
      `)
      .eq("scope_id", scope.id)
      .order("created_at", { ascending: false });

    if (!isOwner) {
      query = query.eq("commenter_id", user.id);
    }

    const { data: offers, error } = await query;

    if (error) {
      list.innerHTML =
        '<div class="empty-note">Penawaran gagal dimuat.</div>';
      return;
    }

    if (!offers || !offers.length) {
      list.innerHTML = `
        <div class="empty-note">
          ${isOwner
            ? "Belum ada penawaran masuk."
            : "Kamu belum mengajukan penawaran."}
        </div>
      `;
      return;
    }

    const dealByOffer = new Map();

    if (isOwner) {
      const { data: deals, error: dealError } = await db
        .from("deals")
        .select("id, scope_comment_id")
        .eq("scope_id", scope.id);

      if (dealError) {
        list.innerHTML =
          '<div class="empty-note">Deal gagal dimuat: ' +
          esc(dealError.message) + '</div>';
        return;
      }

      (deals || []).forEach(deal => {
        dealByOffer.set(deal.scope_comment_id, deal.id);
      });
    }

    list.innerHTML = offers.map(offer => {
      const name = isOwner
        ? (offer.commenter?.full_name || "Pengguna")
        : "Penawaran kamu";

      const time = new Date(offer.created_at).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short"
      });

      const existingDealId = dealByOffer.get(offer.id);

      const dealButton = isOwner
        ? existingDealId
          ? `
            <a class="submit-offer"
               href="deal-room.html?id=${encodeURIComponent(existingDealId)}">
              Buka Room Diskusi
            </a>
          `
          : `
            <button
              class="submit-offer start-deal"
              type="button"
              data-offer-id="${esc(offer.id)}">
              Lanjut Diskusi
            </button>
            <div class="deal-status" id="dealStatus-${esc(offer.id)}"></div>
          `
        : "";

      return `
        <article class="offer-item">
          <div class="offer-head">
            <strong>${esc(name)}</strong>
            <time>${esc(time)}</time>
          </div>
          <p>${esc(offer.message)}</p>
          ${chips(offer.job_desks)}
          ${dealButton}
        </article>
      `;
    }).join("");

    if (isOwner) {
      list.querySelectorAll(".start-deal").forEach(button => {
        button.addEventListener("click", async () => {
          await startDeal(scope, button.dataset.offerId, button);
        });
      });
    }
  }

  async function startDeal(scope, offerId, button) {
    const status = document.getElementById("dealStatus-" + offerId);

    button.disabled = true;
    button.textContent = "Membuat Deal...";

    const { data: authData, error: authError } = await db.auth.getUser();

    if (authError || !authData.user) {
      status.textContent = "Sesi login tidak ditemukan.";
      button.disabled = false;
      button.textContent = "Lanjut Diskusi";
      return;
    }

    const { data: offer, error: offerError } = await db
      .from("scope_comments")
      .select("id, commenter_id")
      .eq("id", offerId)
      .eq("scope_id", scope.id)
      .single();

    if (offerError || !offer) {
      status.textContent = "Penawaran tidak ditemukan.";
      button.disabled = false;
      button.textContent = "Lanjut Diskusi";
      return;
    }

    const { error: dealError } = await db
      .from("deals")
      .insert({
        scope_id: scope.id,
        scope_comment_id: offer.id,
        owner_id: authData.user.id,
        worker_id: offer.commenter_id,
        status: "discussion"
      });

    if (dealError) {
      status.textContent = dealError.code === "23505"
        ? "Deal untuk penawaran ini sudah pernah dibuat."
        : "Gagal membuat Deal: " + dealError.message;

      button.disabled = false;
      button.textContent = "Lanjut Diskusi";
      return;
    }

    status.textContent = "Deal berhasil dibuat!";
    await loadOffers(scope, authData.user, true, true);
  }

  init().catch(error => {
    console.error("Scope detail error:", error);
    root.innerHTML = '<div class="empty-note">Terjadi kesalahan saat memuat halaman.</div>';
  });
})();
