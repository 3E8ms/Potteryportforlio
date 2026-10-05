import type { Product } from "../api/types";
import { useI18n } from "../i18n/LanguageContext";

/** Product photo, or a striped placeholder with the name's first character. */
export function ProductArt({ product }: { product: Pick<Product, "name" | "image_url" | "tone"> }) {
  const { L } = useI18n();
  const name = L(product.name);
  if (product.image_url) {
    return <div className="art"><img src={product.image_url} alt={name} loading="lazy" /></div>;
  }
  const glyph = (name || "?").replace(/^[《「（(]/, "").charAt(0);
  return (
    <div className={`art tone${product.tone % 4}`} aria-hidden="true">
      <span className="glyph">{glyph}</span>
    </div>
  );
}
