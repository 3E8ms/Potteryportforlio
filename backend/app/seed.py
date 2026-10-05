"""Fill an empty database with shop settings and example products.

Run with `python -m app.seed`. Does nothing if products already exist.
Example products are flagged is_sample and shown with an "Example" badge.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from .config import get_settings
from .db import SessionLocal
from .models import Product, ShopSettings


def t(en: str, hans: str, hant: str) -> dict:
    return {"en": en, "hans": hans, "hant": hant}


SETTINGS = dict(
    name=t("Little Grain Market", "小粒市集", "小粒市集"),
    tagline=t("Handmade · Prints · Zines · Ottawa", "手作・印刷・小志 · 渥太华", "手作・印刷・小誌 · 渥太華"),
    market_at=datetime(2026, 10, 17, 10, 0, tzinfo=ZoneInfo("America/Toronto")),
    market_place=t(
        "Lansdowne Weekend Market (example, edit in the back office)",
        "兰斯当公园周末市集（示范，请在后台修改）",
        "蘭斯當公園週末市集（示範，請在後台修改）",
    ),
    form_link="",
)

POSTCARDS = t("Postcards", "明信片", "明信片")
GOODS = t("Goods", "周边", "周邊")
CITY = t("City", "城市", "城市")
SEASONS_T = t("Seasons", "四季", "四季")
FOOD = t("Food", "食物", "食物")

PRODUCTS = [
    dict(year=2026, season="spring", price_cents=1800, stock=24, tone=0,
         name=t("Ottawa Four Seasons Postcards (set of 8)", "渥太华四季明信片（8 张组）", "渥太華四季明信片（8 張組）"),
         type=POSTCARDS, theme=CITY,
         description=t("Eight street scenes, from spring in the ByWard Market to winter on Parliament Hill. 350gsm matte card with a writable back.",
                       "八张城市街景，从拜沃德市场的春天到冬天的国会山。350 克哑光卡纸，背面可书写。",
                       "八張城市街景，從拜沃德市場的春天到冬天的國會山。350 克霧面卡紙，背面可書寫。")),
    dict(year=2025, season="winter", price_cents=3500, stock=6, tone=1,
         name=t("Rideau Canal Winter Night, A4 Giclée Print", "丽都运河冬夜 A4 艺术微喷", "麗都運河冬夜 A4 藝術微噴"),
         type=t("Prints", "印刷品", "印刷品"), theme=SEASONS_T,
         description=t("The canal at night after the freeze. A4 giclée on cotton paper, signed and numbered, limited to 30.",
                       "运河结冰后的夜景，A4 棉纸微喷，附签名与编号，限量 30 张。",
                       "運河結冰後的夜景，A4 棉紙微噴，附簽名與編號，限量 30 張。")),
    dict(year=2026, season="summer", price_cents=600, stock=40, tone=2,
         name=t("Cat Days Waterproof Stickers", "猫咪日常防水贴纸", "貓咪日常防水貼紙"),
         type=t("Stickers", "贴纸", "貼紙"), theme=t("Cats", "猫", "貓"),
         description=t("Everyday faces of the cat at home. Six stickers per sheet, waterproof matte, good for bottles and laptops.",
                       "家里那只猫的日常表情，一张 6 枚，防水哑光，可贴水瓶和笔记本电脑。",
                       "家裡那隻貓的日常表情，一張 6 枚，防水霧面，可貼水瓶和筆電。")),
    dict(year=2024, season="autumn", price_cents=1200, stock=0, tone=3,
         name=t("Market Mornings, a Handmade Zine", "《市场早晨》手工小志", "《市場早晨》手工小誌"),
         type=t("Zines", "小志", "小誌"), theme=FOOD,
         description=t("A 24-page saddle-stitched zine about the bread, apples and coffee at the Saturday morning market.",
                       "24 页骑马钉小志，记录周六早上市集摊位的面包、苹果和咖啡。",
                       "24 頁騎馬釘小誌，記錄週六早上市集攤位的麵包、蘋果和咖啡。")),
    dict(year=2026, season="autumn", price_cents=2800, stock=3, tone=0,
         name=t("Mint Chocolate Tote Bag", "薄荷巧克力帆布袋", "薄荷巧克力帆布袋"),
         type=GOODS, theme=FOOD,
         description=t("12oz heavy canvas with a two-colour screen print. Fits an A4 folder.",
                       "12 盎司厚帆布，丝印双色图案，可放 A4 文件夹。",
                       "12 盎司厚帆布，絹印雙色圖案，可放 A4 資料夾。")),
    dict(year=2025, season="autumn", price_cents=1500, stock=9, tone=1,
         name=t("Maple Season Wooden Keychain", "枫叶季木刻钥匙圈", "楓葉季木刻鑰匙圈"),
         type=GOODS, theme=SEASONS_T,
         description=t("Laser-engraved maple wood. Every grain is different.",
                       "枫木激光雕刻，每个木纹都不一样。",
                       "楓木雷射雕刻，每個木紋都不一樣。")),
    dict(year=2024, season="summer", price_cents=400, stock=30, tone=2,
         name=t("Corner Café Film Postcard", "街角咖啡馆胶片明信片", "街角咖啡館底片明信片"),
         type=POSTCARDS, theme=CITY,
         description=t("Shot on 35mm film at a little corner café in the Glebe.",
                       "35 毫米胶片拍摄，格力布街角的一间小咖啡馆。",
                       "35 毫米底片拍攝，格力布街角的一間小咖啡館。")),
]


def run() -> None:
    with SessionLocal() as db:
        if db.get(ShopSettings, 1) is None:
            db.add(ShopSettings(id=1, **SETTINGS))
            print("Created shop settings.")
        if get_settings().seed_sample_data and not db.scalar(select(func.count()).select_from(Product)):
            db.add_all(Product(**p, is_sample=True) for p in PRODUCTS)
            print(f"Added {len(PRODUCTS)} example products.")
        db.commit()


if __name__ == "__main__":
    run()
