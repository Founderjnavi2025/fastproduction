document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;
  const list = document.getElementById("jobList");
  const message = document.getElementById("jobMessage");

  if (!db) {
    location.href = "login.html";
    return;
  }

  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData.user) {
    location.href = "login.html";
    return;
  }

  function addText(parent, tag, text, className = "") {
    const el = document.createElement(tag);
    el.textContent = text || "";
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  }

  function categoryLabel(name) {
    return {
      "Lockstitch": "Jahit",
      "Overlock / Safety Stitch": "Obras",
      "Coverstitch / Interlock": "Kam / Coverstitch",
      "Double Chainstitch": "Jahit Rantai",
      "Buttonhole": "Lubang Kancing",
      "Button Sewing": "Pasang Kancing",
      "Bartack": "Bartack",
      "Pattern Sewing": "Jahit Pola"
    }[name] || name;
  }

  const { data, error } = await db
    .from("machine_job_ads")
    .select(`
      id,
      owner_id,
      published_at,
      expires_at,
      machine:user_machines!machine_job_ads_machine_id_fkey (
        machine_name,
        category,
        brand,
        model,
        quantity,
        machine_condition,
        notes
      ),
      owner:profiles!machine_job_ads_owner_id_fkey (
        full_name,
        address
      )
    `)
    .eq("status", "published")
    .gt("expires_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) {
    message.textContent = "Gagal memuat lowongan: " + error.message;
    return;
  }

  const ads = (data || []).filter(ad => ad.machine && ad.owner);

  if (!ads.length) {
    message.textContent = "";
    list.innerHTML =
      '<div class="job-empty">Belum ada lowongan operator aktif.</div>';
    return;
  }

  message.textContent = `${ads.length} lowongan operator aktif.`;

  ads.forEach(ad => {
    const machine = ad.machine;
    const owner = ad.owner;

    const card = document.createElement("article");
    card.className = "job-card";

    addText(card, "h2", machine.machine_name);

    const meta = document.createElement("div");
    meta.className = "job-meta";

    [
      categoryLabel(machine.category),
      `Jumlah mesin: ${machine.quantity}`,
      `Kondisi: ${machine.machine_condition}`
    ].forEach(value => addText(meta, "span", value, "job-tag"));

    card.appendChild(meta);

    addText(card, "p", `Merek: ${machine.brand || "-"} · Model: ${machine.model || "-"}`);
    addText(card, "p", machine.notes || "Tidak ada catatan mesin.");

    addText(card, "p", `Pemilik: ${owner.full_name || "Pengguna FastProduction"}`, "job-owner");

    if (owner.address) {
      addText(card, "p", `Lokasi: ${owner.address}`, "job-owner");
    }

    const profileLink = document.createElement("a");
    profileLink.href = `profile.html?id=${encodeURIComponent(ad.owner_id)}`;
    profileLink.textContent = "Lihat profil pemilik";
    card.appendChild(profileLink);

    const expiry = new Date(ad.expires_at);
    addText(
      card,
      "p",
      `Berlaku sampai: ${expiry.toLocaleString("id-ID")}`,
      "job-expiry"
    );

    list.appendChild(card);
  });
});
