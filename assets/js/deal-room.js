(() => {
  const root = document.getElementById("roomRoot");
  const params = new URLSearchParams(window.location.search);
  const dealId = params.get("id");

  const statusNames = {
    discussion: "Diskusi",
    survey_proposed: "Survey Diusulkan",
    scheduled: "Survey Terjadwal",
    surveyed: "Survey Selesai",
    monitoring: "Produksi Berjalan",
    ready_to_ship: "Siap Dikirim",
    shipped: "Dalam Pengiriman",
    paid: "Pembayaran Dikonfirmasi",
    closed: "Deal Ditutup"
  };

  const eventNames = {
    deal_created: "Deal dibuat",
    status_changed: "Status Deal berubah"
  };

  let currentDeal = null;
  let currentUser = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function dateText(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function money(value) {
    if (value === null || value === undefined || value === "") return "Belum ditentukan";
    return "Rp" + Number(value).toLocaleString("id-ID");
  }

  function errorBox(message) {
    root.innerHTML = `<div class="room-empty room-error">${esc(message)}</div>`;
  }

  async function loadDeal() {
    const { data, error } = await db
      .from("deals")
      .select(`
        *,
        owner:profiles!deals_owner_id_fkey(full_name),
        worker:profiles!deals_worker_id_fkey(full_name),
        scope:scopes!deals_scope_id_fkey(title, description, target_qty, deadline, price_total)
      `)
      .eq("id", dealId)
      .single();

    if (error) throw error;
    currentDeal = data;
  }

  async function loadTimeline() {
    const { data, error } = await db
      .from("deal_events")
      .select("id, actor_id, kind, payload, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!data || !data.length) {
      return '<div class="room-empty">Belum ada aktivitas.</div>';
    }

    return `<div class="room-timeline">${data.map(event => {
      const payload = event.payload || {};
      let detail = "";

      if (event.kind === "status_changed") {
        detail = `${statusNames[payload.from] || payload.from || "-"} → ${statusNames[payload.to] || payload.to || "-"}`;
      }

      return `
        <div class="timeline-item">
          <strong>${esc(eventNames[event.kind] || event.kind)}</strong>
          <small>${esc(dateText(event.created_at))}</small>
          ${detail ? `<p>${esc(detail)}</p>` : ""}
        </div>
      `;
    }).join("")}</div>`;
  }

  async function loadMessages() {
    const { data, error } = await db
      .from("deal_messages")
      .select(`
        id, sender_id, message, created_at,
        sender:profiles!deal_messages_sender_id_fkey(full_name)
      `)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!data || !data.length) {
      return '<div class="room-empty">Belum ada percakapan. Mulai diskusi di sini.</div>';
    }

    return `<div class="room-messages">${data.map(item => {
      const mine = item.sender_id === currentUser.id;
      return `
        <article class="room-message ${mine ? "mine" : ""}">
          <div class="message-head">
            <strong>${esc(item.sender?.full_name || "Pengguna")}${mine ? " · Kamu" : ""}</strong>
            <small>${esc(dateText(item.created_at))}</small>
          </div>
          <p>${esc(item.message)}</p>
        </article>
      `;
    }).join("")}</div>`;
  }

  async function sendMessage(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const input = form.querySelector("textarea");
    const button = form.querySelector("button");
    const message = input.value.trim();

    if (!message || message.length > 3000) return;

    button.disabled = true;

    const { error } = await db
      .from("deal_messages")
      .insert({
        deal_id: dealId,
        sender_id: currentUser.id,
        message
      });

    if (error) {
      alert("Pesan gagal dikirim: " + error.message);
      button.disabled = false;
      return;
    }

    input.value = "";
    await renderRoom();
  }

  async function renderRoom() {
    const deal = currentDeal;
    const isOwner = deal.owner_id === currentUser.id;
    const isWorker = deal.worker_id === currentUser.id;

    const [timeline, messages] = await Promise.all([
      loadTimeline(),
      loadMessages()
    ]);

    root.innerHTML = `
      <section class="room-panel">
        <div class="room-kicker">FastProduction / Room Diskusi</div>
        <h1 class="room-title">${esc(deal.scope?.title || "Deal")}</h1>
        <div class="room-meta">
          Deal ID: ${esc(deal.id)}<br>
          Dibuat: ${esc(dateText(deal.created_at))}
        </div>
        <span class="room-status">${esc(statusNames[deal.status] || deal.status)}</span>
      </section>

      <section class="room-panel">
        <h2>Ringkasan Produksi</h2>
        <div class="room-grid">
          <div class="room-person">
            <small>PEMILIK SCOPE</small>
            <strong>${esc(deal.owner?.full_name || "Pengguna")}</strong>
          </div>
          <div class="room-person">
            <small>PELAKSANA</small>
            <strong>${esc(deal.worker?.full_name || "Pengguna")}</strong>
          </div>
          <div class="room-person">
            <small>TARGET PRODUKSI</small>
            <strong>${esc(deal.scope?.target_qty ?? "-")} pcs</strong>
          </div>
          <div class="room-person">
            <small>HARGA KESEPAKATAN</small>
            <strong>${esc(money(deal.agreed_amount ?? deal.scope?.price_total))}</strong>
          </div>
        </div>
        <p class="room-meta">${esc(deal.scope?.description || "")}</p>
      </section>

      <section class="room-panel">
        <h2>Timeline Aktivitas</h2>
        ${timeline}
      </section>

      <section class="room-panel">
        <h2>Ruang Percakapan</h2>
        ${messages}
        <form id="messageForm" class="room-form">
          <textarea name="message" maxlength="3000" required placeholder="Tulis pesan untuk ${esc(isOwner ? "pelaksana" : "pemilik Scope")}..."></textarea>
          <button class="room-button" type="submit">Kirim Pesan</button>
        </form>
      </section>

      <section class="room-panel">
        <h2>Panel Deal</h2>
        <div class="room-meta">
          ${isOwner ? "Kamu adalah pemilik Scope." : isWorker ? "Kamu adalah pelaksana pekerjaan." : "Akun ini bukan peserta Deal."}
          <br>Status saat ini: ${esc(statusNames[deal.status] || deal.status)}
        </div>
        <div class="room-empty" style="margin-top:12px">
          Panel tindakan proses produksi akan diaktifkan pada tahap berikutnya.
        </div>
      </section>
    `;

    document.getElementById("messageForm").addEventListener("submit", sendMessage);
  }

  async function init() {
    if (!dealId) {
      errorBox("ID Deal tidak ditemukan pada alamat halaman.");
      return;
    }

    const { data: authData, error: authError } = await db.auth.getUser();

    if (authError || !authData.user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = authData.user;

    await loadDeal();

    if (
      currentDeal.owner_id !== currentUser.id &&
      currentDeal.worker_id !== currentUser.id
    ) {
      errorBox("Kamu bukan peserta Deal ini.");
      return;
    }

    await renderRoom();
  }

  init().catch(error => {
    console.error("Room Diskusi error:", error);
    errorBox("Room Diskusi gagal dimuat: " + (error.message || "Kesalahan tidak diketahui"));
  });
})();
