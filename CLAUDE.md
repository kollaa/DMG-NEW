# CLAUDE.md — DMG PrintFX (Marketing Materials Hub)

Internal ordering app for Holden Conner's marketing materials (business cards, rack cards,
door hangers, ...) across companies Scott, Holden Conner, Holden Conner Land, Greenway, Precise.
Flow: company → category tiles → products → order (customized preview) → cart → admin approval → payment.

**Never commit secrets.** No passwords, app passwords, or `JWT_SECRET` in any file.
All secrets live in Azure App Service environment variables (see below).

---

## Repo layout

```
DMG-NEW/                         (GitHub: kollaa/DMG-NEW, branch: Developer — NOT main)
├── .github/workflows/
│   ├── developer_dmg-printfx-api.yml          backend → App Service (lowercase "d")
│   └── azure-static-web-apps-icy-moss-*.yml   frontend → Static Web App
├── Backend/Printfx/             Spring Boot (Maven, runnable jar)
│   └── src/main/java/com/dmg/spring/Printfx/
│       ├── authentication/   SecurityConfig, JwtAuthenticationFilter, JWTUtil
│       ├── config/           SchedulingConfig (@EnableScheduling)
│       ├── controller/ model/ repository/ service/
│       └── util/             ThumbnailUtil, ShrinkExistingThumbnails
└── Frontend/my-printfx/         Angular (standalone components, @if/@for syntax)
```

Git: `git push origin Developer`. Azure commits workflow files to the repo, so always
`git pull --no-rebase origin Developer` before pushing. If the pull opens an editor, close it
(VS Code `MERGE_MSG` tab, or `Esc` → `:wq`).

---

## Stack

- **Backend:** Spring Boot 3.4.1, Java 21, Spring Security 6.4, Hibernate 6.6, jjwt 0.11,
  MySQL Connector/J 9.1. `spring.jpa.hibernate.ddl-auto=update`.
