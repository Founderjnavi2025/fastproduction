document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;
  const BUCKET = "design-images";
  const MAX_SIZE = 5 * 1024 * 1024;

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
  const previewBox = document.getElementById("imagePreviewBox");
  const preview = document.getElementById("imagePreview");
  const list = document.getElementById("designManagementList");
  const message = document.getElementById("designMessage");
  const saveButton = document.getElementById("saveDesignButton");
  const cancelButton = document.getElementById("cancelEditButton");

  let previewObjectUrl = null;

  function showMessage(text) {
    message.textContent = text;
  }

  function getStoragePath(url) {
    if (!url) return null;

    try {
      const parsed = new URL(url);
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const index = parsed.pathname.indexOf(marker);

      if (index === -1) return null;

      const path = decodeURIComponent(
        parsed.pathname.slice(index + marker.length)
      );

      if (!path.startsWith(`${user.id}/`)) return null;

      return path;
    } catch {
      return null;
    }
  }

  async function removeImage(url) {
    const path = getStoragePath(url);
    if (!path) return;

    const { error } = await db.storage.from(BUCKET).remove([path]);

    if (error) {
      console.warn("Gagal menghapus gambar lama:", error.message);
    }
  }

  function clearPreview() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }

    preview.removeAttribute("src");
    previewBox.hidden = true;
  }

  function resetForm() {
    form.reset();
    idInput.value = "";
    document.getElementById("formTitle").textContent = "Tambah Design";
    saveButton.textContent = "Simpan Design";
    cancelButton.hidden = true;
    clearPreview();
  }

  cancelButton.addEventListener("click", resetForm);

  imageInput.addEventListener("change", () => {
    clearPreview();

    const file = imageInput.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showMessage("Format gambar harus JPG, PNG, atau WEBP.");
      imageInput.value = "";
      return;
    }

    if (file.size > MAX_SIZE) {
      showMessage("Ukuran gambar maksimal 5 MB.");
      imageInput.value = "";
      return;
    }

    previewObjectUrl = URL.createObjectURL(file);
    preview.src = previewObjectUrl;
    previewBox.hidden = false;
    showMessage("");
  });

  function showExistingImage(url) {
    clearPreview();

    if (!url) return;

    preview.src = url;
    previewBox.hidden = false;
  }

  async function uploadImage(file) {
    const extensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };

    const extension = extensions[file.type];

    if (!extension) {
      throw new Error("Format gambar tidak didukung.");
    }

    if (file.size > MAX_SIZE) {
      throw new Error("Ukuran gambar maksimal 5 MB.");
    }

    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);

    return {
      path,
      url: data.publicUrl
    };
  }

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
        imageInput.value = "";

        document.getElementById("formTitle").textContent = "Edit Design";
        saveButton.textContent = "Simpan Perubahan";
        cancelButton.hidden = false;

        showExistingImage(design.image_url);

        form.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Hapus";
      remove.className = "danger";

      remove.addEventListener("click", async () => {
        if (!confirm("Hapus desain ini beserta gambarnya?")) return;

        remove.disabled = true;

        const { error } = await db
          .from("user_designs")
          .delete()
          .eq("id", design.id)
          .eq("user_id", user.id);

        if (error) {
          showMessage("Gagal menghapus: " + error.message);
          remove.disabled = false;
          return;
        }

        await removeImage(design.image_url);
        showMessage("Design berhasil dihapus.");
        await loadDesigns();
      });

      actions.append(edit, remove);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showMessage("");

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const file = imageInput.files[0] || null;
    const editingId = idInput.value;

    if (!title) {
      showMessage("Nama desain wajib diisi.");
      return;
    }

    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showMessage("Format gambar harus JPG, PNG, atau WEBP.");
        return;
      }

      if (file.size > MAX_SIZE) {
        showMessage("Ukuran gambar maksimal 5 MB.");
        return;
      }
    }

    saveButton.disabled = true;
    cancelButton.disabled = true;
    saveButton.textContent = "Menyimpan...";

    let uploaded = null;

    try {
      let oldImageUrl = null;

      if (editingId) {
        const { data: existing, error } = await db
          .from("user_designs")
          .select("image_url")
          .eq("id", editingId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        oldImageUrl = existing.image_url;
      }

      let imageUrl = oldImageUrl;

      if (file) {
        uploaded = await uploadImage(file);
        imageUrl = uploaded.url;
      }

      const payload = {
        title,
        description: description || null,
        image_url: imageUrl || null,
        updated_at: new Date().toISOString()
      };

      let result;

      if (editingId) {
        result = await db
          .from("user_designs")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
      } else {
        result = await db
          .from("user_designs")
          .insert({
            ...payload,
            user_id: user.id
          });
      }

      if (result.error) throw result.error;

      if (file && oldImageUrl) {
        await removeImage(oldImageUrl);
      }

      showMessage("Design berhasil disimpan.");
      resetForm();
      await loadDesigns();

    } catch (err) {
      if (uploaded) {
        await db.storage.from(BUCKET).remove([uploaded.path]);
      }

      console.error("SAVE DESIGN ERROR:", err);
      showMessage("Gagal menyimpan: " + (err.message || err));

    } finally {
      saveButton.disabled = false;
      cancelButton.disabled = false;
      saveButton.textContent = idInput.value
        ? "Simpan Perubahan"
        : "Simpan Design";
    }
  });

  await loadDesigns();
});
