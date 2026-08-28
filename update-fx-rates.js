// Notion "FX Rates" -> "Current Rates" sayfasındaki USD ve EUR alanlarını
// her gün güncel TRY karşılığıyla günceller.
//
// Gerekli ortam değişkenleri:
//   NOTION_TOKEN    - Notion internal integration token (secret_...)
//   NOTION_PAGE_ID  - Güncellenecek "Current Rates" sayfasının ID'si

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = process.env.NOTION_PAGE_ID;

if (!NOTION_TOKEN || !PAGE_ID) {
  console.error("NOTION_TOKEN ve NOTION_PAGE_ID ortam değişkenleri gerekli.");
  process.exit(1);
}

async function getRate(base) {
  const url = `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=TRY`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Frankfurter API hatası (${base}): ${res.status}`);
  }
  const data = await res.json();
  const rate = data.rates && data.rates.TRY;
  if (typeof rate !== "number") {
    throw new Error(`Frankfurter API beklenmeyen yanıt (${base}): ${JSON.stringify(data)}`);
  }
  return rate;
}

async function updateNotionPage(usdRate, eurRate) {
  const res = await fetch(`https://api.notion.com/v1/pages/${PAGE_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        USD: { number: usdRate },
        EUR: { number: eurRate },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion API hatası: ${res.status} - ${errText}`);
  }
  return res.json();
}

(async () => {
  try {
    const [usdRate, eurRate] = await Promise.all([
      getRate("USD"),
      getRate("EUR"),
    ]);

    console.log(`USD/TRY: ${usdRate}`);
    console.log(`EUR/TRY: ${eurRate}`);

    await updateNotionPage(usdRate, eurRate);
    console.log("Notion sayfası başarıyla güncellendi.");
  } catch (err) {
    console.error("Güncelleme başarısız:", err.message);
    process.exit(1);
  }
})();
