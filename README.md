# Little Grain Market
'''
backend/
  app/
    main.py            Creates the FastAPI app and mounts the routers
    config.py          Loads settings from .env
    db.py              Database connection
    models.py          Tables: products, orders, order_items, shop_settings
    schemas.py         API request/response schemas and validation (phone, postal code, etc.)
    security.py        Shop owner login (signed cookies, login rate limiting)
    serializers.py     Database models → API responses
    seed.py            Initial shop settings and sample pieces on first launch
    routers/
      public.py        GET /api/products, /api/settings
      checkout.py      POST /api/checkout, payment results, Stripe webhook
      admin.py         /api/admin/*: login, orders, pieces, photos, shop settings
    services/
      orders.py        Order numbers, stock checks, stock deduction and restocking
      payments.py      Stripe Checkout
      images.py        Photo resizing (longest side 1400px, saved as WebP)
  alembic/             Database migrations
  tests/               pytest tests
frontend/
  src/
    api/               API types and calls
    i18n/              Text in three languages (dict.ts) and language switching
    state/             Shared state: pieces and settings, owner login, toast messages
    cart/              Shopping cart (stored in the browser)
    components/        Header, market countdown, piece cards, piece details, etc.
    pages/             Pieces, custom orders, cart and checkout, payment result
    admin/             Admin panel: login, orders, pieces and inventory, markets and shop
    lib/               Currency and date formatting, form validation, Toronto time zone conversion
    styles/theme.css   Mint green and chocolate 1980s American theme (with dark mode)
  nginx.conf           Production: serves the site and proxies /api and /uploads
docker-compose.yml
.env.example
'''
<img width="1257" height="875" alt="image" src="https://github.com/user-attachments/assets/76cfeb86-1c9a-4726-9db5-9da406d1331c" />
