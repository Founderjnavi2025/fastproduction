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
      const link = document.createElement("a");
      link.className = "scope-card-link";
      link.href = "scope-detail.html?id=" + encodeURIComponent(scope.id);

      const heading = el("div", undefined, "scope-card-heading");
      heading.append(el("h3", scope.title));

      if (isPublished) {
        heading.append(el("span", "OPEN", "scope-status"));
      }

      const owner = el(
        "p",
        isOwner
          ? "Scope milik saya"
          : `Pemilik: ${ownerName || "Pengguna FastProduction"}`,
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
        scope.deadline
          ? `Deadline: ${scope.deadline}`
          : "Deadline belum ditentukan",
        "scope-deadline"
      );

      const jobs = el(
        "p",
        scope.job_desks?.length
          ? scope.job_desks.join(" · ")
          : "Jenis pekerjaan belum ditentukan",
        "scope-jobs-summary"
      );

      const cta = el(
        "span",
        "Lihat detail & penawaran →",
        "card-cta"
      );

      link.append(heading, owner, stats, deadline, jobs, cta);

      const wrapper = el("article", undefined, "scope-card-wrap");

      if (isOwner) {
        const publishBtn = btn(
          isPublished ? "Tarik Publikasi" : "Terbitkan ke Global Scope",
          () => togglePublication(scope.id, isPublished),
          "publish-button"
        );

        wrapper.append(link, publishBtn);
      } else {
        wrapper.append(link);
      }

      return wrapper;
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
        ownSection.append(
          el("p", "Belum ada Scope berstatus open.")
        );
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
              full_name
            )
          )
        `)
        .order("published_at", { ascending: false });

      if (feedError) throw feedError;

      const visibleFeed = (feed || []).filter(
        item =>
          item.scope &&
          item.scope.status === "open"
      );

      if (!visibleFeed.length) {
        globalSection.append(
          el("p", "Belum ada Scope yang diterbitkan.")
        );
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

      const buttons = container.querySelectorAll(".publish-button");
      buttons.forEach(button => {
        button.disabled = true;
      });

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

        buttons.forEach(button => {
          button.disabled = false;
        });
      }
    }

    try {
      await loadScopes();
    } catch (error) {
      console.error("Global Scope:", error);
      message.textContent =
        "Gagal memuat Scope: " + error.message;
    }
  }

  init();
})();
