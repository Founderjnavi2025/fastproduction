(() => {
  const message = document.getElementById("scopeMessage");
  const container = document.getElementById("scopeList");

  const selectFields = `
    id, creator_id, title, description, target_qty,
    price_total, deadline, status, job_desks, created_at
  `;

  const jobGroups = {
    "PERSIAPAN BAHAN": [
      "Pembuatan pola",
      "Marker",
      "Potong bahan",
      "Fusing"
    ],
    "DEKORASI": [
      "Sablon",
      "Bordir",
      "Printing"
    ],
    "JAHIT & PERAKITAN": [
      "Jahit",
      "Obras",
      "Kam / Overdeck",
      "Jahit rantai",
      "Pasang resleting",
      "Lubang kancing",
      "Pasang kancing",
      "Pasang label"
    ],
    "FINISHING & PENGEMASAN": [
      "Trimming benang",
      "Washing",
      "Setrika / Steam",
      "Quality Control",
      "Lipat barang",
      "Packaging"
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

    function element(tag, text, className) {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    }

    function button(text, action) {
      const node = element("button", text);
      node.type = "button";
      node.addEventListener("click", action);
      return node;
    }

    function scopeCard(scope, ownerName) {
      const card = element("article", undefined, "scope-card");

      card.append(
        element("h3", scope.title),
        element("p", scope.description || "Tidak ada deskripsi."),
        element(
          "p",
          `${scope.target_qty} pcs · Rp${Number(scope.price_total || 0).toLocaleString("id-ID")}`
        )
      );

      if (scope.deadline) {
        card.append(element("p", `Deadline: ${scope.deadline}`));
      }

      if (scope.job_desks?.length) {
        card.append(
          element("p", `Pekerjaan: ${scope.job_desks.join(", ")}`)
        );
      }

      if (ownerName) {
        card.append(element("p", `Pemilik: ${ownerName}`));
      }

      return card;
    }

    function createOfferForm(scopeId) {
      const form = element("form", undefined, "offer-form");

      form.append(element("h4", "Ajukan Penawaran"));
      form.append(
        element("p", "Ceritakan bagaimana kamu bisa mengerjakan produksi ini.")
      );

      const textarea = element("textarea");
      textarea.name = "message";
      textarea.placeholder = "Tuliskan penawaran dan pengalamanmu...";
      textarea.required = true;
      textarea.minLength = 5;
      textarea.maxLength = 3000;
      textarea.rows = 4;

      form.append(textarea);
      form.append(element("h4", "Pilih pekerjaan yang kamu tawarkan"));

      Object.entries(jobGroups).forEach(([groupName, jobs]) => {
        const group = element("fieldset", undefined, "job-group");
        group.append(element("legend", groupName));

        jobs.forEach(job => {
          const label = element("label", undefined, "job-option");
          const checkbox = element("input");
          checkbox.type = "checkbox";
          checkbox.name = "jobDesk";
          checkbox.value = job;

          label.append(checkbox, document.createTextNode(job));
          group.append(label);
        });

        form.append(group);
      });

      const status = element("p", "", "offer-status");
      const submit = element("button", "Kirim Penawaran");
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
          await loadOffers(scopeId, offersContainer);
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
      target.append(element("h4", "Penawaran Pekerja"));

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

      if (error) throw error;

      if (!offers?.length) {
        target.append(element("p", "Belum ada penawaran."));
        return;
      }

      offers.forEach(offer => {
        const item = element("article", undefined, "offer-item");
        const name = offer.commenter?.full_name || "Pengguna FastProduction";

        item.append(
          element("strong", name),
          element("p", offer.message),
          element(
            "p",
            `Pekerjaan ditawarkan: ${(offer.job_desks || []).join(", ") || "-"}`
          )
        );

        if (offer.commenter?.bio) {
          item.append(element("p", `Profil: ${offer.commenter.bio}`));
        }

        item.append(
          element(
            "small",
            new Date(offer.created_at).toLocaleString("id-ID")
          )
        );

        target.append(item);
      });
    }

    async function loadScopes() {
      message.textContent = "Memuat Scope...";
      container.replaceChildren();

      const ownSection = element("section", undefined, "global-section");
      ownSection.append(element("h2", "Scope Milik Saya"));

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
        ownSection.append(element("p", "Belum ada Scope berstatus open."));
      }

      for (const scope of ownScopes || []) {
        const card = scopeCard(scope);
        const isPublished = publishedIds.has(scope.id);

        card.append(
          button(
            isPublished ? "Tarik Publikasi" : "Terbitkan",
            () => togglePublication(scope.id, isPublished)
          )
        );

        const offersContainer = element("div", undefined, "offers-container");
        card.append(offersContainer);
        ownSection.append(card);

        await loadOffers(scope.id, offersContainer);
      }

      container.append(ownSection);

      const globalSection = element("section", undefined, "global-section");
      globalSection.append(element("h2", "Global Scope"));

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
        globalSection.append(
          element("p", "Belum ada Scope yang diterbitkan.")
        );
      }

      for (const item of visibleFeed) {
        const scope = item.scope;
        const ownerName =
          scope.creator?.full_name || "Pengguna FastProduction";

        const card = scopeCard(scope, ownerName);

        if (scope.creator_id !== user.id) {
          card.append(
            element("p", scope.creator?.address || "Alamat belum tersedia.")
          );

          card.append(createOfferForm(scope.id));
        }

        const offersContainer = element("div", undefined, "offers-container");
        card.append(offersContainer);
        globalSection.append(card);

        await loadOffers(scope.id, offersContainer);
      }

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
