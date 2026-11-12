document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;

  if (!db) {
    location.href = "login.html";
    return;
  }

  const message = document.getElementById("message");
  const list = document.getElementById("machineList");
  const form = document.getElementById("machineForm");
  const saveButton = document.getElementById("saveButton");

  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData.user) {
    location.href = "login.html";
    return;
  }

  const user = authData.user;

  const fields = {
    machine_name: document.getElementById("machineName"),
    category: document.getElementById("category"),
    brand: document.getElementById("brand"),
    model: document.getElementById("model"),
    quantity: document.getElementById("quantity"),
    machine_condition: document.getElementById("machineCondition"),
    notes: document.getElementById("notes")
  };

  function resetForm() {
    form.reset();
    document.getElementById("machineId").value = "";
    document.getElementById("quantity").value = 1;
    document.getElementById("formTitle").textContent = "Tambah Mesin";
    saveButton.textContent = "Simpan Mesin";
    document.getElementById("cancelEdit").hidden = true;
  }

  function conditionLabel(value) {
    return {
      baik: "Baik",
      perlu_perbaikan: "Perlu Perbaikan",
      rusak: "Rusak"
    }[value] || value;
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

    document.getElementById("machineCount").textContent =
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
        machine.category,
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
    document.getElementById("machineId").value = machine.id;

    Object.entries(fields).forEach(([key, input]) => {
      input.value = machine[key] ?? "";
    });

    document.getElementById("formTitle").textContent = "Edit Mesin";
    saveButton.textContent = "Perbarui Mesin";
    document.getElementById("cancelEdit").hidden = false;

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

    const id = document.getElementById("machineId").value;

    const payload = {
      user_id: user.id,
      machine_name: fields.machine_name.value.trim(),
      category: fields.category.value,
      brand: fields.brand.value.trim() || null,
      model: fields.model.value.trim() || null,
      quantity: Number(fields.quantity.value),
      machine_condition: fields.machine_condition.value,
      notes: fields.notes.value.trim() || null
    };

    if (!payload.machine_name || payload.quantity < 1) {
      message.textContent = "Periksa nama dan jumlah mesin.";
      return;
    }

    saveButton.disabled = true;
    message.textContent = "Menyimpan data...";

    const result = id
      ? await db.from("user_machines")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id)
      : await db.from("user_machines").insert(payload);

    saveButton.disabled = false;

    if (result.error) {
      message.textContent = result.error.message;
      return;
    }

    message.textContent = id
      ? "Data mesin berhasil diperbarui."
      : "Mesin berhasil didaftarkan.";

    resetForm();
    await loadMachines();
  });

  document.getElementById("cancelEdit")
    .addEventListener("click", resetForm);

  await loadMachines();
});
