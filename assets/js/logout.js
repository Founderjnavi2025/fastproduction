(() => {
  const installLogout = () => {
    if (!window.db) return;

    let button = document.getElementById("logoutButton");

    if (!button) {
      button = document.createElement("button");
      button.id = "logoutButton";
      button.type = "button";
      button.textContent = "LOGOUT";

      const header = document.querySelector("header");

      if (header) {
        header.appendChild(button);
      } else {
        document.body.appendChild(button);
      }
    }

    Object.assign(button.style, {
      padding: "9px 13px",
      margin: "8px",
      border: "1px solid rgba(255,255,255,.25)",
      borderRadius: "8px",
      background: "#171717",
      color: "#fff",
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "1px",
      cursor: "pointer",
      flexShrink: "0"
    });

    if (button.dataset.logoutBound) return;
    button.dataset.logoutBound = "true";

    button.addEventListener("click", async () => {
      if (!confirm("Yakin ingin keluar dari FastProduction?")) return;

      button.disabled = true;
      button.textContent = "KELUAR...";

      const { error } = await window.db.auth.signOut({
        scope: "local"
      });

      if (error) {
        alert("Logout gagal: " + error.message);
        button.disabled = false;
        button.textContent = "LOGOUT";
        return;
      }

      window.location.replace("login.html");
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installLogout);
  } else {
    installLogout();
  }
})();
