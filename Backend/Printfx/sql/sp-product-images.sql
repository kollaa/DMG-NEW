-- ============================================================================
-- Scott Petroleum product pictures (company "Scott").
-- Image files live in Backend/Printfx/src/main/resources/static/images/.
-- Paths are relative ("/images/..."): the website adds the backend host, so
-- this same script works on Local and Azure. Safe to run more than once.
-- Add a line here whenever marketing sends a new picture.
-- Print-size originals are kept in artwork-originals/scott/ (not deployed).
-- ============================================================================

-- MySQL Workbench "Safe Updates" mode blocks UPDATEs by name; allow them here.
SET SQL_SAFE_UPDATES = 0;

SET @company := (SELECT id FROM companies WHERE name = 'Scott' LIMIT 1);

-- Banner Stands (mockup)
UPDATE products SET image_url = '/images/table-top-banner.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'General Table Top Banner';

-- Bill Inserts (front / back, rendered from the print PDFs)
UPDATE products SET image_url = '/images/sp-ag-irrigation-bill-insert-front.jpg',
                    image_url_back = '/images/sp-ag-irrigation-bill-insert-back.jpg'
 WHERE company_id = @company AND name = 'Ag Irrigation Rentals Bill Insert';

UPDATE products SET image_url = '/images/sp-customer-portal-bill-insert-front.jpg',
                    image_url_back = '/images/sp-customer-portal-bill-insert-back.jpg'
 WHERE company_id = @company AND name = 'Customer Portal Bill Insert';

-- Business Cards: front from drew-slater-sp-business-card.pdf. Default back = Standard; the DEF and
-- Feed & Fertilizer backs are picked by the "Back Option" field
-- (backImages in sp-product-listing.sql).
UPDATE products SET image_url = '/images/sp-business-card-front.jpg',
                    image_url_back = '/images/sp-business-card-back-standard.jpg'
 WHERE company_id = @company AND name = 'Business Cards';

-- Invoice Door Hanger: tile/default front = Carrollton version; the Location
-- field swaps the front pocket (frontImages in sp-product-listing.sql). image_url_back is
-- the Scott hanger panel, shown as "Inside Front" (backLabel), same for every location.
UPDATE products SET image_url = '/images/sp-invoice-door-hanger-carrollton.jpg',
                    image_url_back = '/images/sp-invoice-door-hanger-back.jpg'
 WHERE company_id = @company AND name = 'Invoice Door Hanger';

-- Maps: preview rendered from the PDFs; the PDFs themselves are the downloads
-- (static/files/scott/SP_*Map*.pdf, linked in sp-product-listing.sql).
UPDATE products SET image_url = '/images/sp-map-full.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Full Map';
UPDATE products SET image_url = '/images/sp-map-arkansas.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Arkansas Map';
UPDATE products SET image_url = '/images/sp-map-louisiana.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Louisiana Map';
UPDATE products SET image_url = '/images/sp-map-mississippi.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Mississippi Map';

-- General Sales Folder: front/back cover cropped from sp-folder-9x12x4 standard.pdf
-- (the open flat layout is a gallery view in sp-product-listing.sql).
UPDATE products SET image_url = '/images/sp-folder-front.jpg',
                    image_url_back = '/images/sp-folder-back.jpg'
 WHERE company_id = @company AND name = 'General Sales Folder';

-- Logos: tile/preview = main logo (Landscape is a gallery view in sp-product-listing.sql).
UPDATE products SET image_url = '/images/sp-logo-main-pdf.png', image_url_back = NULL
 WHERE company_id = @company AND name = 'Scott Petroleum Logo (PDF)';
UPDATE products SET image_url = '/images/sp-logo-main.png', image_url_back = NULL
 WHERE company_id = @company AND name = 'Scott Petroleum Logo (PNG)';

-- Rack Cards: from ag-irrigation-promo-rack-card.pdf (crop marks trimmed, colour-corrected).
-- Tank Monitoring uses the same pictures for now (user decision 2026-11-20) until it
-- gets artwork of its own.
UPDATE products SET image_url = '/images/sp-ag-irrigation-rack-card-front.jpg',
                    image_url_back = '/images/sp-ag-irrigation-rack-card-back.jpg'
 WHERE company_id = @company
   AND name IN ('Ag Irrigation Engine Rentals Rack Card', 'Tank Monitoring Rack Card');

-- PowerPoint template: slide 1 (slides 2-5 are gallery views in sp-product-listing.sql).
UPDATE products SET image_url = '/images/sp-ppt-slide-1.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'PowerPoint Presentation Template';

-- Thank You Card: the whole outside sheet (as in Outside.pdf); Inside is a gallery view.
UPDATE products SET image_url = '/images/sp-thank-you-card-outside.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Thank You Card';

-- Brochures (product mockups)
UPDATE products SET image_url = '/images/agri-brochure.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Agriculture Brochure';

UPDATE products SET image_url = '/images/comm-capabilities-brochure.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Commercial Brochure';

UPDATE products SET image_url = '/images/recruitment-brochure.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Recruitment Brochure';

-- Door Hangers (mockups showing both sides)
UPDATE products SET image_url = '/images/door-hanger-1.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Location Specific Door Hanger';

UPDATE products SET image_url = '/images/door-hanger-2.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Missed Service Door Hanger';

-- Envelopes
UPDATE products SET image_url = '/images/envelope.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Envelope - Hindsville, AR';

-- Flyers (the event details are drawn in a band along the bottom)
UPDATE products SET image_url = '/images/cust-app-flyer.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Customer Appreciation Day Flyer';

-- Information Guides
UPDATE products SET image_url = '/images/cust-portal-guide.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Customer Portal Guide';

-- Letterhead
UPDATE products SET image_url = '/images/letterhead.jpg', image_url_back = NULL
 WHERE company_id = @company AND name = 'Scott Petroleum Letterhead';

-- Check: every Scott product and its picture (NULL = "Preview coming soon")
SELECT c.name AS category, p.name AS product, p.image_url, p.image_url_back
  FROM products p
  JOIN product_category pc ON pc.product_id = p.id
  JOIN category c ON c.id = pc.category_id
 WHERE p.company_id = @company
 ORDER BY c.display_order, p.name;
