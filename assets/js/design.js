document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;

  if (!db) {
    location.href = "login.html";
    return;
  }

  const { data: auth, error: authError } = await db.auth.getUser();

  if (authError || !auth.user) {
    location.href = "login.html";
    return;
  }

  const user = auth.user;
  const form = document.getElementById("designForm");
  const idInput = document.getElementById("designId");
  const titleInput = document.getElementById("designTitle");
  const descriptionInput = document.getElementById("designDescription");
  const imageInput = document.getElementById("designImage");
  const list = document.getElementById("designManagementList");
  const message = document.getElementById("designMessage");
  const saveButton = document.getElementById("saveDesignButton");
  const cancelButton = document.getElementById("cancelEditButton");

  function resetForm() {
    form.reset();
    idInput.value = "";
    document.getElementById("formTitle").textContent = "Tambah Design";
    saveButton.textContent = "Simpan Design";
    cancelButton.hidden = true;
  }

  cancelButton.addEventListener("click", resetForm);

  async function loadDesigns() {
    list.textContent = "Memuat desain...";

    const { data, error } = await db
      .from("user_designs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = "Gagal memuat desain: " + error.message;
      return;
    }

    list.replaceChildren();

    if (!data || !data.length) {
      list.textContent = "Belum ada desain. Tambahkan desain pertamamu!";
      return;
    }

    data.forEach(design => {
      const card = document.createElement("article");
      card.className = "profile-card";

      if (design.image_url) {
        const image = document.createElement("img");
        image.src = design.image_url;
        image.alt = design.title;
        image.loading = "lazy";
        image.style.width = "100%";
        image.style.maxHeight = "280px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "10px";
        image.style.marginBottom = "12px";
        image.onerror = () => image.remove();
        card.appendChild(image);
      }

      const heading = document.createElement("h3");
      heading.textContent = design.title;
      card.appendChild(heading);

      const description = document.createElement("p");
      description.textContent = design.description || "Tidak ada deskripsi.";
      card.appendChild(description);

      const actions = document.createElement("div");
      actions.className = "machine-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit Design";
      edit.addEventListener("click", () => {
        idInput.value = design.id;
        titleInput.value = design.title || "";
        descriptionInput.value = design.description || "";
        imageInput.value = design.image_url || "";
        document.getElementById("formTitle").textContent = "Edit Design";
        saveButton.textContent = "Simpan Perubahan";
        cancelButton.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Hapus";
      remove.className = "danger";
      remove.addEventListener("click", async () => {
        if (!confirm("Hapus desain ini?")) return;

        const { error } = await db
          .from("user_designs")
          .delete()
          .eq("id", design.id)
          .eq("user_id", user.id);

        if (error) {
          message.textContent = "Gagal menghapus: " + error.message;
          return;
        }

        message.textContent = "Design berhasil dihapus.";
        await loadDesigns();
      });

      actions.append(edit, remove);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const imageUrl = imageInput.value.trim();

    if (!title) {
      message.textContent = "Nama desain wajib diisi.";
      return;
    }

    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("URL tidak valid");
        }
      } catch {
        message.textContent = "URL gambar harus berupa alamat HTTP atau HTTPS.";
        return;
      }
    }

    saveButton.disabled = true;
    saveButton.textContent = "Menyimpan...";

    const payload = {
      title,
      description: description || null,
      image_url: imageUrl || null,
      updated_at: new Date().toISOString()
    };

    let result;

    if (idInput.value) {
      result = await db
        .from("user_designs")
        .update(payload)
        .eq("id", idInput.value)
        .eq("user_id", user.id);
    } else {
      result = await db
        .from("user_designs")
        .insert({ ...payload, user_id: user.id });
    }

    saveButton.disabled = false;
    saveButton.textContent = idInput.value
      ? "Simpan Perubahan"
      : "Simpan Design";

    if (result.error) {
      message.textContent = "Gagal menyimpan: " + result.error.message;
      return;
    }

    message.textContent = "Design berhasil disimpan.";
    resetForm();
    await loadDesigns();
  });

  await loadDesigns();
});
