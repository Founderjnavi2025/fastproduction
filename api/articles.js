const SUPABASE_URL = "https://desnuldfjxawlzjixofx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlc251bGRmanhhd2x6aml4b2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODk2ODksImV4cCI6MjExMDA2NTY4OX0.1ezJ5MXWXYm1e6m-0RkQPWL9JyqTi9Ic6fAH1yLTqXI";

module.exports = async (req, res) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?status=eq.published&select=id,title,slug,excerpt,meta_description,published_at&order=published_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Gagal mengambil daftar artikel");
    }

    const articles = await response.json();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json(articles);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Tidak dapat memuat artikel"
    });
  }
};
