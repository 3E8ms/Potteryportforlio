# Little Grain Market


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
<img width="1257" height="875" alt="image" src="https://github.com/user-attachments/assets/76cfeb86-1c9a-4726-9db5-9da406d1331c" />
