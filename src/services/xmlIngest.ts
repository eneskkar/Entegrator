// src/services/xmlIngest.ts
import { XMLParser } from "fast-xml-parser";

export type RawXml = any;

export type GuessMap = {
  name: string;
  brand?: string;
  sku: string;
  barcode?: string;
  price: number;
  stock: number;
  attrs?: Record<string, any>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
});

/**
 * URL'den gelen XML stringini objeye çevirir.
 */
export function parseXml(xmlString: string): RawXml {
  return parser.parse(xmlString);
}

/**
 * Bir ürün kaydındaki alan isimleri farklı olabileceği için
 * en yaygın isimleri tahmin ederek tek tipe dönüştürüyoruz.
 * (Gerçek XML alanlarına göre burada anahtarları güncelleyebilirsin.)
 */
export function normalizeItem(it: any): GuessMap | null {
  // Zorunlular
  const name = it["urun_adi"]?.toString().trim();
  const sku = (it["urun_kod"] ?? it["barkod"])?.toString().trim(); // SKU yoksa barkod fallback

  // Fiyat (KDV hariç + kdv yüzdesi -> KDV dahil)
  const fiyatKdvHaric = Number(it["fiyat_kdv_haric"] ?? 0);
  const kdv = Number(it["kdv"] ?? 0); // ör: 20 => %20
  const price = Number((fiyatKdvHaric * (1 + kdv / 100)).toFixed(2));

  // Stok
  const stock = Number(it["adet"] ?? 0);

  // Opsiyoneller
  const brand = it["marka"]?.toString().trim();
  const barcode = it["barkod"]?.toString().trim();

  // Görseller / kategori / açıklama gibi ekstra alanları attrs içine atabiliriz
  const attrs: Record<string, any> = {
    categoryPath: it["kategori"],
    descriptionHtml: it["urun_aciklama"],
    images: [it["resim_1"], it["resim_2"], it["resim_3"]].filter(Boolean),
    desi: it["desi"],
    kdvPercent: kdv,
    priceExclVat: fiyatKdvHaric
  };

  if (!name || !sku || Number.isNaN(price)) return null;

  return { name, brand, sku, barcode, price, stock, attrs };
}

/**
 * XML kök yapısı farklı olabilir; en yaygın kalıpları dener.
 * Örn: { products: { product: [...] } } ya da { urunler: { urun: [...] } }
 */
export function extractItems(root: any): any[] {
  const candidates = [
    ["products", "product"],
    ["urunler", "urun"],
    ["items", "item"],
    ["catalog", "product"],
  ];

  for (const [top, child] of candidates) {
    const node = root?.[top]?.[child];
    if (Array.isArray(node)) return node;
    if (node) return [node];
  }

  // kökten dizi gelirse
  if (Array.isArray(root)) return root;

  // düz obje ise tüm alt alanları karıştır
  for (const key of Object.keys(root || {})) {
    const v = root[key];
    if (Array.isArray(v)) return v;
    if (v?.length && typeof v !== "string") return v;
  }

  return [];
}
