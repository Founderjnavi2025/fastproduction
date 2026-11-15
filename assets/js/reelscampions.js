(() => {
  async function init() {
    const message = document.getElementById('rcMessage');
    const shops = document.getElementById('rcShops');
    const count = document.getElementById('rcCount');

    if (!window.db) {
      message.textContent = 'Koneksi FastProduction belum tersedia.';
      return;
    }

    try {
      const { data: auth, error: authError } =
        await window.db.auth.getUser();

      if (authError || !auth.user) {
        location.replace('login.html');
        return;
      }

      const { data, error } = await window.db
        .from('design_po_items')
        .select('id,creator_id,title,category,description,owner,image_url,status,created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || !data.length) {
        message.textContent = 'Belum ada desainer yang menerbitkan karya.';
        count.textContent = '0 akun desainer';
        return;
      }

      const groups = new Map();

      data.forEach(item => {
        if (!groups.has(item.creator_id)) {
          groups.set(item.creator_id, {
            owner: item.owner || 'Designer',
            items: []
          });
        }
        groups.get(item.creator_id).items.push(item);
      });

      count.textContent = `${groups.size} akun · ${data.length} desain`;
      message.textContent = '';

      const escapeHTML = value => String(value || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
      })[c]);

      shops.innerHTML = [...groups.entries()].map(([uid, group]) => {
        const owner = escapeHTML(group.owner);
        const designs = group.items.map(item => `
          <article class="rc-design">
            <img src="${escapeHTML(item.image_url)}"
                 alt="${escapeHTML(item.title)}"
                 loading="lazy">
            <div class="rc-design-info">
              <div class="rc-design-title">${escapeHTML(item.title)}</div>
              <div class="rc-design-category">${escapeHTML(item.category)}</div>
              <div class="rc-po-row">
                <span class="rc-po-interest">0 peminat</span>
                <button class="rc-po-button" type="button"
                  data-design-id="${escapeHTML(item.id)}">
                  MAU PO →
                </button>
              </div>
            </div>
          </article>
        `).join('');

        return `
          <section class="rc-shop">
            <div class="rc-shop-head" role="button" tabindex="0">
              <div class="rc-avatar">${owner.charAt(0).toUpperCase()}</div>
              <div>
                <div class="rc-shop-name">@${owner}</div>
                <div class="rc-shop-count">${group.items.length} desain diterbitkan</div>
              </div>
              <div class="rc-arrow">⌄</div>
            </div>
            <div class="rc-designs">${designs}</div>
          </section>
        `;
      }).join('');

      shops.querySelectorAll('.rc-po-button').forEach(button => {
        button.addEventListener('click', () => {
          alert('Desain dipilih! Sistem komitmen PO akan kita aktifkan pada tahap berikutnya.');
        });
      });

      shops.querySelectorAll('.rc-shop-head').forEach(head => {
        const toggle = () => head.closest('.rc-shop').classList.toggle('open');
        head.addEventListener('click', toggle);
        head.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        });
      });

    } catch (error) {
      console.error('Reels Campions:', error);
      message.textContent = 'Gagal memuat etalase: ' + (error.message || 'Kesalahan koneksi');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
