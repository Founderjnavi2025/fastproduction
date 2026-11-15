(() => {
  const TABLE = 'design_po_items';
  const BUCKET = 'design-images';

  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[c]);

  function driveImage(url) {
    const match = String(url).match(/\/file\/d\/([^/]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
    return url;
  }

  async function renderCards() {
    const feed = document.getElementById('designPoCards');
    if (!feed) return;

    feed.innerHTML = '<div class="design-po-empty">Memuat desain...</div>';

    const { data, error } = await window.db
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      feed.innerHTML = '<div class="design-po-empty">Gagal memuat desain. Periksa koneksi.</div>';
      console.error(error);
      return;
    }

    if (!data.length) {
      feed.innerHTML = '<div class="design-po-empty">Belum ada desain. Jadilah yang pertama!</div>';
      return;
    }

    feed.innerHTML = data.map(item => `
      <article class="design-po-card">
        <div class="design-po-image">
          <img src="${esc(item.image_url)}"
               alt="${esc(item.title)}"
               loading="lazy">
          <div class="design-po-image-tag">${esc(item.category)}</div>
        </div>
        <div class="design-po-info">
          <div class="design-po-meta">
            <span>${esc(item.id.slice(0, 8).toUpperCase())}</span>
            <span>${esc(item.status)}</span>
          </div>
          <h3>${esc(item.title)}</h3>
          <p class="design-po-owner">Oleh @${esc(item.owner)}</p>
          <p class="design-po-description">${esc(item.description)}</p>
          <div class="design-po-actions">
            <div class="design-po-status">Kandidat PO</div>
            <div class="design-po-cta">MAU PO <span>→</span></div>
          </div>
        </div>
      </article>
    `).join('');
  }

  async function init() {
    const panel = document.getElementById('designsPanel');
    if (!panel || panel.dataset.designPoReady) return;

    if (!window.db) {
      console.error('Supabase client window.db belum tersedia.');
      return;
    }

    panel.dataset.designPoReady = '1';

    panel.innerHTML = `
      <section class="design-po">
        <header class="design-po-header">
          <div>
            <span class="design-po-eyebrow">FASTPRODUCTION MARKETPLACE</span>
            <h2>Design → PO</h2>
            <p>Temukan desain. Pilih produk. Wujudkan produksi.</p>
          </div>
          <div class="design-po-count">DESIGN FEED</div>
        </header>

        <button type="button" class="design-po-create" id="designPoOpen">
          ＋ TERBITKAN DESAIN
        </button>

        <form class="design-po-form" id="designPoForm" hidden>
          <div class="design-po-form-heading">
            <h3>Terbitkan desain baru</h3>
            <button type="button" id="designPoClose">✕</button>
          </div>

          <label>Judul desain</label>
          <input name="title" maxlength="80" required>

          <label>Kategori produk</label>
          <select name="category" required>
            <option value="">Pilih kategori</option>
            <option>Kaos</option>
            <option>Kemeja</option>
            <option>Hoodie</option>
            <option>Celana</option>
            <option>Jaket</option>
            <option>Lainnya</option>
          </select>

          <label>Deskripsi</label>
          <textarea name="description" maxlength="500" rows="3"></textarea>

          <label>Nama akun desainer</label>
          <input name="owner" maxlength="40" required placeholder="username">

          <label>Upload gambar dari HP</label>
          <input name="imageFile" type="file" accept="image/*">

          <div class="design-po-or">ATAU</div>

          <label>Link Google Drive</label>
          <input name="imageUrl" type="url"
                 placeholder="https://drive.google.com/file/d/...">

          <p class="design-po-hint">
            Gambar Drive harus bisa diakses siapa saja yang memiliki link.
          </p>

          <button class="design-po-submit" type="submit">
            TERBITKAN DESAIN
          </button>
          <p class="design-po-form-message" id="designPoMessage"></p>
        </form>

        <div class="design-po-feed">
          <div id="designPoCards"></div>
          <div class="design-po-next">↓ GULIR UNTUK MELIHAT DESAIN LAIN</div>
        </div>
      </section>
    `;

    const form = document.getElementById('designPoForm');
    const message = document.getElementById('designPoMessage');

    document.getElementById('designPoOpen').onclick = async () => {
      const { data } = await window.db.auth.getUser();
      if (!data.user) {
        alert('Login FastProduction terlebih dahulu.');
        return;
      }
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    document.getElementById('designPoClose').onclick = () => {
      form.hidden = true;
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const submit = form.querySelector('.design-po-submit');
      submit.disabled = true;
      message.textContent = 'Sedang menerbitkan desain...';

      try {
        const { data: auth, error: authError } =
          await window.db.auth.getUser();

        if (authError || !auth.user) {
          throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
        }

        const user = auth.user;
        const fd = new FormData(form);
        const file = fd.get('imageFile');
        const driveUrl = String(fd.get('imageUrl') || '').trim();

        if (!file.size && !driveUrl) {
          throw new Error('Pilih gambar atau masukkan link Google Drive.');
        }

        let imageUrl = driveUrl ? driveImage(driveUrl) : '';

        if (file.size) {
          if (file.size > 5 * 1024 * 1024) {
            throw new Error('Ukuran gambar maksimal 5 MB.');
          }

          if (!file.type.startsWith('image/')) {
            throw new Error('File harus berupa gambar.');
          }

          const ext = file.name.split('.').pop().toLowerCase()
            .replace(/[^a-z0-9]/g, '') || 'jpg';

          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await window.db.storage
            .from(BUCKET)
            .upload(path, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = window.db.storage
            .from(BUCKET)
            .getPublicUrl(path);

          imageUrl = publicData.publicUrl;
        }

        const record = {
          creator_id: user.id,
          title: String(fd.get('title')).trim(),
          category: String(fd.get('category')),
          description: String(fd.get('description') || '').trim(),
          owner: String(fd.get('owner')).trim().replace(/^@/, ''),
          image_url: imageUrl,
          status: 'candidate'
        };

        const { error } = await window.db
          .from(TABLE)
          .insert(record);

        if (error) throw error;

        form.reset();
        form.hidden = true;
        await renderCards();

      } catch (error) {
        console.error(error);
        message.textContent = error.message || 'Gagal menerbitkan desain.';
      } finally {
        submit.disabled = false;
      }
    });

    await renderCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
