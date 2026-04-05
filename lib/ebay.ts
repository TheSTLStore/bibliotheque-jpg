export interface EbayResult {
  titre: string;
  prix: string;
  lien: string;
  image: string | null;
}

async function getEbayAccessToken(): Promise<string> {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    throw new Error("eBay credentials not configured");
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`eBay auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function searchEbay(
  query: string,
  isbn?: string | null
): Promise<EbayResult[]> {
  const token = await getEbayAccessToken();

  const searchQuery = isbn ? isbn : query;
  const params = new URLSearchParams({
    q: searchQuery,
    limit: "5",
    filter: "buyingOptions:{FIXED_PRICE}",
  });

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_FR",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) return [];

  const data = await res.json();

  return (data.itemSummaries || []).slice(0, 5).map((item: Record<string, unknown>) => ({
    titre: (item.title as string) || "",
    prix: item.price
      ? `${(item.price as Record<string, string>).value} ${(item.price as Record<string, string>).currency}`
      : "N/A",
    lien: (item.itemWebUrl as string) || "",
    image: item.image ? (item.image as Record<string, string>).imageUrl : null,
  }));
}
