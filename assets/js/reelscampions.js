(() => {
  const TABLE = 'design_po_items';
  const INTERESTS = 'design_po_interests';

  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[c]);

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

      const user = auth.user;

      async function render() {
        message.textContent = 'Memuat etalase...';

        const [designResult, statsResult] = await Promise.all([
          window.db.from(TABLE)
            .select('id,creator_id,title,category,description,owner,image_url,status,created_at')
            .order('created_at', { ascending: false }),

          window.db.rpc('get_design_po_stats')
        ]);

        if (designResult.error) throw designResult.error;
        if (statsResult.error) throw statsResult.error;

        const designs = designResult.data || [];
        const stats = new Map(
          (statsResult.data || []).map(row => [row.design_id, row])
        );

        if (!designs.length) {
          count.textContent = '0 akun desainer';
          message.textContent = 'Belum ada desain yang diterbitkan.';
          shops.innerHTML = '';
          return;
        }

        const groups = new Map();

        designs.forEach(item => {
          if (!groups.has(item.creator_id)) {
            groups.set(item.creator_id, {
              owner: item.owner || 'Designer',
              items: []
            });
          }
          groups.get(item.creator_id).items.push(item);
        });

        count.textContent = `${groups.size} akun · ${designs.length} desain`;
        message.textContent = '';

        shops.innerHTML = [...groups.entries()].map(([uid, group]) => {
          const owner = esc(group.owner);

          const cards = group.items.map(item => {
            const stat = stats.get(item.id);
            const interestCount = stat ? Number(stat.interest_count) : 0;
            const joined = stat ? stat.joined : false;

            return `
              <article class="rc-design">
                <img src="${esc(item.image_url)}"
                     alt="${esc(item.title)}"
                     loading="lazy">

                <div class="rc-design-info">
                  <div class="rc-design-title">${esc(item.title)}</div>
                  <div class="rc-design-category">${esc(item.category)}</div>

                  <div class="rc-po-row">
                    <span class="rc-po-interest">
                      ${interestCount} peminat
                    </span>

                    <button
                      class="rc-po-button ${joined ? 'joined' : ''}"
                      type="button"
                      data-design-id="${esc(item.id)}"
                      data-joined="${joined}">
                      ${joined ? '✓ SUDAH MINAT' : 'MAU PO →'}
                    </button>
                  </div>
                </div>
              </article>
            `;
          }).join('');

          return `
            <section class="rc-shop">
              <div class="rc-shop-head" role="button" tabindex="0">
                <div class="rc-avatar">${owner.charAt(0).toUpperCase()}</div>
                <div>
                  <div class="rc-shop-name">@${owner}</div>
                  <div class="rc-shop-count">
                    ${group.items.length} desain diterbitkan
                  </div>
                </div>
                <div class="rc-arrow">⌄</div>
              </div>
              <div class="rc-designs">${cards}</div>
            </section>
          `;
        }).join('');

        shops.querySelectorAll('.rc-shop-head').forEach(head => {
          const toggle = () =>
            head.closest('.rc-shop').classList.toggle('open');

          head.addEventListener('click', toggle);
          head.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggle();
            }
          });
        });

        shops.querySelectorAll('.rc-po-button').forEach(button => {
          button.addEventListener('click', async () => {
            const designId = button.dataset.designId;
            const joined = button.dataset.joined === 'true';

            button.disabled = true;
            button.textContent = 'MEMPROSES...';

            try {
              let result;

              if (joined) {
                result = await window.db
                  .from(INTERESTS)
                  .delete()
                  .eq('design_id', designId)
                  .eq('user_id', user.id);
              } else {
                result = await window.db
                  .from(INTERESTS)
                  .insert({
                    design_id: designId,
                    user_id: user.id
                  });
              }

              if (result.error) throw result.error;

              await render();

            } catch (error) {
              console.error('PO interest:', error);
              alert('Gagal memproses minat PO: ' + error.message);
              await render();
            }
          });
        });
      }

      await render();

    } catch (error) {
      console.error('Reels Campions:', error);
      message.textContent =
        'Gagal memuat: ' + (error.message || 'Kesalahan koneksi');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
