const sanitizeHtml = require("sanitize-html");
const SUPABASE_URL = "https://desnuldfjxawlzjixofx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlc251bGRmanhhd2x6aml4b2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODk2ODksImV4cCI6MjExMDA2NTY4OX0.1ezJ5MXWXYm1e6m-0RkQPWL9JyqTi9Ic6fAH1yLTqXI";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function safeArticleHTML(html = "") {
  return sanitizeHtml(String(html), {
    allowedTags: [
      "p", "br",
      "h2", "h3", "h4",
      "strong", "b",
      "em", "i",
      "ul", "ol", "li",
      "blockquote",
      "a",
      "pre", "code",
      "hr"
    ],
    allowedAttributes: {
      a: ["href", "title"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "nofollow noopener noreferrer" }
      )
    }
  });
}

function layout({ title, description, canonical, content }) {
  const safeTitle = escapeHTML(title);
  const safeDescription = escapeHTML(description);
  const safeCanonical = escapeHTML(canonical);

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
<link rel="canonical" href="${safeCanonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${safeCanonical}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/assets/css/journal.css">
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  mainEntityOfPage: canonical,
  publisher: {
    "@type": "Organization",
    name: "FastProduction",
    url: "https://fastproduction-tvgg.vercel.app/"
  }
}).replace(/</g, "\\u003c")}</script>
</head>
<body>
<header>
<a href="/" class="brand">FastProduction</a>
<a href="/artikel/">Journal</a>
</header>
<main class="reading">
<p class="eyebrow">FASTPRODUCTION JOURNAL</p>
<h1>${safeTitle}</h1>
<p class="intro">${safeDescription}</p>
<article>${safeArticleHTML(content)}</article>
<div class="cta">
<h2>Bangun Produksi Clothing Lebih Terarah</h2>
<p>Temukan mitra produksi dan hubungkan kebutuhan konveksi melalui FastProduction.</p>
<a href="/register.html">Mulai bersama FastProduction →</a>
</div>
</main>
<footer>© 2026 FastProduction — Production Network Platform</footer>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const slug = String(req.query.slug || "").trim();

  if (!/^[a-z0-9-]{1,180}$/.test(slug)) {
    return res.status(400).send("Slug tidak valid");
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,slug,content,excerpt,meta_title,meta_description,published_at&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Database request failed");
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(404).send("Artikel tidak ditemukan");
    }

    const article = rows[0];
    const canonical =
      `https://fastproduction-tvgg.vercel.app/artikel/${article.slug}`;

    const html = layout({
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt || article.title,
      canonical,
      content: article.content
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(html);

  } catch (error) {
    console.error(error);
    return res.status(500).send("Terjadi kesalahan saat memuat artikel");
  }
};
