const SUPABASE_URL = "https://desnuldfjxawlzjixofx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlc251bGRmanhhd2x6aml4b2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODk2ODksImV4cCI6MjExMDA2NTY4OX0.1ezJ5MXWXYm1e6m-0RkQPWL9JyqTi9Ic6fAH1yLTqXI";

const BASE_URL = "https://fastproduction-tvgg.vercel.app";

module.exports = async (req, res) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?status=eq.published&select=slug,published_at&order=published_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Gagal mengambil artikel");
    }
    
    const articles = await response.json();
    
    const urls = [
      `${BASE_URL}/`,
      `${BASE_URL}/artikel/`,
      `${BASE_URL}/artikel/cara-mencari-vendor-konveksi.html`,
      ...articles.map(article =>
        `${BASE_URL}/artikel/${encodeURIComponent(article.slug)}`
      )
    ];
    
    const uniqueUrls = [...new Set(urls)];
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls.map(url => `  <url>
    <loc>${url}</loc>
  </url>`).join("\n")}
</urlset>`;
    
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    
    return res.status(200).send(xml);
    
  } catch (error) {
    console.error(error);
    
    return res.status(500).send("Gagal membuat sitemap");
  }
};
