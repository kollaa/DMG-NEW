-- ============================================================================
-- Scott Petroleum (SP) product listing  ->  company "Scott"
--
-- Source: "SP Product Listing.docx" (marketing). Adds every product from the
-- listing to its category, with the order form each one needs (stored as JSON
-- in products.order_config, read by the Angular order page).
--
-- Safe to run more than once: products are matched by (company, name); an
-- existing product gets its description/order form refreshed, never duplicated.
-- Run on BOTH Local and Azure (MySQL Workbench or the mysql client).
--
-- After running:
--   * Products have no artwork yet (image_url NULL -> "Preview coming soon"
--     tile). Add a PNG to Backend/Printfx/src/main/resources/static/images/
--     and set it, e.g.
--       UPDATE products SET image_url = '<backend-host>/images/SP-Agriculture-Brochure.png'
--       WHERE name = 'Agriculture Brochure';
--   * Download files are served from Backend/Printfx/src/main/resources/static/files/scott/
--     (commit them; the jar serves /files/**). Expected file names:
--       Scott-Petroleum-Letterhead.docx, Scott-Petroleum-Logo.pdf, Scott-Petroleum-Logo.png,
--       SP_FullMap-Final.pdf, SP_MSMapComp.pdf, SP_LAMapComp.pdf, SP_ARMapComp.pdf,
--       scott-powerpoint-template.pptx, cust-portal-guide.jpg
--
-- order_config keys: mode (order | download | both), fields[] {key, label, type,
-- required, options}, quantities[] (omit = free number box), unitPrice (omit =
-- "Price TBD", priced at approval), downloads[] {label, url}, overlay, note.
-- ============================================================================

-- MySQL Workbench "Safe Updates" mode blocks UPDATEs by name; allow them here.
SET SQL_SAFE_UPDATES = 0;

-- 1. Column for the order form (Hibernate also adds it on startup; this makes
--    the script work before the new backend has been deployed).
SET @has_col := (SELECT COUNT(*) FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'products'
                   AND column_name = 'order_config');
SET @ddl := IF(@has_col = 0, 'ALTER TABLE products ADD COLUMN order_config TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Helper: create/refresh one product and put it in its category.
DROP PROCEDURE IF EXISTS dmg_upsert_product;
DELIMITER //
CREATE PROCEDURE dmg_upsert_product(
    IN p_company  BIGINT,
    IN p_category VARCHAR(100),
    IN p_name     VARCHAR(255),
    IN p_desc     VARCHAR(255),
    IN p_config   TEXT)
BEGIN
    DECLARE v_cat  BIGINT DEFAULT NULL;
    DECLARE v_prod BIGINT DEFAULT NULL;

    SELECT id INTO v_cat FROM category
     WHERE company_id = p_company AND name = p_category LIMIT 1;
    IF v_cat IS NULL THEN
        INSERT INTO category (company_id, name, display_order)
        SELECT p_company, p_category, COALESCE(MAX(display_order), 0) + 1
          FROM category WHERE company_id = p_company;
        SET v_cat = LAST_INSERT_ID();
    END IF;

    SELECT id INTO v_prod FROM products
     WHERE company_id = p_company AND name = p_name ORDER BY id LIMIT 1;
    IF v_prod IS NULL THEN
        INSERT INTO products (company_id, name, description, order_config)
        VALUES (p_company, p_name, p_desc, p_config);
        SET v_prod = LAST_INSERT_ID();
    ELSE
        UPDATE products
           SET description  = COALESCE(p_desc, description),
               order_config = p_config
         WHERE id = v_prod;
    END IF;

    INSERT INTO product_category (product_id, category_id)
    VALUES (v_prod, v_cat)
    ON DUPLICATE KEY UPDATE category_id = VALUES(category_id);
END //
DELIMITER ;

-- 3. Shared pieces of the order forms.
SET @company := (SELECT id FROM companies WHERE name = 'Scott' LIMIT 1);

SET @contact  := '{"key":"contactName","label":"Contact Name","required":true}';
SET @division := '{"key":"division","label":"Division","required":true}';
SET @email    := '{"key":"email","label":"Email","type":"email","required":true}';
SET @shipping := '{"key":"shippingAddress","label":"Shipping Address","type":"textarea","required":true}';

-- Quantity + Contact Name + Division + Email + Shipping Address
SET @order_div := CONCAT('{"mode":"order","fields":[', @contact, ',', @division, ',', @email, ',', @shipping, ']}');
-- Quantity + Contact Name + Email + Shipping Address
SET @order     := CONCAT('{"mode":"order","fields":[', @contact, ',', @email, ',', @shipping, ']}');

-- 4. Products, in the order of the listing.

-- Banner Stands
CALL dmg_upsert_product(@company, 'Banner Stands', 'General Table Top Banner',
  '',  -- no description line (user request); price shows in the header
  CONCAT('{"mode":"order","unitPrice":49.99,"frontLabel":"Banner Stand","gallery":[',
         '{"label":"Banner Artwork","url":"/images/sp-table-top-banner-artwork.jpg"}],"fields":[',
         '{"key":"equipment","label":"Equipment needed?","type":"select","required":true,',
         '"options":["Yes - banner stand and insert","Insert only"]},',
         @contact, ',', @division, ',', @email, ',', @shipping, ']}'));

-- Bill Inserts
CALL dmg_upsert_product(@company, 'Bill Inserts', 'Ag Irrigation Rentals Bill Insert',
  'Statement stuffer for ag irrigation rentals.', @order_div);
CALL dmg_upsert_product(@company, 'Bill Inserts', 'Customer Portal Bill Insert',
  'Bill stuffer promoting the customer portal.', @order_div);
-- Listing: "Tank Monitors – can we create an insert for this?" No artwork yet
-- (shows "Preview coming soon"); add a picture line in sp-product-images.sql when it exists.
CALL dmg_upsert_product(@company, 'Bill Inserts', 'Tank Monitors Bill Insert',
  'Bill stuffer promoting tank monitoring.', @order_div);

-- Brochures
-- Agriculture / Commercial: mockup is image_url; Outside / Inside spreads are extra previews.
CALL dmg_upsert_product(@company, 'Brochures', 'Agriculture Brochure', NULL,
  CONCAT('{"mode":"order","frontLabel":"Overview","gallery":[',
         '{"label":"Outside","url":"/images/sp-agriculture-brochure-outside-web.jpg"},',
         '{"label":"Inside","url":"/images/sp-agriculture-brochure-inside-web.jpg"}],',
         '"fields":[', @contact, ',', @division, ',', @email, ',', @shipping, ']}'));
CALL dmg_upsert_product(@company, 'Brochures', 'Commercial Brochure', NULL,
  CONCAT('{"mode":"order","frontLabel":"Overview","gallery":[',
         '{"label":"Outside","url":"/images/sp-commercial-brochure-outside-web.jpg"},',
         '{"label":"Inside","url":"/images/sp-commercial-brochure-inside-web.jpg"}],',
         '"fields":[', @contact, ',', @division, ',', @email, ',', @shipping, ']}'));
CALL dmg_upsert_product(@company, 'Brochures', 'Recruitment Brochure', NULL, @order_div);

-- Business Cards (updates the existing "Business Cards" product)
CALL dmg_upsert_product(@company, 'Business Cards', 'Business Cards',
  '',  -- no description line on the order page (user request)
  -- "slots": name/title/address/phone/email replace the sample card text
  -- (sp-business-card-front.jpg, 1050x630, from drew-slater-sp-business-card.pdf page 1;
  -- "Scott Petroleum Inc." stays).
  CONCAT('{"mode":"order","overlay":"slots","slotWidth":1050,"slots":[',
         '{"text":"{fullName}","box":[450,112,500,56],"x":945,"y":160.5,"size":47.5,"bold":true,',
         '"fontFamily":"Oswald, \'Arial Narrow\', Arial","uppercase":true,"color":"#2f347c","align":"right"},',
         '{"text":"{title}","box":[450,174,500,32],"x":947,"y":199,"size":25.5,"fontFamily":"Poppins, Arial","letterSpacing":2.3,',
         '"uppercase":true,"color":"#4f4f4f","align":"right"},',
         '{"text":"{locationAddress}","box":[95,356,600,74],"x":105,"y":384,"size":28.6,"fontFamily":"Poppins, Arial",',
         '"color":"#ffffff","align":"left","lineHeight":35,"maxLines":2},',
         '{"text":"{phone}","box":[95,455,600,44],"x":105,"y":489,"size":28.6,"fontFamily":"Poppins, Arial","color":"#ffffff","align":"left"},',
         '{"text":"{email}","box":[95,499,600,42],"x":105,"y":525,"size":28.6,"fontFamily":"Poppins, Arial","color":"#ffffff","align":"left"}],',
         '"quantities":[250,500,1000,2500,5000],',
         '"backImages":{"Standard (Scott Petroleum)":"/images/sp-business-card-back-standard.jpg",',
         '"DEF":"/images/sp-business-card-back-def.jpg",',
         '"Feed & Fertilizer":"/images/sp-business-card-back-feed-fertilizer.jpg"},',
         '"fields":[',
         '{"key":"fullName","label":"Name","required":true},',
         '{"key":"title","label":"Title","required":true},',
         '{"key":"locationAddress","label":"Location Address","type":"textarea","required":true},',
         '{"key":"phone","label":"Phone Number","type":"tel","required":true},',
         '{"key":"email","label":"Email Address","type":"email","required":true},',
         '{"key":"backOption","label":"Back Option","type":"select","required":true,',
         '"options":["Standard (Scott Petroleum)","DEF","Feed & Fertilizer"]},',
         @division, ',', @shipping, ']}'));

-- Door Hangers
CALL dmg_upsert_product(@company, 'Door Hangers', 'Location Specific Door Hanger', NULL,
  CONCAT('{"mode":"order","fields":[',
         '{"key":"location","label":"Location","required":true},',
         @contact, ',', @division, ',', @email, ',', @shipping, ']}'));
-- Invoice Door Hanger: one printed version per location group (SP-invoice-door-hangers.pdf,
-- pages 1-22). Choosing a Location shows that version's front pocket.
CALL dmg_upsert_product(@company, 'Door Hangers', 'Invoice Door Hanger', NULL,
  CONCAT('{"mode":"order","frontLabel":"Front Pocket","backLabel":"Inside Front",',
         '"frontField":"location","frontImages":{',
         '"Almyra / Stuttgart":"/images/sp-invoice-door-hanger-almyra.jpg",',
         '"Batesville / Newport":"/images/sp-invoice-door-hanger-batesville.jpg",',
         '"Belzoni":"/images/sp-invoice-door-hanger-belzoni.jpg",',
         '"Bruce / Grenada":"/images/sp-invoice-door-hanger-bruce.jpg",',
         '"Canton / Durant / Lexington":"/images/sp-invoice-door-hanger-canton.jpg",',
         '"Carrollton / Greenwood":"/images/sp-invoice-door-hanger-carrollton.jpg",',
         '"Carthage / Kosciusko":"/images/sp-invoice-door-hanger-carthage.jpg",',
         '"Dumas / Star City / McGehee":"/images/sp-invoice-door-hanger-dumas.jpg",',
         '"Eupora / Starkville / Calhoun City":"/images/sp-invoice-door-hanger-eupora.jpg",',
         '"Ferriday / Natchez / St. Joseph":"/images/sp-invoice-door-hanger-ferriday.jpg",',
         '"Gassville / Horseshoe Bend":"/images/sp-invoice-door-hanger-gassville.jpg",',
         '"Greenville / Benoit":"/images/sp-invoice-door-hanger-greenville.jpg",',
         '"Hamburg / Lake Village":"/images/sp-invoice-door-hanger-hamburg.jpg",',
         '"Knoxville / Ozark":"/images/sp-invoice-door-hanger-knoxville.jpg",',
         '"Monroe / Rayville / Winnsboro":"/images/sp-invoice-door-hanger-monroe.jpg",',
         '"Oak Grove / Tallulah":"/images/sp-invoice-door-hanger-oak-grove.jpg",',
         '"Rogers / Goshen / Hindsville":"/images/sp-invoice-door-hanger-rogers.jpg",',
         '"Rolling Fork":"/images/sp-invoice-door-hanger-rolling-fork.jpg",',
         '"Ruleville / Sumner":"/images/sp-invoice-door-hanger-ruleville.jpg",',
         '"Shelby":"/images/sp-invoice-door-hanger-shelby.jpg",',
         '"Winona / Vaiden":"/images/sp-invoice-door-hanger-winona.jpg",',
         '"Yazoo City":"/images/sp-invoice-door-hanger-yazoo-city.jpg"},',
         '"fields":[{"key":"location","label":"Location","type":"select","required":true,"options":[',
         '"Almyra / Stuttgart","Batesville / Newport","Belzoni","Bruce / Grenada",',
         '"Canton / Durant / Lexington","Carrollton / Greenwood","Carthage / Kosciusko",',
         '"Dumas / Star City / McGehee","Eupora / Starkville / Calhoun City",',
         '"Ferriday / Natchez / St. Joseph","Gassville / Horseshoe Bend","Greenville / Benoit",',
         '"Hamburg / Lake Village","Knoxville / Ozark","Monroe / Rayville / Winnsboro",',
         '"Oak Grove / Tallulah","Rogers / Goshen / Hindsville","Rolling Fork","Ruleville / Sumner",',
         '"Shelby","Winona / Vaiden","Yazoo City"]},',
         @contact, ',', @division, ',', @email, ',', @shipping, ']}'));
CALL dmg_upsert_product(@company, 'Door Hangers', 'Missed Service Door Hanger', NULL, @order_div);

-- Envelopes
CALL dmg_upsert_product(@company, 'Envelopes', 'Envelope - Hindsville, AR', NULL, @order_div);

-- Flyers (fill in the event details, then download the flyer)
CALL dmg_upsert_product(@company, 'Flyers', 'Customer Appreciation Day Flyer',
  'Fill in your event details and download the flyer.',
  -- "slots": the entered details replace the flyer's sample text (cust-app-flyer.jpg, 1000px).
  CONCAT('{"mode":"download","overlay":"slots","slotWidth":1000,"slots":[',
         '{"text":"{date} | {time}","box":[370,400,260,29],"x":500,"y":419,"size":20,"bold":true,',
         '"color":"#2a327b","sepColor":"#c62828","align":"center"},',
         '{"text":"{location}","box":[370,430,260,25],"x":500,"y":448,"size":20,"bold":true,',
         '"color":"#2a327b","align":"center"},',
         '{"text":"{whatToExpect}","box":[270,512,385,96],"x":277,"y":530,"size":15,',
         '"color":"#111111","align":"left","prefix":"\\u2713 ","lineHeight":23.3,"maxLines":4},',
         '{"text":"For more information, call us at {phone}","box":[300,812,400,27],"x":500,"y":832,',
         '"size":15,"color":"#ffffff","align":"center"}],',
         '"fields":[',
         '{"key":"date","label":"Date","type":"date","required":true},',
         '{"key":"time","label":"Time","type":"time","required":true},',
         '{"key":"location","label":"Location","required":true},',
         '{"key":"whatToExpect","label":"What you can expect","type":"textarea"},',
         '{"key":"phone","label":"Phone Number","type":"tel","required":true}]}'));

-- Folders
CALL dmg_upsert_product(@company, 'Folders', 'General Sales Folder',
  '9" x 12" sales folder with 4" pocket.',
  CONCAT('{"mode":"order","gallery":[{"label":"Open (flat)","url":"/images/sp-folder-flat.jpg"}],',
         '"fields":[', @contact, ',', @email, ',', @shipping, ']}'));

-- Information Guides (order printed copies or download)
CALL dmg_upsert_product(@company, 'Information Guides', 'Customer Portal Guide', NULL,
  CONCAT('{"mode":"both","downloads":[{"label":"Customer Portal Guide (JPG)","url":"/files/scott/cust-portal-guide.jpg"}],',
         '"fields":[', @contact, ',', @email, ',', @shipping, ']}'));

-- Letterhead
CALL dmg_upsert_product(@company, 'Letterhead', 'Scott Petroleum Letterhead', 'Word letterhead template.',
  '{"mode":"download","downloads":[{"label":"Letterhead (Word)","url":"/files/scott/Scott-Petroleum-Letterhead.docx"}]}');

-- Logos: two products, as in the listing ("PDF" and "PNG (image file)").
-- Files from marketing's "Logo Exports" folder, in static/files/scott/logos/.
-- The earlier single "Scott Petroleum Logo" product becomes the PDF one (keeps its id).
SET @old_logo := (SELECT id FROM products WHERE company_id = @company AND name = 'Scott Petroleum Logo' LIMIT 1);
SET @pdf_logo := (SELECT id FROM products WHERE company_id = @company AND name = 'Scott Petroleum Logo (PDF)' LIMIT 1);
UPDATE products SET name = 'Scott Petroleum Logo (PDF)' WHERE id = @old_logo AND @pdf_logo IS NULL;

CALL dmg_upsert_product(@company, 'Logos', 'Scott Petroleum Logo (PDF)',
  'Scott Petroleum logo as PDF (print quality).',
  CONCAT('{"mode":"download","frontLabel":"Main","gallery":[',
         '{"label":"Landscape","url":"/images/sp-logo-landscape-pdf.png"}],"downloads":[',
         '{"label":"Main logo (PDF)","url":"/files/scott/logos/Scott_logo-main.pdf","preview":"/images/sp-logo-main-pdf.png"},',
         '{"label":"Landscape logo (PDF)","url":"/files/scott/logos/Scott_logo-landscape.pdf","preview":"/images/sp-logo-landscape-pdf.png"}]}'));

CALL dmg_upsert_product(@company, 'Logos', 'Scott Petroleum Logo (PNG)',
  'Scott Petroleum logo as PNG image files with a transparent background.',
  CONCAT('{"mode":"download","frontLabel":"Main","gallery":[',
         '{"label":"Landscape","url":"/images/sp-logo-landscape.png"}],"downloads":[',
         '{"label":"Main logo (PNG)","url":"/files/scott/logos/Scott_logo-main.png"},',
         '{"label":"Main logo, all white (PNG)","url":"/files/scott/logos/Scott_logo-main-all-white.png","dark":true},',
         '{"label":"Landscape logo (PNG)","url":"/files/scott/logos/Scott_logo-landscape.png"},',
         '{"label":"Landscape logo, all white (PNG)","url":"/files/scott/logos/Scott_logo-landscape-all-white.png","dark":true},',
         '{"label":"Wide logo, large (PNG)","url":"/files/scott/logos/Scott-Logo-1.png"},',
         '{"label":"Favicon 16x16 (PNG)","url":"/files/scott/logos/Scott_logo-main-16x16-favicon.png"},',
         '{"label":"Favicon 32x32 (PNG)","url":"/files/scott/logos/Scott_logo-main-32x32-favicon.png"},',
         '{"label":"Favicon 48x48 (PNG)","url":"/files/scott/logos/Scott_logo-main-48x48-favicon.png"}]}'));

-- Maps
CALL dmg_upsert_product(@company, 'Maps', 'Full Map', 'All Scott Petroleum locations.',
  '{"mode":"download","downloads":[{"label":"Full Map (PDF)","url":"/files/scott/SP_FullMap-Final.pdf","preview":"/images/sp-map-full.jpg"}]}');
CALL dmg_upsert_product(@company, 'Maps', 'Mississippi Map', NULL,
  '{"mode":"download","downloads":[{"label":"Mississippi Map (PDF)","url":"/files/scott/SP_MSMapComp.pdf","preview":"/images/sp-map-mississippi.jpg"}]}');
CALL dmg_upsert_product(@company, 'Maps', 'Louisiana Map', NULL,
  '{"mode":"download","downloads":[{"label":"Louisiana Map (PDF)","url":"/files/scott/SP_LAMapComp.pdf","preview":"/images/sp-map-louisiana.jpg"}]}');
CALL dmg_upsert_product(@company, 'Maps', 'Arkansas Map', NULL,
  '{"mode":"download","downloads":[{"label":"Arkansas Map (PDF)","url":"/files/scott/SP_ARMapComp.pdf","preview":"/images/sp-map-arkansas.jpg"}]}');

-- Notecards
CALL dmg_upsert_product(@company, 'Notecards', 'Blank Thank You Notecard', NULL, @order);

-- Presentation Template
-- The editable PowerPoint (static/files/scott/scott-powerpoint-template.pptx) is the main
-- download; slide previews were rendered from its PDF export.
CALL dmg_upsert_product(@company, 'Presentation Template', 'PowerPoint Presentation Template',
  'Scott Petroleum PowerPoint template (editable .pptx): 5 slide layouts.',
  CONCAT('{"mode":"download","frontLabel":"Slide 1","gallery":[',
         '{"label":"Slide 2","url":"/images/sp-ppt-slide-2.jpg"},',
         '{"label":"Slide 3","url":"/images/sp-ppt-slide-3.jpg"},',
         '{"label":"Slide 4","url":"/images/sp-ppt-slide-4.jpg"},',
         '{"label":"Slide 5","url":"/images/sp-ppt-slide-5.jpg"}],"downloads":[',
         '{"label":"PowerPoint template (PPTX)","url":"/files/scott/scott-powerpoint-template.pptx",',
         '"preview":"/images/sp-ppt-slide-1.jpg"},',
         '{"label":"PDF version","url":"/files/scott/scott-powerpoint-template.pdf",',
         '"preview":"/images/sp-ppt-slide-1.jpg"}]}'));

-- Promotional Products (no fields in the listing yet: contact/shipping + notes)
SET @promo := CONCAT('{"mode":"order","fields":[', @contact, ',', @division, ',', @email, ',', @shipping, ',',
                     '{"key":"notes","label":"Notes (size, color, etc.)","type":"textarea"}]}');
CALL dmg_upsert_product(@company, 'Promotional Products', 'Coolers', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Cups', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Hats', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'T-Shirts', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Pens', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Notepads', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Wall Calendars', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Desk Calendars', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Small Calendars', NULL, @promo);
CALL dmg_upsert_product(@company, 'Promotional Products', 'Planners', NULL, @promo);

-- Rack Cards
CALL dmg_upsert_product(@company, 'Rack Cards', 'Ag Irrigation Engine Rentals Rack Card', NULL, @order);
CALL dmg_upsert_product(@company, 'Rack Cards', 'Tank Monitoring Rack Card', NULL, @order);

-- Thank You Cards
-- Pictures from Outside.pdf / Inside.pdf (artwork-originals/scott/thank-you-card/).
CALL dmg_upsert_product(@company, 'Thank You Cards', 'Thank You Card', 'Folded card (outside and inside).',
  CONCAT('{"mode":"order","frontLabel":"Outside","gallery":[',
         '{"label":"Inside","url":"/images/sp-thank-you-card-inside.jpg"}],',
         '"fields":[', @contact, ',', @email, ',', @shipping, ']}'));

DROP PROCEDURE IF EXISTS dmg_upsert_product;

-- Keep the listing order: Folders and Information Guides sit right after Flyers.
UPDATE category SET display_order = 8 WHERE company_id = @company AND name = 'Folders';
UPDATE category SET display_order = 9 WHERE company_id = @company AND name = 'Information Guides';

-- 5. Check: every SP product with its category.
SELECT c.display_order, c.name AS category, p.id, p.name AS product,
       JSON_UNQUOTE(JSON_EXTRACT(p.order_config, '$.mode')) AS mode
  FROM products p
  JOIN product_category pc ON pc.product_id = p.id
  JOIN category c ON c.id = pc.category_id
 WHERE p.company_id = @company
 ORDER BY c.display_order, p.name;
