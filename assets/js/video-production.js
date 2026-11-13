document.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;

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

  const user = authData.user;

  const form = document.getElementById("videoForm");
  const titleInput = document.getElementById("videoTitle");
  const descriptionInput =
    document.getElementById("videoDescription");
  const urlInput = document.getElementById("youtubeUrl");
  const saveButton = document.getElementById("saveVideoButton");
  const cancelButton = document.getElementById("cancelEditButton");
  const message = document.getElementById("videoMessage");
  const list = document.getElementById("myVideoList");

  let editingId = null;

  function getYouTubeId(value) {
    try {
      const url = new URL(value.trim());
      const host = url.hostname.toLowerCase();

      if (!["http:", "https:"].includes(url.protocol)) return null;

      if (host === "youtu.be") {
        const id = url.pathname.split("/").filter(Boolean)[0];
        return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
      }

      if (![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com"
      ].includes(host)) return null;

      let id = null;

      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else {
        const parts = url.pathname.split("/").filter(Boolean);

        if (["shorts", "live", "embed"].includes(parts[0])) {
          id = parts[1];
        }
      }

      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
    } catch {
      return null;
    }
  }

  function resetForm() {
    editingId = null;
    form.reset();
    saveButton.textContent = "Tambahkan Video";
    cancelButton.hidden = true;
  }

  cancelButton.addEventListener("click", resetForm);

  async function loadVideos() {
    list.innerHTML = "<p>Memuat video...</p>";

    const { data, error } = await db
      .from("user_videos")
      .select("id, title, description, youtube_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = "Gagal memuat: " + error.message;
      return;
    }

    list.replaceChildren();

    if (!data || !data.length) {
      list.innerHTML = "<p>Belum ada video. Tambahkan video pertamamu!</p>";
      return;
    }

    data.forEach(video => {
      const card = document.createElement("article");
      card.className = "video-item";

      const thumbnail = document.createElement("img");
      thumbnail.src =
        `https://img.youtube.com/vi/${getYouTubeId(video.youtube_url)}/hqdefault.jpg`;
      thumbnail.alt = video.title;
      thumbnail.loading = "lazy";

      const content = document.createElement("div");

      const heading = document.createElement("h3");
      heading.textContent = video.title;

      const description = document.createElement("p");
      description.textContent = video.description || "";

      const watch = document.createElement("a");
      watch.href = video.youtube_url;
      watch.target = "_blank";
      watch.rel = "noopener noreferrer";
      watch.textContent = "Lihat di YouTube ↗";

      const actions = document.createElement("div");
      actions.className = "video-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";

      editButton.addEventListener("click", () => {
        editingId = video.id;
        titleInput.value = video.title;
        descriptionInput.value = video.description || "";
        urlInput.value = video.youtube_url;
        saveButton.textContent = "Simpan Perubahan";
        cancelButton.hidden = false;
        form.scrollIntoView({ behavior: "smooth" });
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Hapus";

      deleteButton.addEventListener("click", async () => {
        if (!confirm(`Hapus video "${video.title}"?`)) return;

        const { error } = await db
          .from("user_videos")
          .delete()
          .eq("id", video.id)
          .eq("user_id", user.id);

        if (error) {
          message.textContent = "Gagal menghapus: " + error.message;
          return;
        }

        message.textContent = "Video berhasil dihapus.";
        if (editingId === video.id) resetForm();
        await loadVideos();
      });

      actions.append(editButton, deleteButton);
      content.append(heading, description, watch, actions);
      card.append(thumbnail, content);
      list.appendChild(card);
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const youtubeUrl = urlInput.value.trim();
    const videoId = getYouTubeId(youtubeUrl);

    if (!title) {
      message.textContent = "Judul video wajib diisi.";
      return;
    }

    if (!videoId) {
      message.textContent =
        "Link tidak valid. Hanya link video YouTube yang diperbolehkan.";
      return;
    }

    const payload = {
      title,
      description: description || null,
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`
    };

    saveButton.disabled = true;

    let result;

    if (editingId) {
      result = await db
        .from("user_videos")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", user.id);
    } else {
      result = await db
        .from("user_videos")
        .insert({
          ...payload,
          user_id: user.id
        });
    }

    saveButton.disabled = false;

    if (result.error) {
      message.textContent = "Gagal menyimpan: " + result.error.message;
      return;
    }

    message.textContent = editingId
      ? "Video berhasil diperbarui."
      : "Video berhasil ditambahkan.";

    resetForm();
    await loadVideos();
  });

  await loadVideos();
});
