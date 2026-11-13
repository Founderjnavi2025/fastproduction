(() => {
  const installLogout = () => {
    if (!window.db) return;

    let button = document.getElementById("logoutButton");

    if (!button) {
      button = document.createElement("button");
      button.id = "logoutButton";
      button.type = "button";
      button.className = "logout-btn";
      button.textContent = "LOGOUT";

      const target =
        document.querySelector(".profile-actions") ||
        document.querySelector("header");

      if (target) {
        target.appendChild(button);
      } else {
        document.body.appendChild(button);
      }
    }

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
