(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = [...document.querySelectorAll(".dot")];
  const counter = document.getElementById("slideCounter");
  const stage = document.getElementById("stage");
  let current = 0;
  let startX = 0;

  function showSlide(index) {
    current = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.remove("active", "before", "after");
      if (i === current) slide.classList.add("active");
      else if (i === (current - 1 + slides.length) % slides.length)
        slide.classList.add("before");
      else if (i === (current + 1) % slides.length)
        slide.classList.add("after");
    });

    dots.forEach((dot, i) => dot.classList.toggle("active", i === current));
    counter.textContent =
      String(current + 1).padStart(2, "0") + " / " +
      String(slides.length).padStart(2, "0");
  }

  document.getElementById("prev").addEventListener("click", () => showSlide(current - 1));
  document.getElementById("next").addEventListener("click", () => showSlide(current + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => showSlide(i)));

  stage.addEventListener("touchstart", e => {
    startX = e.changedTouches[0].screenX;
  }, { passive: true });

  stage.addEventListener("touchend", e => {
    const diff = e.changedTouches[0].screenX - startX;
    if (Math.abs(diff) > 45) showSlide(current + (diff < 0 ? 1 : -1));
  }, { passive: true });

  stage.addEventListener("mousedown", e => startX = e.screenX);
  stage.addEventListener("mouseup", e => {
    const diff = e.screenX - startX;
    if (Math.abs(diff) > 55) showSlide(current + (diff < 0 ? 1 : -1));
  });

  showSlide(0);

  async function loadUser() {
    if (!window.db) {
      document.getElementById("welcomeName").textContent = "Supabase belum tersedia";
      return;
    }

    const { data: { user }, error: authError } = await window.db.auth.getUser();

    if (authError || !user) {
      window.location.href = "login.html";
      return;
    }

    const { data: profile } = await window.db
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const name = profile?.full_name || user.user_metadata?.full_name || "User";
    const initial = name.trim().charAt(0).toUpperCase() || "U";

    document.getElementById("welcomeName").textContent = name;
    document.getElementById("memberName").textContent = name.toUpperCase();
    document.getElementById("profileInitial").textContent = initial;
    document.getElementById("memberCode").textContent =
      "FP—" + user.id.replace(/-/g, "").slice(0, 8).toUpperCase();

    const { count, error } = await window.db
      .from("user_machines")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!error) {
      const total = count || 0;
      document.getElementById("machineCount").textContent =
        total + (total === 1 ? " MACHINE." : " MACHINES.");
      document.getElementById("machineDescription").textContent =
        total === 0
          ? "Belum ada mesin terdaftar. Inventaris produksimu akan tampil di sini."
          : total + " unit mesin terdaftar dalam inventaris produksimu.";
    }
  }


  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      if (!confirm("Yakin ingin keluar dari FastProduction?")) return;

      logoutButton.disabled = true;
      logoutButton.textContent = "KELUAR...";

      const { error } = await window.db.auth.signOut({ scope: "local" });

      if (error) {
        alert("Logout gagal: " + error.message);
        logoutButton.disabled = false;
        logoutButton.textContent = "LOGOUT";
        return;
      }

      window.location.replace("login.html");
    });
  }

  loadUser();
})();
