(() => {
  const form = document.getElementById("scopeForm");
  const button = document.getElementById("submitButton");
  const message = document.getElementById("message");
  const deadlineInput = document.getElementById("deadline");

  const today = new Date();
  const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  deadlineInput.min = localToday;

  async function init() {
    if (!window.db) {
      message.textContent = "Koneksi Supabase tidak tersedia.";
      return;
    }

    const { data, error } = await window.db.auth.getUser();

    if (error || !data.user) {
      window.location.replace("login.html");
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();
      const targetQty = Number(
        document.getElementById("targetQty").value
      );
      const deadline = deadlineInput.value || null;

      if (!title) {
        message.textContent = "Judul pekerjaan wajib diisi.";
        return;
      }

      if (!Number.isSafeInteger(targetQty) || targetQty < 1) {
        message.textContent = "Target produksi harus minimal 1 pcs.";
        return;
      }

      if (deadline && deadline < localToday) {
        message.textContent = "Deadline tidak boleh tanggal yang sudah lewat.";
        return;
      }

      button.disabled = true;
      button.textContent = "MENERBITKAN...";
      message.textContent = "";

      const { data: scope, error: insertError } = await window.db
        .from("scopes")
        .insert({
          creator_id: data.user.id,
          title,
          description: description || null,
          target_qty: targetQty,
          deadline,
          status: "open"
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Create Scope:", insertError);
        message.textContent = "Gagal menerbitkan Scope: " + insertError.message;
        button.disabled = false;
        button.textContent = "TERBITKAN SCOPE";
        return;
      }

      form.reset();
      document.getElementById("targetQty").value = 100;

      message.innerHTML = "";

      const success = document.createElement("strong");
      success.textContent = "Scope berhasil diterbitkan! ";

      const link = document.createElement("a");
      link.className = "success-link";
      link.href = "profile.html?id=" + encodeURIComponent(data.user.id);
      link.textContent = "Lihat profil dan Scope →";

      message.append(success, link);

      button.disabled = false;
      button.textContent = "TERBITKAN SCOPE";

      console.log("Scope berhasil dibuat:", scope.id);
    });
  }

  init();
})();
