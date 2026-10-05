# 小粒市集 · Little Grain Market

手作小舖網站：作品展示、購物車與 Stripe 付款、客製預訂（Google 表單）、集市倒數、店主後台。支援英文、簡體中文、繁體中文。

| 部分 | 技術 |
|---|---|
| 後端 | Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic |
| 資料庫 | PostgreSQL 16 |
| 前端 | TypeScript · React 18 · Vite |
| 付款 | Stripe Checkout + webhook |
| 部署 | Docker Compose（nginx 提供網站並轉發 `/api`） |

## 快速開始

需要先安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

```bash
cp .env.example .env        # Windows PowerShell: copy .env.example .env
# 打開 .env，至少填 ADMIN_PASSWORD 和 SECRET_KEY
docker compose up --build
```

打開 http://localhost:8080 就是網站，http://localhost:8080/admin 是店主後台。

第一次啟動會自動建立資料表，並加入 7 件標示「示範」的作品。進後台編輯或刪除後就會換成你的作品。

`STRIPE_SECRET_KEY` 留空時是**測試模式**：客人可以走完結帳流程、訂單會建立，但不會扣款。

## 開啟真正的付款

1. 在 [Stripe 後台](https://dashboard.stripe.com/apikeys) 複製 Secret key，填入 `.env` 的 `STRIPE_SECRET_KEY`（測試時用 `sk_test_...`）。
2. 設定 webhook，讓 Stripe 在付款成功時通知網站：
   - **在自己電腦測試：** 執行 `docker compose --profile stripe up`，把 Stripe CLI 印出的 `whsec_...` 填進 `STRIPE_WEBHOOK_SECRET`，再重新啟動。
   - **正式上線：** 在 Stripe 後台 → Developers → Webhooks 新增端點 `https://你的網域/api/stripe/webhook`，勾選 `checkout.session.completed`、`checkout.session.async_payment_succeeded`、`checkout.session.async_payment_failed`、`checkout.session.expired`，把簽章密鑰填進 `STRIPE_WEBHOOK_SECRET`。
3. 把 `FRONTEND_URL` 改成網站的正式網址，上了 https 後把 `COOKIE_SECURE` 改成 `true`。

測試卡號：`4242 4242 4242 4242`，任何未來日期和 CVC。

## 訂單怎麼運作

1. 客人在購物車填收件資料（姓名、電子郵件、10 位數手機、地址、加拿大郵遞區號），確認後按「確認並付款」。
2. 後端再檢查一次資料和庫存，建立「待付款」訂單與訂單號（例如 `XL261017-AB12`），然後把客人轉到 Stripe 付款頁。金額由後端依購物車計算。
3. 付款成功後，Stripe 通知 webhook，訂單自動變成「已付款」並扣庫存。客人回到網站會看到訂單號和明細。
4. 客人沒付款，Stripe 付款頁 1 小時後過期，訂單自動取消，庫存不受影響。

在後台可以搜尋訂單號、姓名或電子郵件，也可以把訂單改成「已寄出」。把已付款訂單改成「已取消」會補回庫存（退款請到 Stripe 後台操作）。付款時庫存已經不夠的訂單會標示「付款時庫存已不足」。

## 客製預訂

在後台「集市與店鋪」貼上 Google 表單連結。要收到新回覆的通知：在 Google 表單「回覆」分頁 → ⋮ → 開啟「接收新回覆的電子郵件通知」。

## 專案結構

```
backend/
  app/
    main.py            建立 FastAPI app、掛上各個 router
    config.py          讀取 .env 設定
    db.py              資料庫連線
    models.py          資料表：products、orders、order_items、shop_settings
    schemas.py         API 輸入輸出格式與驗證（電話、郵遞區號…）
    security.py        店主登入（簽章 cookie、登入次數限制）
    serializers.py     資料表 → API 回應
    seed.py            第一次啟動的店鋪設定與示範作品
    routers/
      public.py        GET /api/products、/api/settings
      checkout.py      POST /api/checkout、付款結果、Stripe webhook
      admin.py         /api/admin/*：登入、訂單、作品、照片、店鋪設定
    services/
      orders.py        訂單號、庫存檢查、扣庫存與補庫存
      payments.py      Stripe Checkout
      images.py        照片縮圖（最長邊 1400px，存成 WebP）
  alembic/             資料庫版本遷移
  tests/               pytest 測試
frontend/
  src/
    api/               API 型別與呼叫
    i18n/              三種語言的文字（dict.ts）與語言切換
    state/             共用資料：作品與設定、店主登入、提示訊息
    cart/              購物車（存在瀏覽器）
    components/        頁首、集市倒數、作品卡片、作品詳情…
    pages/             作品、客製預訂、購物車結帳、付款結果
    admin/             後台：登入、訂單、作品與庫存、集市與店鋪
    lib/               金額與日期格式、表單驗證、多倫多時區換算
    styles/theme.css   薄荷綠與巧克力色的 80 年代美式主題（含深色模式）
  nginx.conf           正式環境：提供網站並轉發 /api、/uploads
docker-compose.yml
.env.example
```

## 不用 Docker 開發

需要 Python 3.11 以上、Node 20 以上、一個 PostgreSQL 資料庫。

```bash
# 後端（http://localhost:8000，API 文件在 /docs）
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
export DATABASE_URL=postgresql+psycopg://xiaoli:xiaoli@localhost:5432/xiaoli
export ADMIN_PASSWORD=your-password FRONTEND_URL=http://localhost:5173
alembic upgrade head && python -m app.seed
uvicorn app.main:app --reload

# 前端（http://localhost:5173，會把 /api 轉到 :8000）
cd frontend
npm install
npm run dev
```

## 測試

```bash
cd backend && pytest                 # 沒設定 TEST_DATABASE_URL 時用 SQLite
TEST_DATABASE_URL=postgresql+psycopg://.../xiaoli_test pytest   # 用真的 Postgres 測（會清空該資料庫）
cd frontend && npm test && npm run typecheck
```

## 改資料表

修改 `backend/app/models.py` 之後：

```bash
cd backend
alembic revision --autogenerate -m "說明這次改了什麼"
alembic upgrade head
```

Docker 版本每次啟動都會自動執行 `alembic upgrade head`。

## 備份

```bash
docker compose exec db pg_dump -U xiaoli xiaoli > backup.sql
```

作品照片存在 Docker volume `uploads`，資料庫存在 `pgdata`。