- **Frontend:** Angular, `@angular-devkit/build-angular:application` builder. **SSR is
  disabled** (Static Web Apps can't run it) — don't re-add `server`/`ssr`/`outputMode`
  to `angular.json` or `provideClientHydration()`.
- **DB:** MySQL 8.4 on Azure; MySQL 8.0 locally. Schema name `dmg`.

---

## Azure (subscription "Marketing Dashboard", resource group `dmg-printfx-rg`)

| Part | Resource | URL / host | Region / plan |
|---|---|---|---|
| Frontend | Static Web App `dmg-printfx-web` | https://marketingstore.holdenconner.com (custom domain), https://icy-moss-0bdf6540f.1.azurestaticapps.net | Global, Free |
| Backend | App Service `dmg-printfx-api` (Linux, Java 21 SE) | https://dmg-printfx-api-dxbwebbreshhhqgf.centralus-01.azurewebsites.net | Central US, Basic B1 |
| Database | MySQL Flexible Server `dmg-printfx-rg` | dmg-printfx-rg.mysql.database.azure.com, admin `marketing_admin` | East US, Burstable B1ms |

- App Service settings: **Always On = On**, **Health check** on `/api/customers/company`
  (the per-minute `select ... from companies` lines in the log are this). Application
  Insights disabled (it slowed startup on B1).
- B1 quota is 0 in East US for this subscription — that's why the App Service is in Central US.
  Backend (Central US) ↔ DB (East US) adds ~25–30 ms per query; co-locating them is a
  known future speed-up.
- Custom domain CNAME managed by Holden Conner IT (Matthew Turner). The domain must be typed
  without a trailing dot, or Chrome shows `ERR_CERT_COMMON_NAME_INVALID`.
- MySQL networking: "Allow public access from any Azure service" must stay **checked**.
  Developer PCs need their current IP added (Networking → + Add current client IP);
  it changes when you switch networks. Cloud Shell avoids the firewall entirely.
- Logs: App Service → Advanced Tools (Kudu) → Browse Log Files → newest `*_default_docker.log`.
  `[Previous Container] ... NoClassDefFoundError: ch/qos/logback...` on shutdown is harmless.

### App Service environment variables (names only)

| Name | Purpose |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://dmg-printfx-rg.mysql.database.azure.com:3306/dmg?sslMode=REQUIRED&serverTimezone=UTC` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Azure MySQL admin |
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | Gmail SMTP (app password) |
| `DMG_APPROVAL_EMAIL` | Inbox for approval emails |
| `CORS_ALLOWED_ORIGINS` | Comma-separated, no spaces, no trailing slash: SWA URL + custom domain |
| `FRONTEND_URL` | Link used inside emails (custom domain) |
| `JWT_SECRET` | Base64 HMAC key (`openssl rand -base64 48`). **Must be set**: without it every restart/deploy logs everyone out and requests fail with 403. Startup log warns `JWT_SECRET is not set` if missing |
| `WEBSITES_CONTAINER_START_TIME_LIMIT` | `600` |
| `SHOW_SQL` | optional; `true` turns on Hibernate SQL logging (off by default) |

---

## Configuration conventions

`application.properties` uses `${ENV_VAR:local-default}` placeholders so one file works
locally and on Azure. Local defaults point at `localhost:3306/dmg`. Never hardcode Azure
values or secrets there. Key settings:

- `app.cors.allowed-origins`, `app.frontend-url`, `dmg.approval-email`
- `spring.jpa.show-sql=${SHOW_SQL:false}`
- Hikari keep-alive (Azure drops idle connections after ~4 min; without this the first
  request after idle fails with 500):
  `keepalive-time=120000`, `max-lifetime=600000`, `connection-timeout=10000`
- **Leave `spring.jpa.open-in-view` ON (default).** Company → products are lazy-loaded while
  the JSON response is written; turning it off breaks the dashboard.

Locally, set `JWT_SECRET` (and optionally `SHOW_SQL=true`) in Eclipse Run Configurations →
Environment so backend restarts don't invalidate your login token.

### Frontend environments (non-standard location)

- Files live in **`src/app/environments/`** (not `src/environments/`).
- `environment.ts` = **production** (Azure backend URL). `environment.development.ts` = local
  (`http://localhost:8080`). `angular.json` swaps them for the *development* config.
- Services are in **`src/service/`** and build URLs as `` `${environment.apiUrl}/api/...` ``
  — **backticks**, not quotes. Never hardcode `localhost:8080`.
- `src/staticwebapp.config.json` provides SPA fallback (deep links / refresh).
- Guards: `authGuard`, `authLoginGuard` in `src/app/`; `adminGuard` in `src/app/guards/`.
- Build output: `dist/my-printfx/browser`.

### Frontend routes (`app.routes.ts`)

| Path | Component | Guard |
|---|---|---|
| `login`, `signup` | Login / Signup | authLoginGuard |
| `forgotpassword`, `password-reset`, `verify-otp` | — | public |
| `dashboard` | PrintFx (company tiles) | auth |
| `products/:id` | **Categories** (category tiles for a company) | auth |
| `products/:id/category/:categoryId` | Products (`all` / `uncategorized` / id) | auth |
| `order/...`, `cart`, `checkout`, `payment/:id` | ordering flow | — |
| `addcompany`, `addproduct/:id` | admin forms | auth + admin |
| `admin/users` | Pending signups | auth + admin |
| `admin/manage-users` | **Users** (list/add/role/reset/delete) | auth + admin |

Only one route per path — Angular uses the first match. The admin's email in the navbar links
to `admin/manage-users`. Admin-only buttons (Add Company, Add Product) are hidden with
`isAdmin` from `localStorage` (set at login); the backend is the real enforcement.

---

## Domain model essentials

### Users (`Users` entity → table `user`, columns prefixed `us_`)
- Login identity is `Users.username` (= email, column `us_name`). **`Customer` entity is
  not used for login.**
- `Users.id` is an **int**, but `UserRepository extends JpaRepository<Users, Long>` —
  don't use `findById(Long)`; use `findUserById(int)`.
- `us_status`: `PENDING` / `APPROVED` / `REJECTED`. **NULL = legacy account = approved.**
- `us_approve` is an older unrelated column — leave it alone.
- Passwords: BCrypt. Login still accepts legacy plain-text passwords and upgrades them on
  successful login. Password reset (user OTP flow or admin) saves a hash.

### Roles (`role` / `user_role`, columns `ro_*` / `ur_*`)
- `ADMIN` and `CUSTOMER` (shown as **"Viewer"** in the UI). One role per user.
- `role.ro_name` has a **unique key** (`uk_role_name`) after the duplicate-ADMIN cleanup;
  lookups use `RoleRepository.findFirstByNameOrderByIdAsc` to stay safe either way.
- Admin check: role name `ADMIN` or `ROLE_ADMIN`, case-insensitive
  (`UserService.isAdmin`, `NotificationService.isAdmin` — keep them consistent).
- Role is read at login (`admin` flag in the login response) — users must log in again after
  a role change.

### Signup & user management
- `POST /api/customers/signup` (public) → `PENDING` + CUSTOMER role; admins notified (bell +
  email). Pending/rejected users get 403 with a message at login.
- Admin endpoints (`AdminUserController`, all check ADMIN in code):
  `GET /api/admin/users`, `POST /api/admin/users` (create, active immediately),
  `PUT /{id}/role` (`ADMIN`/`VIEWER`), `PUT /{id}/password`, `DELETE /{id}`
  (`?deleteOrders=true` required if the user has orders; returns 409 with `orderCount`),
  `GET /pending`, `POST /{id}/approve`, `POST /{id}/reject`.
- Rules: can't demote/delete yourself; can't remove the last admin.

### Categories
- `category` (company_id, name, display_order, unique company+name) and `product_category`
  (product_id unique, category_id). Categories live outside `Product`; native queries join the
  `products` table.
- `CategoryController` under `/api/companies/{companyId}/categories` (GET public; POST/PUT/DELETE
  admin via SecurityConfig). Scott's 18 categories seeded by `scott-categories.sql`.
- Deleting a category moves its products to "Uncategorized" (admins only see that tile).
- Gap: Add Product has no category dropdown yet — new products land in Uncategorized.

### Product order forms (`products.order_config`, TEXT JSON)
- Each product can carry a JSON config that drives the order page (`order.component.ts`,
  types in `src/Bean/order-config.ts`). **NULL = the original business-card / rack-card form**
  (Holden Conner, Precise, ... products and Scott's old "Door Hanger" / "Rack Cards").
- Keys: `mode` (`order` | `download` | `both`), `fields[]` `{key, label, type, required, options}`
  (types text/email/tel/textarea/select/date/time), `quantities[]` (omitted = free number box),
  `unitPrice` (× quantity; omitted = tier price if `quantities`, else "Price TBD" / price 0),
  `downloads[]` `{label, url}`, `overlay` (`business-card` | `info-band` | `slots`), `note`,
  `gallery[]` `{label, url}` (extra preview pictures shown as buttons under the preview, e.g.
  brochure Outside / Inside) and `frontLabel` (button label for `image_url`, default "Front").
  `backImages` `{ "<option>": "/images/x.jpg" }` + optional `backField` (default `backOption`):
  the Back preview follows the chosen option (Business Cards: Standard / DEF / Feed & Fertilizer).
  `frontImages` + optional `frontField` (default `location`) does the same for the front:
  Invoice Door Hanger has 22 location versions (`sp-invoice-door-hanger-<first-location>.jpg`,
  cropped from `artwork-originals/scott/SP-invoice-door-hangers.pdf` pages 1-22; shared back
  `sp-invoice-door-hanger-back.jpg`, labelled "Inside Front" via `backLabel`; front = "Front Pocket"). Page 5 artwork prints "Summer"; option says "Sumner".
  Eclipse runs from `target/classes`: after adding images, refresh the project (F5) or copy them.
  Back pictures: `static/images/sp-business-card-back-{standard,def,feed-fertilizer}.jpg`, rendered
  from the PDFs in `artwork-originals/scott/business-card-backs/` (crop marks trimmed).
- `mode: download` → no Save/Add to Cart; products list shows a "Download" button.
  `overlay: info-band` or `slots` adds "Download my version (PNG)". `slots[]` (with `slotWidth`, default 1000)
  writes field values over the picture's sample text: `{text:"{date} | {time}", box:[x,y,w,h], x, y, size, ...}`;
  the box is wiped (blended from rows above/below) only when one of its fields is filled. Used by the
  Customer Appreciation Day flyer (cust-app-flyer.jpg, 1000x1000) and Business Cards front
  (`sp-business-card-front.jpg` 1050x630 from `artwork-originals/scott/drew-slater-sp-business-card.pdf`
  page 1; slotWidth 1050; fonts Oswald (name) + Poppins, loaded in index.html; positions calibrated
  so typing the sample details reproduces the artwork). `minPreviewWidth` draws a small picture larger.
  Windows.Data.Pdf renders CMYK navy as purple (61,49,99): card front + 3 backs were colour-corrected
  to the PDF-viewer colours (navy 47,52,124) with a ColorMatrix. Other PDF renders (door hangers,
  folder, bill inserts, brochure spreads, rack card) were corrected the same way (scratchpad
  colorfix.ps1). Maps were left as is. New PDF renders: check navy (61,49,99 = needs the fix).
  Only these two print typed text; other products' fields are delivery info and stay off the artwork.
- `/files/**` responses carry `Content-Disposition: attachment` (FileDownloadConfig) so links save
  the file instead of opening it (the `download` attribute is ignored cross-origin).
  Logos: two products, "Scott Petroleum Logo (PDF)" (2 files) and "(PNG)" (8 files), files in
  `static/files/scott/logos/`. The SQL renames the old single "Scott Petroleum Logo" to (PDF).
  Tank Monitoring Rack Card reuses the Ag Irrigation rack card pictures for now.
  Downloads can be previewed: clicking a file name shows `preview` (default: the file itself if it is
  an image) on the canvas; `dark: true` puts it on navy (all-white logos). The icon saves the file.
- Saved `formDetails` = field values + `summary: [{label, value}]`; the cart and the approval
  email show `summary`, so they don't need per-product code.
- Download files are served by the backend from `classpath:/static/files/` at `/files/**`
  (public, like `/images/**`); config URLs starting with `/` get `environment.apiUrl` prefixed.
- Products with no `image_url` show a "Preview coming soon" placeholder (list and canvas).
- No admin UI for configs yet — edit via SQL. `ProductService.updateProduct` only overwrites
  `orderConfig` when the request sends one.

### Scott Petroleum (SP) product listing
- Source: marketing's "SP Product Listing.docx". Seeded by
  `Backend/Printfx/sql/sp-product-listing.sql` into company **Scott** (idempotent: matches by
  company + product name, refreshes config; also adds the `order_config` column if missing).
- 33 new products + the existing "Business Cards" (now SP fields: name, title, location address,
  phone, email, back option, division, shipping). Common SP fields: Quantity, Contact Name,
  (Division), Email, Shipping Address. Banner $49.99 each; everything else "Price TBD".
- Download-only: Letterhead, Logo (PDF/PNG), 4 Maps, PowerPoint template, Flyer (customized PNG).
  Customer Portal Guide is order **and** download. Folders and Information Guides stay separate
  categories (not under Flyers; user decision 2026-11-19), display_order 8 and 9. Folder pictures: `sp-folder-{front,back,flat}.jpg` from the folder PDF.
- Pictures so far (2026-11-18): banner, both bill inserts, all 3 brochures (mockups), location-
  specific + missed-service + invoice door hangers, envelope, flyer, customer portal guide,
  letterhead, business card backs, 4 maps (preview + PDF download in `static/files/scott/`).
  Still needed from marketing: pictures for
  notecard, promotional products, Tank Monitoring rack card (uses the Ag one for now)
  (→ `static/images/` + a line in `sp-product-images.sql`), the letterhead .docx download (→ `static/files/scott/`),
  prices, Tank Monitors Bill Insert artwork (product exists, no picture), Bill Insert "autofill/autobill" question, folder/banner mockups.
  "Promotional Cards" category isn't in the listing (empty).

### Orders
- `orders.thumbnail_data_url` / `_back` are **LONGTEXT** data-URL previews.
- `Order` `@PrePersist/@PreUpdate` call `ThumbnailUtil.shrink()` → JPEG ≤500 px wide
  (~30–60 KB). `ShrinkExistingThumbnails` (ApplicationRunner, background thread) shrinks any
  old large rows on startup; logs "Shrinking preview images for N existing order(s)".
- The orders list endpoint returns thumbnails for every order → keep them small.

### Notifications (`notification` table)
- Types: `approval_request` (order, to admins), `rejection_notice` (to requester),
  `signup_request` (to admins, `related_user_id`, `order_id` NULL — column made nullable by SQL).
- One row per recipient. Column `is_read` (`read` is a MySQL reserved word).
- **Real-time:** SSE at `GET /api/notifications/stream?token=...`. `NotificationStreamService`
  pushes after DB commit; 25 s heartbeat (`@Scheduled`). The JWT filter accepts `?token=`
  **only** for the stream path. Frontend `NotificationService.connect()/disconnect()` plus a
  60 s polling backup. Single-instance assumption.

---

## Security rules (`SecurityConfig`)

- Public: login, signup, forgot-password, verify-otp, password-reset, `/images/**`,
  `/assets/**`, `/error`, OPTIONS, ASYNC/ERROR dispatches.
- Company/product/category paths (`/api/customers/company[/**]`, `/api/customers/companies`,
  `/api/companies/**`): **GET public**, POST/PUT/PATCH/DELETE **admin only**.
- `/files/**` (downloadable artwork) is public, same as `/images/**`.
- Everything else requires a valid JWT.
- `/error` must stay public, otherwise real 404/500s show up as 403.
- CORS is global (`app.cors.allowed-origins`); don't add `@CrossOrigin("localhost")` to controllers.

---

## Database rules

- `ddl-auto=update` adds tables/columns on startup but **never changes existing columns or
  constraints**. Those need manual SQL — run on **both** Local and Azure, **before** deploying
  code that depends on them.
- Local and Azure databases are separate; Azure is the source of truth.
  **Never re-import a local dump into Azure.**
- Older product/company image URLs are absolute (Azure rows point at the App Service host). If
  the backend hostname changes, `UPDATE ... SET image_url = REPLACE(image_url, '<old>', '<new>')`.
- **New product images use relative paths** (`/images/x.jpg`): the frontend `ProductService`
  prefixes `environment.apiUrl`, so the same SQL works locally and on Azure. SP pictures are set
  by `Backend/Printfx/sql/sp-product-images.sql` — add a line there for each new picture.
- Keep web images ~1400–1600 px wide and under ~300 KB; keep print-size originals out of
  `static/images/` (everything there ships in the jar and is public). Originals go in
  `artwork-originals/<company>/` at the repo root, which is git-ignored. PDFs must be converted to
  JPG/PNG first (front = page 1, back = page 2).
- Images are served from the jar: `classpath:/static/images/` (must be committed to git).

Manual SQL already applied (re-check on any new database):
`notification.order_id` nullable; `orders.thumbnail_*` LONGTEXT; role de-duplication +
`uk_role_name`; CUSTOMER-role backfill for signups; Scott categories seed.
`sp-product-listing.sql`: applied **locally** (2026-11-16); **not yet on Azure**.
`sp-product-images.sql`: applied **locally** (2026-11-17); **not yet on Azure** (run after the listing).

---

## Deploy

1. Push to `Developer`.
2. Backend workflow runs when `Backend/**` or `.github/workflows/**` change
   (`mvn clean package -DskipTests` in `Backend/Printfx`). Frontend workflow runs on push.
3. Check GitHub Actions for green ✓, then test the live site.

Linux build servers are **case-sensitive**: file names and import paths must match exactly
(e.g. `signup.service.ts`, `Bean/Category.ts` only if the file really is `Category.ts`).

---

## Known gotchas

- No `console.log`/`System.out.println` of passwords, tokens, or OTPs.
- Backend needs **JDK 21** (`release version 21 not supported` = Maven is on an older JDK; set
  `JAVA_HOME` to `C:\Program Files\Java\jdk-21`). Port 8080 may already be in use by the
  backlog-project API in Eclipse.
- Chrome autofill isn't seen by Angular on the first click; `login.component.ts` reads the
  input values directly before validating.
- Spring returns 403 instead of the real error if `/error` isn't permitted.
- Hibernate silently skips creating a table if a column name is a reserved word.
- Azure 503 = app not starting; read the Kudu docker log (DB firewall → `Connect timed out`;
  missing env vars → `Connection refused` to localhost).
- `NonUniqueResultException` on a lookup = duplicate rows in a table that should be unique.

---

## Pending / open items

Manual steps to verify:
- [ ] `JWT_SECRET` and `FRONTEND_URL` set on the App Service (last checked log still warned)
- [ ] Thumbnail compression files deployed (look for the "Shrinking preview images" log line)
- [ ] Old Gmail app password revoked; repo made Private; exposed login password changed
- [ ] Remaining password/token `console.log`s removed

Features / improvements:
- Run `sp-product-listing.sql` on Azure after deploying; add SP artwork + download files.
- Admin UI for product `order_config` (Add Product page is still a stub).
- Category dropdown on Add Product; categories for companies other than Scott.
- Order approve/reject/pay endpoints don't check ADMIN server-side.
- "Session expired" handling (auto-logout on 401/403) in the frontend.
- Optional "Deactivate user" (block login, keep order history) alongside Delete.
- Company list N+1 queries (1 per company); co-locate backend and DB regions.
- Move order previews / uploaded product images to Azure Blob Storage.
- No real payment gateway; rejected orders not shown in the UI.
