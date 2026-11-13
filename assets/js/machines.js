document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;

  if (!db) {
    location.href = "login.html";
    return;
  }

  const $ = id => document.getElementById(id);

  const message = $("message");
  const list = $("machineList");
  const form = $("machineForm");
  const saveButton = $("saveButton");

  const fields = {
    machine_name: $("machineName"),
    category: $("category"),
    brand: $("brand"),
    model: $("model"),
    quantity: $("quantity"),
    machine_condition: $("machineCondition"),
    notes: $("notes")
  };

  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData.user) {
    location.href = "login.html";
    return;
  }

  const user = authData.user;

  let brands = [];
  let categories = [];
  let models = [];
  let editingMachine = null;

  function option(select, value, label) {
    const el = document.createElement("option");
    el.value = value;
    el.textContent = label;
    select.appendChild(el);
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

  function setPlaceholder(select, text) {
    select.replaceChildren();
    option(select, "", text);
  }

  function conditionLabel(value) {
    return {
      baik: "Baik",
      perlu_perbaikan: "Perlu Perbaikan",
      rusak: "Rusak"
    }[value] || value;
  }

  async function loadCatalog() {
    message.textContent = "Memuat katalog mesin...";

    const results = await Promise.all([
      db.from("machine_brands")
        .select("id,name")
        .order("name"),

      db.from("machine_categories")
        .select("id,name")
        .order("name"),

      db.from("machine_models")
        .select("id,brand_id,category_id,model_name,machine_type,model_level,source_url,verification_status")
        .order("model_name")
    ]);

    const errors = results.filter(result => result.error);

    if (errors.length) {
      message.textContent =
        "Gagal memuat katalog: " +
        errors.map(result => result.error.message).join(" | ");
      return false;
    }

    brands = results[0].data || [];
    categories = results[1].data || [];
    models = results[2].data || [];

    setPlaceholder(fields.brand, "Pilih merek");

    brands.forEach(brand => {
      option(fields.brand, brand.id, brand.name);
    });

    setPlaceholder(fields.category, "Pilih merek dahulu");
    setPlaceholder(fields.model, "Pilih kategori dahulu");

    fields.category.disabled = true;
    fields.model.disabled = true;

    message.textContent = "";
    return true;
  }

  function loadCategories(brandId, selectedCategory = "") {
    setPlaceholder(fields.category, "Pilih kategori");

    const brandModels = models.filter(
      item => String(item.brand_id) === String(brandId)
    );

    const categoryIds = [...new Set(
      brandModels.map(item => String(item.category_id))
    )];

    categories
      .filter(category => categoryIds.includes(String(category.id)))
      .forEach(category => {
        option(fields.category, category.id, categoryLabel(category.name));
      });

    fields.category.disabled = !categoryIds.length;
    setPlaceholder(fields.model, "Pilih kategori dahulu");
    fields.model.disabled = true;

    if (selectedCategory && categoryIds.includes(String(selectedCategory))) {
      fields.category.value = String(selectedCategory);
      loadModels(brandId, selectedCategory);
    }
  }

  function loadModels(brandId, categoryId, selectedModel = "") {
    setPlaceholder(fields.model, "Pilih model");

    const filtered = models.filter(item =>
      String(item.brand_id) === String(brandId) &&
      String(item.category_id) === String(categoryId)
    );

    filtered.forEach(item => {
      const label = item.model_level === "model"
        ? item.model_name
        : `${item.model_name} (${item.model_level})`;

      option(fields.model, item.id, label);
    });

    fields.model.disabled = !filtered.length;

    if (selectedModel) {
      fields.model.value = String(selectedModel);
    }

    updateMachineName();
  }

  function updateMachineName() {
    const selected = models.find(
      item => String(item.id) === String(fields.model.value)
    );

    const brand = brands.find(
      item => String(item.id) === String(fields.brand.value)
    );

    if (!selected || !brand) {
      fields.machine_name.value = "";
      $("catalogInfo").textContent =
        "Pilih merek, kategori, dan model dari katalog.";
      return;
    }

    fields.machine_name.value =
      `${brand.name} ${selected.model_name}`;

    $("catalogInfo").textContent =
      `${selected.machine_type} · ${selected.model_level} · ${selected.verification_status}`;
  }

  fields.brand.addEventListener("change", () => {
    loadCategories(fields.brand.value);
  });

  fields.category.addEventListener("change", () => {
    loadModels(fields.brand.value, fields.category.value);
  });

  fields.model.addEventListener("change", updateMachineName);

  function resetForm() {
    form.reset();

    $("machineId").value = "";
    fields.quantity.value = 1;

    editingMachine = null;

    setPlaceholder(fields.brand, "Pilih merek");
    brands.forEach(brand =>
      option(fields.brand, brand.id, brand.name)
    );

    setPlaceholder(fields.category, "Pilih merek dahulu");
    setPlaceholder(fields.model, "Pilih kategori dahulu");

    fields.category.disabled = true;
    fields.model.disabled = true;

    fields.machine_name.value = "";
    $("catalogInfo").textContent =
      "Pilih merek, kategori, dan model dari katalog.";

    $("formTitle").textContent = "Tambah Mesin";
    saveButton.textContent = "Simpan Mesin";
    $("cancelEdit").hidden = true;
  }

  async function loadMachines() {
    list.innerHTML = "<p>Memuat data mesin...</p>";

    const { data, error } = await db
      .from("user_machines")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = error.message;
      return;
    }

    $("machineCount").textContent =
      `${data.length} jenis data mesin terdaftar`;

    if (!data.length) {
      list.innerHTML =
        '<div class="empty">Belum ada mesin terdaftar.</div>';
      return;
    }

    list.replaceChildren();

    data.forEach(machine => {
      const card = document.createElement("article");
      card.className = "machine-card";

      const title = document.createElement("h3");
      title.textContent = machine.machine_name;

      const meta = document.createElement("div");
      meta.className = "machine-meta";

      [
        categoryLabel(machine.category),
        `Jumlah: ${machine.quantity}`,
        conditionLabel(machine.machine_condition)
      ].forEach(value => {
        const tag = document.createElement("span");
        tag.className = "machine-tag";
        tag.textContent = value;
        meta.appendChild(tag);
      });

      const detail = document.createElement("p");
      detail.textContent =
        `Merek: ${machine.brand || "-"} · Model: ${machine.model || "-"}`;

      const notes = document.createElement("p");
      notes.textContent = machine.notes || "Tidak ada catatan.";

      const actions = document.createElement("div");
      actions.className = "machine-actions";

      const editButton = document.createElement("button");
      editButton.className = "secondary";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => editMachine(machine));

      const deleteButton = document.createElement("button");
      deleteButton.className = "danger";
      deleteButton.textContent = "Hapus";
      deleteButton.addEventListener("click", () => deleteMachine(machine));

      actions.append(editButton, deleteButton);
      card.append(title, meta, detail, notes, actions);
      list.appendChild(card);
    });
  }

  function editMachine(machine) {
    editingMachine = machine;

    $("machineId").value = machine.id;

    const brand = brands.find(
      item => item.name === machine.brand
    );

    const category = categories.find(
      item => item.name === machine.category
    );

    const selectedModel = models.find(item =>
      item.model_name === machine.model &&
      (!brand || String(item.brand_id) === String(brand.id)) &&
      (!category || String(item.category_id) === String(category.id))
    );

    if (!brand || !category || !selectedModel) {
      message.textContent =
        "Model lama tidak ditemukan di katalog. Data inventaris belum diubah. Pilih model katalog baru untuk memperbaruinya.";
      return;
    }

    fields.brand.value = String(brand.id);
    loadCategories(brand.id, category.id);

    fields.category.value = String(category.id);
    loadModels(brand.id, category.id, selectedModel.id);

    fields.quantity.value = machine.quantity;
    fields.machine_condition.value = machine.machine_condition;
    fields.notes.value = machine.notes || "";

    $("formTitle").textContent = "Edit Mesin";
    saveButton.textContent = "Perbarui Mesin";
    $("cancelEdit").hidden = false;

    message.textContent = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteMachine(machine) {
    if (!confirm(`Hapus ${machine.machine_name}?`)) return;

    const { error } = await db
      .from("user_machines")
      .delete()
      .eq("id", machine.id)
      .eq("user_id", user.id);

    if (error) {
      message.textContent = error.message;
      return;
    }

    message.textContent = "Mesin berhasil dihapus.";
    await loadMachines();
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const id = $("machineId").value;

    const brand = brands.find(
      item => String(item.id) === String(fields.brand.value)
    );

    const category = categories.find(
      item => String(item.id) === String(fields.category.value)
    );

    const model = models.find(
      item => String(item.id) === String(fields.model.value)
    );

    if (!brand || !category || !model) {
      message.textContent = "Pilih merek, kategori, dan model yang valid.";
      return;
    }

    const payload = {
      user_id: user.id,
      machine_name: `${brand.name} ${model.model_name}`,
      category: category.name,
      brand: brand.name,
      model: model.model_name,
      quantity: Number(fields.quantity.value),
      machine_condition: fields.machine_condition.value,
      notes: fields.notes.value.trim() || null
    };

    if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
      message.textContent = "Jumlah mesin minimal 1.";
      return;
    }

    saveButton.disabled = true;
    message.textContent = "Menyimpan data...";

    try {
      const result = id
        ? await db.from("user_machines")
            .update(payload)
            .eq("id", id)
            .eq("user_id", user.id)
        : await db.from("user_machines").insert(payload);

      if (result.error) {
        message.textContent = result.error.message;
        return;
      }

      message.textContent = id
        ? "Data mesin berhasil diperbarui."
        : "Mesin berhasil didaftarkan.";

      resetForm();
      await loadMachines();
    } finally {
      saveButton.disabled = false;
    }
  });

  $("cancelEdit").addEventListener("click", () => {
    resetForm();
    message.textContent = "";
  });

  const catalogReady = await loadCatalog();

  if (catalogReady) {
    await loadMachines();
  }
});
