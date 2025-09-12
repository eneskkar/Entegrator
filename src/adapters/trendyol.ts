import axios from "axios";

export type TrendyolCredentials = {
  apiKey: string;
  apiSecret?: string;
  sellerId?: string;
};

export type MappedVariant = {
  sku: string;
  barcode?: string;
  price: number;
  stock: number;
  currency?: string; // default TRY
  attrs?: Record<string, any>;
};

export type MappedProduct = {
  name: string;
  brand?: string;
  variants: MappedVariant[];
};

export async function healthCheck(creds: TrendyolCredentials) {
  // Gerçek hayatta Trendyol test endpoint'i/credentials doğrulaması yapılır.
  // Demo için "mock" başarılı cevap döndürüyoruz.
  if (!creds.apiKey) throw new Error("Missing apiKey");
  return { ok: true, message: "Trendyol mock health OK" };
}

export async function pushProducts(
  creds: TrendyolCredentials,
  products: MappedProduct[]
) {
  // DEMO: dış servise çağrı yapmıyoruz; 200 OK dönüp payload'ı logluyoruz.
  // Gerçekte burada Trendyol Products API formatına map edip POST edilir.
  // await axios.post("https://api.trendyol.com/...", mappedBody, { auth: {...} })

  console.log("Trendyol push (mock) with", {
    sellerId: creds.sellerId,
    count: products.length,
  });

  // Basit sahte sonuç: her ürünü success kabul edelim
  return products.map((p) => ({
    name: p.name,
    status: "SUCCESS",
    variants: p.variants.map((v) => ({ sku: v.sku, status: "SUCCESS" })),
  }));
}
