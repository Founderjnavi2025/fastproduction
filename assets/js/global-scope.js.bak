(() => {
  const message = document.getElementById("scopeMessage");
  const container = document.getElementById("scopeList");

  const selectFields = `
    id, creator_id, title, description, target_qty,
    price_total, deadline, status, job_desks, created_at
  `;

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

    function scopeCard(scope, published, ownerName) {
      const card = element("article", undefined, "scope-card");
      const title = element("h3", scope.title);
      const description = element("p", scope.description || "Tidak ada deskripsi.");
      const details = element(
        "p",
        `${scope.target_qty} pcs · Rp${Number(scope.price_total || 0).toLocaleString("id-ID")}`
      );

      card.append(title, description, details);

      if (scope.deadline) {
        card.append(element("p", `Deadline: ${scope.deadline}`));
      }

      if (scope.job_desks?.length) {
        card.append(element("p", `Pekerjaan: ${scope.job_desks.join(", ")}`));
      }

      if (ownerName) {
        card.append(element("p", `Pemilik: ${ownerName}`));
      }

      return card;
    }

    async function loadScopes() {
      message.textContent = "Memuat Scope...";
      container.replaceChildren();

      const ownSection = element("section");
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

      (ownScopes || []).forEach(scope => {
        const card = scopeCard(scope);
        const isPublished = publishedIds.has(scope.id);

        card.append(
          button(
            isPublished ? "Tarik Publikasi" : "Terbitkan",
            () => togglePublication(scope.id, isPublished)
          )
        );

        ownSection.append(card);
      });

      container.append(ownSection);

      const globalSection = element("section");
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
        globalSection.append(element("p", "Belum ada Scope yang diterbitkan."));
      }

      visibleFeed.forEach(item => {
        const scope = item.scope;
        const ownerName = scope.creator?.full_name || "Pengguna FastProduction";
        const card = scopeCard(scope, true, ownerName);

        if (scope.creator_id !== user.id) {
          card.append(
            element("p", scope.creator?.address || "Alamat belum tersedia.")
          );
        }

        globalSection.append(card);
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
        message.textContent = "Gagal memproses publikasi: " + error.message;
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
