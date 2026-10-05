"""Product photo storage: resize uploads and keep them under UPLOAD_DIR/products."""
import io
import uuid
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from ..config import get_settings

MAX_SIDE = 1400
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "MPO"}


class ImageError(Exception):
    pass


def upload_root() -> Path:
    root = Path(get_settings().upload_dir)
    (root / "products").mkdir(parents=True, exist_ok=True)
    return root


def save_product_image(product_id: int, data: bytes) -> str:
    """Resize and save as WebP. Returns the path relative to the upload root."""
    try:
        img = Image.open(io.BytesIO(data))
        fmt = img.format
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageError("unreadable_image") from exc
    if fmt not in ALLOWED_FORMATS:
        raise ImageError("unsupported_format")
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    rel = f"products/{product_id}-{uuid.uuid4().hex[:10]}.webp"
    img.save(upload_root() / rel, "WEBP", quality=82, method=6)
    return rel


def delete_image(rel: str | None) -> None:
    if not rel:
        return
    root = upload_root().resolve()
    path = (root / rel).resolve()
    if root in path.parents and path.is_file():
        path.unlink()


def image_url(rel: str | None) -> str | None:
    return f"/uploads/{rel}" if rel else None
