(() => {
  const message = document.getElementById("scopeMessage");
  const container = document.getElementById("scopeList");

  const selectFields = `
    id, creator_id, title, description, target_qty,
    price_total, deadline, status, job_desks, created_at
  `;

  const jobGroups = {
    "PERSIAPAN BAHAN": [
      "Pembuatan pola", "Marker", "Potong bahan", "Fusing"
    ],
    "DEKORASI": [
      "Sablon", "Bordir", "Printing"
    ],
    "JAHIT & PERAKITAN": [
      "Jahit", "Obras", "Kam / Overdeck", "Jahit rantai",
      "Pasang resleting", "Lubang kancing", "Pasang kancing",
      "Pasang label"
    ],
    "FINISHING & PENGEMASAN": [
      "Trimming benang", "Washing", "Setrika / Steam",
      "Quality Control", "Lipat barang", "Packaging"
    ]
  };

  async function init() {
    if (!window.db) {
      message.textContent = "Koneksi Supabase tidak tersedia.";
      return;
    }

    const { data, error } = await window.db.auth.getUser();

    if (error || !data.user) {
      window.location.replace("index.html");
      return;
    }

    const user = data.user;

    function el(tag, text, className) {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    }

    function btn(text, action, className = "") {
      const node = el("button", text, className);
      node.type = "button";
      node.addEventListener("click", action);
      return node;
    }

    function formatPrice(value) {
      return "Rp" + Number(value || 0).toLocaleString("id-ID");
    }

    function createCatalogCard(scope, ownerName, isOwner, isPublished) {
      const card = el("article", undefined, "scope-card catalog-card");

      const heading = el("div", undefined, "scope-card-heading");
      heading.append(el("h3", scope.title));

      if (isPublished) {
        heading.append(el("span", "OPEN", "scope-status"));
      }

      const owner = el(
        "p",
        isOwner ? "Scope milik saya" : `Pemilik: ${ownerName || "Pengguna FastProduction"}`,
        "scope-owner"
      );

      const stats = el("div", undefined, "scope-stats");

      const qty = el("div", undefined, "scope-stat");
      qty.append(
        el("strong", Number(scope.target_qty).toLocaleString("id-ID")),
        el("small", "Target pcs")
      );

      const price = el("div", undefined, "scope-stat");
      price.append(
        el("strong", formatPrice(scope.price_total)),
        el("small", "Harga produksi")
      );

      stats.append(qty, price);

      const deadline = el(
        "p",
        scope.deadline ? `Deadline: ${scope.deadline}` : "Deadline belum ditentukan",
        "scope-deadline"
      );

      const jobs = el(
        "p",
        scope.job_desks?.length
          ? scope.job_desks.join(" · ")
          : "Jenis pekerjaan belum ditentukan",
        "scope-jobs-summary"
      );

      const detailPanel = el("div", undefined, "scope-detail");
      detailPanel.hidden = true;

      const detailButton = btn("Lihat Detail", () => {
        detailPanel.hidden = !detailPanel.hidden;
        detailButton.textContent = detailPanel.hidden
          ? "Lihat Detail"
          : "Tutup Detail";

        if (!detailPanel.hidden && !detailPanel.dataset.loaded) {
          detailPanel.dataset.loaded = "true";
          loadDetails(scope, detailPanel, isOwner);
        }
      }, "detail-button");

      card.append(heading, owner, stats, deadline, jobs);

      if (isOwner) {
        card.append(
          btn(
            isPublished ? "Tarik Publikasi" : "Terbitkan ke Global Scope",
            () => togglePublication(scope.id, isPublished),
            "publish-button"
          )
        );
      }

      card.append(detailButton, detailPanel);

      return card;
    }

    async function loadDetails(scope, panel, isOwner) {
      panel.replaceChildren();

      panel.append(el("h4", "Detail Produksi"));
      panel.append(
        el("p", scope.description || "Tidak ada deskripsi tambahan.")
      );

      panel.append(
        el("p", `Target produksi: ${Number(scope.target_qty).toLocaleString("id-ID")} pcs`)
      );

      panel.append(el("p", `Harga total: ${formatPrice(scope.price_total)}`));

      if (scope.deadline) {
        panel.append(el("p", `Deadline: ${scope.deadline}`));
      }

      if (scope.job_desks?.length) {
        panel.append(
          el("p", `Pekerjaan: ${scope.job_desks.join(", ")}`)
        );
      }

      if (!isOwner) {
        const formArea = el("div", undefined, "offer-area");
        const offerButton = btn("Ajukan Penawaran", () => {
          form.hidden = !form.hidden;
          offerButton.textContent = form.hidden
            ? "Ajukan Penawaran"
            : "Tutup Form Penawaran";
        }, "offer-button");

        const form = createOfferForm(scope.id);
        form.hidden = true;

        panel.append(offerButton, form);
      }

      const offersContainer = el("div", undefined, "offers-container");
      panel.append(offersContainer);

      await loadOffers(scope.id, offersContainer);
    }

    function createOfferForm(scopeId) {
      const form = el("form", undefined, "offer-form");

      form.append(el("h4", "Penawaran Pekerjaan"));
      form.append(
        el("p", "Jelaskan kesanggupan dan pengalamanmu mengerjakan produksi ini.")
      );

      const textarea = el("textarea");
      textarea.name = "message";
      textarea.placeholder = "Contoh: Saya siap mengerjakan bagian obras sampai finishing...";
      textarea.required = true;
      textarea.minLength = 5;
      textarea.maxLength = 3000;
      textarea.rows = 4;

      form.append(textarea);
      form.append(el("h4", "Pekerjaan yang Saya Tawarkan"));

      Object.entries(jobGroups).forEach(([groupName, jobs]) => {
        const group = el("fieldset", undefined, "job-group");
        group.append(el("legend", groupName));

        const options = el("div", undefined, "job-options");

        jobs.forEach(job => {
          const label = el("label", undefined, "job-option");
          const checkbox = el("input");

          checkbox.type = "checkbox";
          checkbox.name = "jobDesk";
          checkbox.value = job;

          label.append(checkbox, document.createTextNode(job));
          options.append(label);
        });

        group.append(options);
        form.append(group);
      });

      const status = el("p", "", "offer-status");
      const submit = btn("Kirim Penawaran", () => {}, "submit-offer");
      submit.type = "submit";

      form.append(submit, status);

      form.addEventListener("submit", async event => {
        event.preventDefault();

        const description = textarea.value.trim();
        const jobDesks = Array.from(
          form.querySelectorAll('input[name="jobDesk"]:checked')
        ).map(input => input.value);

        if (description.length < 5) {
          status.textContent = "Deskripsi minimal 5 karakter.";
          return;
        }

        if (!jobDesks.length) {
          status.textContent = "Pilih minimal satu jenis pekerjaan.";
          return;
        }

        submit.disabled = true;
        status.textContent = "Mengirim penawaran...";

        try {
          const { error } = await window.db
            .from("scope_comments")
            .insert({
              scope_id: scopeId,
              commenter_id: user.id,
              message: description,
              job_desks: jobDesks
            });

          if (error) throw error;

          form.reset();
          status.textContent = "Penawaran berhasil dikirim.";

        } catch (error) {
          console.error("Penawaran:", error);
          status.textContent = "Gagal mengirim: " + error.message;
        } finally {
          submit.disabled = false;
        }
      });

      return form;
    }

    async function loadOffers(scopeId, target) {
      target.replaceChildren();
      target.append(el("h4", "Penawaran Masuk"));

      const { data: offers, error } = await window.db
        .from("scope_comments")
        .select(`
          id,
          message,
          job_desks,
          created_at,
          commenter:profiles!scope_comments_commenter_id_fkey (
            full_name,
            bio,
            avatar_url
          )
        `)
        .eq("scope_id", scopeId)
        .order("created_at", { ascending: false });

      if (error) {
        target.append(el("p", "Gagal memuat penawaran: " + error.message));
        return;
      }

      if (!offers?.length) {
        target.append(el("p", "Belum ada penawaran."));
        return;
      }

      offers.forEach(offer => {
        const item = el("article", undefined, "offer-item");

        item.append(
          el(
            "strong",
            offer.commenter?.full_name || "Pengguna FastProduction"
          ),
          el("p", offer.message),
          el(
            "p",
            `Pekerjaan: ${(offer.job_desks || []).join(", ")}`
          )
        );

        if (offer.commenter?.bio) {
          item.append(el("p", `Profil: ${offer.commenter.bio}`));
        }

        item.append(
          el(
            "small",
            new Date(offer.created_at).toLocaleString("id-ID")
          )
        );

        target.append(item);
      });
    }

    async function loadScopes() {
      message.textContent = "Memuat katalog...";
      container.replaceChildren();

      const ownSection = el("section", undefined, "global-section");
      ownSection.append(el("h2", "Scope Milik Saya"));

      const { data: ownScopes, error: ownError } = await window.db
        .from("scopes")
        .select(selectFields)
        .eq("creator_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (ownError) throw ownError;

      const { data: publications, error: pubError } = await window.db
        .from("scope_publications")
        .select("scope_id");

      if (pubError) throw pubError;

      const publishedIds = new Set(
        (publications || []).map(item => item.scope_id)
      );

      if (!ownScopes?.length) {
        ownSection.append(el("p", "Belum ada Scope berstatus open."));
      }

      (ownScopes || []).forEach(scope => {
        ownSection.append(
          createCatalogCard(
            scope,
            null,
            true,
            publishedIds.has(scope.id)
          )
        );
      });

      container.append(ownSection);

      const globalSection = el("section", undefined, "global-section");
      globalSection.append(el("h2", "Global Scope"));

      const { data: feed, error: feedError } = await window.db
        .from("scope_publications")
        .select(`
          scope_id,
          published_at,
          scope:scopes!scope_publications_scope_id_fkey (
            ${selectFields},
            creator:profiles!scopes_creator_id_fkey (
              full_name,
              address
            )
          )
        `)
        .order("published_at", { ascending: false });

      if (feedError) throw feedError;

      const visibleFeed = (feed || []).filter(
        item => item.scope && item.scope.status === "open"
      );

      if (!visibleFeed.length) {
        globalSection.append(el("p", "Belum ada Scope yang diterbitkan."));
      }

      visibleFeed.forEach(item => {
        const scope = item.scope;
        const isOwner = scope.creator_id === user.id;

        globalSection.append(
          createCatalogCard(
            scope,
            scope.creator?.full_name,
            isOwner,
            true
          )
        );
      });

      container.append(globalSection);
      message.textContent = "Global Scope berhasil dimuat.";
    }

    async function togglePublication(scopeId, isPublished) {
      message.textContent = "Memproses publikasi...";

      try {
        let result;

        if (isPublished) {
          result = await window.db
            .from("scope_publications")
            .delete()
            .eq("scope_id", scopeId);
        } else {
          result = await window.db
            .from("scope_publications")
            .insert({ scope_id: scopeId });
        }

        if (result.error) throw result.error;

        await loadScopes();

      } catch (error) {
        console.error("Global Scope:", error);
        message.textContent =
          "Gagal memproses publikasi: " + error.message;
      }
    }

    try {
      await loadScopes();
    } catch (error) {
      console.error("Global Scope:", error);
      message.textContent = "Gagal memuat Scope: " + error.message;
    }
  }

  init();
})();
