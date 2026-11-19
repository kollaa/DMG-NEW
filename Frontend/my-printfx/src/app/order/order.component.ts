import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../service/product.service';
import { CompanyService } from '../../service/company.service';
import { CartService } from '../../service/cart.service';

import { Product } from '../../Bean/product';
import { OrderConfig, OrderField, parseOrderConfig, resolveFileUrl } from '../../Bean/order-config';
import { CompanyContextService } from '../../service/company-contextservice';

// 'front' / 'back' = the product's two sides; 'g0', 'g1'... = order_config.gallery pictures.
type Side = string;

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.css']
})
export class OrderComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('cardCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  product: Product | null = null;
  companyId!: number;
  productId!: number;
  companyName = '';
  loading = true;
  previewSide: Side = 'front';
  private viewReady = false;
  private productReady = false;

  // When editing an existing cart item (came from the cart page's "Edit
  // Customization" link with ?editOrderId=123), this holds that order's
  // id so Save/Add to Cart update it in place instead of creating a
  // second, duplicate order.
  editingOrderId: number | null = null;

  // ── Configured products (products.order_config) ─────────────────
  // When set, the form, quantity, price and downloads all come from it.
  // When null, the original business-card / rack-card form is used.
  config: OrderConfig | null = null;
  dynForm: Record<string, string> = {};
  customQuantity = 1;
  formError = '';

  // ── Shared quantity (original products) ─────────────────────────
  quantities = [250, 500, 1000, 2500, 5000];
  selectedQuantity: number = 250;

  // ── Pricing tiers per product type ──────────────────────────────
  private pricingTiers: Record<string, Record<number, number>> = {
    'business': { 250: 35,  500: 60,  1000: 100, 2500: 220, 5000: 400 },
    'rack':     { 250: 75,  500: 130, 1000: 220, 2500: 500, 5000: 900 },
    'door':     { 250: 55,  500: 95,  1000: 160, 2500: 350, 5000: 600 },
    'default':  { 250: 35,  500: 60,  1000: 100, 2500: 220, 5000: 400 }
  };

  // ── Business Card form ──────────────────────────────────────────
  bcForm = {
    fullName:       '',
    title:          '',
    companyName:    '',
    email:          '',
    address:        '',
    cityState:      '',
    zipCode:        '',
    includeWebsite: false,
    website:        ''
  };

  // ── Rack Card form ──────────────────────────────────────────────
  rcForm = {
    phoneNumber:    '',
    address:        '',
    cityState:      '',
    zipCode:        '',
    includeWebsite: false,
    website:        ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private companyService: CompanyService,
    private companyContext: CompanyContextService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.companyId = Number(this.route.snapshot.paramMap.get('companyId'));
    this.productId  = Number(this.route.snapshot.paramMap.get('productId'));
    this.loadCompany();
    this.loadProduct();

    const editId = this.route.snapshot.queryParamMap.get('editOrderId');
    if (editId) {
      this.editingOrderId = Number(editId);
      this.loadOrderForEdit(this.editingOrderId);
    }
  }

  ngOnDestroy(): void {
    this.companyContext.clearCompany(); // restore default navbar logo on leave
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRenderCanvas();
  }

  // Pulls the saved order and pre-fills the form and quantity. May resolve
  // before or after the product loads; every form gets the matching keys and
  // only the one that applies is shown.
  private loadOrderForEdit(id: number): void {
    this.cartService.getOrderById(id).subscribe({
      next: (order) => {
        this.selectedQuantity = Number(order.quantity);
        this.customQuantity = Number(order.quantity);

        if (order.formDetails) {
          const { summary, ...values } = order.formDetails;
          this.bcForm = { ...this.bcForm, ...values };
          this.rcForm = { ...this.rcForm, ...values };
          this.dynForm = { ...this.dynForm, ...values };
        }

        this.tryRenderCanvas();
      },
      error: (err) => console.error('Failed to load order for editing', err)
    });
  }

  private loadCompany(): void {
    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (company) => {
        this.companyContext.setCompany(company);
        this.companyName = company.name;
      },
      error: (err) => console.error('Failed to load company', err)
    });
  }

  private loadProduct(): void {
    this.productService.getProductsByCompany(this.companyId).subscribe({
      next: (products) => {
        this.product = products.find(p => p.id === this.productId) || null;
        this.config = parseOrderConfig(this.product?.orderConfig);
        if (this.config) {
          for (const f of this.config.fields ?? []) {
            this.dynForm[f.key] ??= '';
          }
          const choices = this.config.quantities;
          if (choices?.length && !(this.editingOrderId && choices.includes(this.selectedQuantity))) {
            this.selectedQuantity = choices[0];
          }
        }
        this.loading = false;
        this.productReady = true;
        this.tryRenderCanvas();
      },
      error: () => this.loading = false
    });
  }

  private tryRenderCanvas(): void {
    if (this.viewReady && this.productReady) {
      setTimeout(() => this.renderCanvas(), 100);
    }
  }

  renderCanvas(): void {
    this.paintSide(this.previewSide);
  }

  /**
   * Draws one side of the product (artwork + the customer's text) on the
   * preview canvas, then calls done() with a PNG of it. Products without
   * artwork yet get a plain placeholder so ordering still works.
   */
  private paintSide(side: Side, done?: (dataUrl: string | undefined) => void): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !this.product) {
      done?.(undefined);
      return;
    }

    const finish = () => {
      this.drawOverlay(ctx, canvas.width, canvas.height, side);
      if (!done) return;
      try {
        done(canvas.toDataURL('image/png'));
      } catch {
        done(undefined); // artwork from another host without CORS
      }
    };

    const imgSrc = this.imageFor(side);

    if (!imgSrc) {
      this.drawPlaceholder(ctx, canvas);
      finish();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.max(1, (this.config?.minPreviewWidth ?? 0) / img.width);
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      finish();
    };
    img.onerror = () => {
      this.drawPlaceholder(ctx, canvas);
      finish();
    };
    img.src = imgSrc;
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    canvas.width = 1000;
    canvas.height = 650;
    ctx.fillStyle = '#f3f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#c7cedb';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.fillStyle = '#1a237e';
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px Arial';
    ctx.fillText(this.product?.name ?? '', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = '#6b7280';
    ctx.font = '28px Arial';
    ctx.fillText('Preview coming soon', canvas.width / 2, canvas.height / 2 + 40);
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, side: Side): void {
    if (this.config) {
      if (side !== 'front') return;
      if (this.config.overlay === 'business-card') this.drawConfiguredBusinessCard(ctx, w, h);
      if (this.config.overlay === 'info-band') this.drawInfoBand(ctx, w, h);
      if (this.config.overlay === 'slots') this.drawSlots(ctx, w);
      return;
    }
    if (this.isBusinessCard && side === 'front') {
      this.drawBusinessCardText(ctx, w, h);
    }
    if (this.isRackCard && side === 'back') {
      this.drawRackCardText(ctx, w, h);
    }
  }

  private drawBusinessCardText(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // ── Name & Title — top-right, over the white/logo space ──
    const nameX = w * 0.95;
    ctx.textAlign = 'right';

    if (this.bcForm.fullName) {
      ctx.fillStyle = '#1a237e';
      ctx.font = `bold ${h * 0.065}px Arial`;
      ctx.fillText(this.bcForm.fullName.toUpperCase(), nameX, h * 0.20);
    }
    if (this.bcForm.title) {
      ctx.fillStyle = '#555555';
      ctx.font = `${h * 0.04}px Arial`;
      ctx.fillText(this.bcForm.title.toUpperCase(), nameX, h * 0.26);
    }

    // ── Company info block — bottom, over the blue area ──
    const leftX = w * 0.13;
    const startY = h * 0.60;
    const lineH  = h * 0.075;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    if (this.bcForm.companyName) {
      ctx.font = `bold ${h * 0.055}px Arial`;
      ctx.fillText(this.bcForm.companyName, leftX, startY);
    }
    if (this.bcForm.address) {
      ctx.font = `${h * 0.048}px Arial`;
      ctx.fillText(this.bcForm.address, leftX, startY + lineH);
    }
    const cityZip = [this.bcForm.cityState, this.bcForm.zipCode].filter(Boolean).join(' ');
    if (cityZip) {
      ctx.font = `${h * 0.048}px Arial`;
      ctx.fillText(cityZip, leftX, startY + lineH * 2);
    }
    if (this.bcForm.email) {
      ctx.font = `${h * 0.048}px Arial`;
      ctx.fillText(this.bcForm.email, leftX, startY + lineH * 3.2);
    }

    if (this.bcForm.includeWebsite && this.bcForm.website) {
      ctx.font = `${h * 0.048}px Arial`;
      ctx.fillText(this.bcForm.website, leftX, startY + lineH * 4.4);
    }
  }

  private drawRackCardText(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const centerX = w * 0.5;
    const startY  = h * 0.88;
    const lineH   = h * 0.035;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    if (this.rcForm.phoneNumber) {
      ctx.font = `bold ${h * 0.028}px Arial`;
      ctx.fillText(this.rcForm.phoneNumber, centerX, startY);
    }
    const cityZip = [this.rcForm.cityState, this.rcForm.zipCode].filter(Boolean).join(' ');
    if (this.rcForm.address || cityZip) {
      ctx.font = `${h * 0.025}px Arial`;
      ctx.fillText([this.rcForm.address, cityZip].filter(Boolean).join(', '), centerX, startY + lineH);
    }
  }

  // Same layout as drawBusinessCardText, for configured business cards
  // (fields fullName, title, locationAddress, phone, email).
  private drawConfiguredBusinessCard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const f = this.dynForm;
    ctx.textAlign = 'right';
    if (f['fullName']) {
      ctx.fillStyle = '#1a237e';
      ctx.font = `bold ${h * 0.065}px Arial`;
      ctx.fillText(f['fullName'].toUpperCase(), w * 0.95, h * 0.20);
    }
    if (f['title']) {
      ctx.fillStyle = '#555555';
      ctx.font = `${h * 0.04}px Arial`;
      ctx.fillText(f['title'].toUpperCase(), w * 0.95, h * 0.26);
    }

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = `${h * 0.048}px Arial`;
    const lines = [f['locationAddress'], f['phone'], f['email']]
      .flatMap(v => (v ?? '').split('\n'))
      .map(v => v.trim())
      .filter(Boolean);
    lines.forEach((line, i) => ctx.fillText(line, w * 0.13, h * 0.60 + h * 0.075 * i));
  }

  // Writes the entered details over the picture's sample text (config.slots),
  // e.g. "Friday, May 2 | 2-5PM" on the Customer Appreciation Day flyer.
  private drawSlots(ctx: CanvasRenderingContext2D, w: number): void {
    const k = w / (this.config?.slotWidth ?? 1000);
    for (const slot of this.config?.slots ?? []) {
      const keys = [...slot.text.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      if (!keys.some(key => (this.dynForm[key] ?? '').trim())) continue;

      const text = slot.text
        .replace(/\{(\w+)\}/g, (_, key) => this.slotValue(key))
        .replace(/^(\s*\|\s*)+|(\s*\|\s*)+$/g, '')   // drop separators next to empty fields
        .trim();
      const [bx, by, bw, bh] = slot.box.map(v => Math.round(v * k));
      this.wipeBox(ctx, bx, by, bw, bh);

      const size = slot.size * k;
      (ctx as any).letterSpacing = `${(slot.letterSpacing ?? 0) * k}px`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      const lines = slot.lineHeight
        ? text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, slot.maxLines ?? 99)
        : [text.replace(/\s*\n\s*/g, ', ')];
      lines.forEach((line, i) => {
        const full = (slot.prefix ?? '') + (slot.uppercase ? line.toUpperCase() : line);
        let fontSize = size;
        const font = () => `${slot.bold ? 'bold ' : ''}${fontSize}px ${slot.fontFamily ?? 'Arial'}`;
        this.ensureFontLoaded(font());
        ctx.font = font();
        const maxW = bw - 8 * k;
        while (ctx.measureText(full).width > maxW && fontSize > size * 0.5) {
          fontSize -= 0.5 * k;
          ctx.font = font();
        }
        const y = (slot.y + i * (slot.lineHeight ?? 0)) * k;
        const totalW = ctx.measureText(full).width;
        let x = slot.align === 'left' ? slot.x * k
              : slot.align === 'right' ? slot.x * k - totalW
              : slot.x * k - totalW / 2;
        // Draw piece by piece so " | " can have its own colour.
        for (const part of full.split(/(\s\|\s)/)) {
          ctx.fillStyle = part === ' | ' && slot.sepColor ? slot.sepColor : (slot.color ?? '#222222');
          ctx.fillText(part, x, y);
          x += ctx.measureText(part).width;
        }
      });
    }
    (ctx as any).letterSpacing = '0px';
  }

  private requestedFonts = new Set<string>();

  /** Web fonts (e.g. Oswald) load on first use; redraw once one arrives. */
  private ensureFontLoaded(font: string): void {
    const family = font.replace(/^.*?px\s*/, '');
    if (this.requestedFonts.has(family) || !document.fonts || document.fonts.check(font)) return;
    this.requestedFonts.add(family);
    document.fonts.load(font).then(() => this.renderCanvas()).catch(() => {});
  }

  /** A field's value as it should read on the artwork (dates and times spelled out). */
  private slotValue(key: string): string {
    const value = (this.dynForm[key] ?? '').trim();
    const field = this.configFields.find(f => f.key === key);
    if (!value) return '';
    if (field?.type === 'date') {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    if (field?.type === 'time') {
      const [hh, mm] = value.split(':').map(Number);
      const suffix = hh >= 12 ? 'PM' : 'AM';
      const h12 = hh % 12 || 12;
      return mm ? `${h12}:${String(mm).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
    }
    return value;
  }

  /** Removes the sample text in a box by blending the pixels just above and below it. */
  private wipeBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    try {
      const img = ctx.getImageData(x, y - 1, w, h + 2);
      const d = img.data;
      const row = (r: number, c: number) => (r * w + c) * 4;
      for (let c = 0; c < w; c++) {
        for (let r = 1; r <= h; r++) {
          const t = r / (h + 1);
          const a = row(0, c), b = row(h + 1, c), p = row(r, c);
          for (let ch = 0; ch < 3; ch++) d[p + ch] = d[a + ch] * (1 - t) + d[b + ch] * t;
          d[p + 3] = 255;
        }
      }
      ctx.putImageData(img, x, y - 1);
    } catch {
      ctx.fillStyle = '#ffffff';                // picture from another host without CORS
      ctx.fillRect(x, y, w, h);
    }
  }

  // A white band along the bottom listing the filled-in fields, e.g. the
  // date, time and location on an event flyer.
  private drawInfoBand(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const lines = this.filledLines();
    if (lines.length === 0) return;

    const fontSize = Math.max(14, Math.round(w * 0.022));
    const lineH = fontSize * 1.45;
    const bandH = lineH * lines.length + fontSize;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(0, h - bandH, w, bandH);

    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      const y = h - bandH + fontSize * 0.5 + lineH * (i + 0.8);
      ctx.fillStyle = '#1a237e';
      ctx.font = `bold ${fontSize}px Arial`;
      const label = `${line.label}: `;
      ctx.fillText(label, w * 0.05, y);
      const labelW = ctx.measureText(label).width;
      ctx.fillStyle = '#222222';
      ctx.font = `${fontSize}px Arial`;
      ctx.fillText(line.value.replace(/\n/g, ', '), w * 0.05 + labelW, y);
    });
  }

  private imageFor(side: Side): string {
    if (!this.product) return '';
    if (side.startsWith('g')) {
      const g = this.config?.gallery?.[Number(side.slice(1))];
      return g ? resolveFileUrl(g.url) : this.product.imageUrl;
    }
    if (side === 'front') {
      const front = this.chosenImage(this.config?.frontImages, this.frontField);
      return front ? resolveFileUrl(front) : this.product.imageUrl;
    }
    const back = this.chosenImage(this.config?.backImages, this.backField);
    return back ? resolveFileUrl(back) : (this.product.imageUrlBack || this.product.imageUrl);
  }

  private get frontField(): string { return this.config?.frontField ?? 'location'; }
  private get backField(): string { return this.config?.backField ?? 'backOption'; }

  /** Picture for the answer to `field` (e.g. door hanger location, business card back), if configured. */
  private chosenImage(images: Record<string, string> | undefined, field: string): string | undefined {
    const value = this.dynForm[field];
    return images && value ? images[value] : undefined;
  }

  /** The buttons under the preview: Front/Back and any gallery pictures. */
  get previewViews(): { key: Side; label: string }[] {
    if (!this.product) return [];
    const gallery = this.config?.gallery ?? [];
    const views: { key: Side; label: string }[] = [
      { key: 'front', label: this.config?.frontLabel ?? 'Front' }
    ];
    if (this.product.imageUrlBack || this.config?.backImages) views.push({ key: 'back', label: this.config?.backLabel ?? 'Back' });
    gallery.forEach((g, i) => views.push({ key: `g${i}`, label: g.label }));
    return views;
  }

  switchSide(side: Side): void {
    this.previewSide = side;
    setTimeout(() => this.renderCanvas(), 50);
  }

  onFormChange(changedKey?: string): void {
    this.formError = '';
    // Picking a location / back option shows that side straight away.
    if (changedKey && this.config?.frontImages && changedKey === this.frontField) {
      this.previewSide = 'front';
    } else if (changedKey && this.config?.backImages && changedKey === this.backField) {
      this.previewSide = 'back';
    }
    this.renderCanvas();
  }

  // ── Computed helpers ────────────────────────────────────────────
  get isBusinessCard(): boolean {
    return this.product?.name.toLowerCase().includes('business') ?? false;
  }

  get isRackCard(): boolean {
    return this.product?.name.toLowerCase().includes('rack') ?? false;
  }

  get isDoorHanger(): boolean {
    return this.product?.name.toLowerCase().includes('door') ?? false;
  }

  /** False for download-only products (letterhead, logos, templates...). */
  get canOrder(): boolean {
    return this.config?.mode !== 'download';
  }

  get configFields(): OrderField[] {
    return this.config?.fields ?? [];
  }

  /** The quantity dropdown choices, or null for a free number box. */
  get quantityChoices(): number[] | null {
    if (!this.config) return this.quantities;
    return this.config.quantities?.length ? this.config.quantities : null;
  }

  get orderQuantity(): number {
    return this.quantityChoices ? Number(this.selectedQuantity) : Math.max(1, Math.floor(Number(this.customQuantity) || 1));
  }

  get price(): number {
    if (!this.product) return 0;
    if (this.config?.unitPrice != null) {
      return Math.round(this.config.unitPrice * this.orderQuantity * 100) / 100;
    }
    if (!this.quantityChoices) return 0; // priced by DMG at approval
    const name = this.product.name.toLowerCase();
    let tier = this.pricingTiers['default'];
    for (const key of Object.keys(this.pricingTiers)) {
      if (name.includes(key)) { tier = this.pricingTiers[key]; break; }
    }
    return tier[this.orderQuantity] ?? 0;
  }

  get priceLabel(): string {
    return this.price > 0 ? `$${this.price.toFixed(2)}` : 'Price confirmed at approval';
  }

  get downloads() {
    return (this.config?.downloads ?? []).map(d => ({ label: d.label, url: resolveFileUrl(d.url) }));
  }

  // ── Navigation ──────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/products', this.companyId]);
  }

  saveOrder(): void {
    this.submit('in-progress');
  }

  addToCart(): void {
    if (this.config) {
      const missing = this.missingRequired();
      if (missing.length) {
        this.formError = `Please fill in: ${missing.join(', ')}`;
        return;
      }
    }
    this.submit('ready');
  }

  private submit(status: 'ready' | 'in-progress'): void {
    this.captureBothSides((front, back) => {
      const payload = {
        productId:        this.productId,
        companyId:        this.companyId,
        productName:      this.product?.name ?? '',
        companyName:      this.companyName || this.product?.name || '',
        quantity:         this.orderQuantity,
        price:            this.price,
        status,
        percentComplete:  status === 'ready' ? 100 : this.calculateCompletion(),
        thumbnailDataUrl: front,
        thumbnailDataUrlBack: back,
        formDetails:      this.currentForm
      };

      if (this.editingOrderId) {
        this.cartService.updateOrder(this.editingOrderId, payload).subscribe({
          next: () => this.router.navigate(['/cart']),
          error: (err) => console.error('Failed to update order', err)
        });
      } else {
        this.cartService.addItem(payload);
        this.router.navigate(['/cart']);
      }
    });
  }

  /** Saves the customized preview (e.g. a flyer with the event details) as a PNG. */
  downloadPreview(): void {
    const missing = this.missingRequired();
    if (missing.length) {
      this.formError = `Please fill in: ${missing.join(', ')}`;
      return;
    }
    this.paintSide('front', (dataUrl) => {
      if (!dataUrl) {
        this.formError = 'The preview could not be saved. Please try again.';
        return;
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${(this.product?.name ?? 'preview').replace(/[^\w-]+/g, '-')}.png`;
      a.click();
      this.previewSide = 'front';
    });
  }

  // Renders and captures BOTH sides as separate data URLs, whichever side
  // is currently showing, then puts the preview back the way it was.
  private captureBothSides(callback: (front: string | undefined, back: string | undefined) => void): void {
    if (!this.canvasRef || !this.product) {
      callback(undefined, undefined);
      return;
    }
    const originalSide = this.previewSide;
    const restore = () => { this.previewSide = originalSide; this.renderCanvas(); };

    this.paintSide('front', (frontUrl) => {
      if (this.product?.imageUrlBack) {
        this.paintSide('back', (backUrl) => {
          restore();
          callback(frontUrl, backUrl);
        });
      } else {
        restore();
        callback(frontUrl, undefined);
      }
    });
  }

  private requiredKeys(): string[] {
    if (this.config) {
      return this.configFields.filter(f => f.required).map(f => f.key);
    }
    return this.isBusinessCard
      ? ['fullName', 'title', 'companyName', 'email', 'address', 'cityState', 'zipCode']
      : ['phoneNumber', 'address', 'cityState', 'zipCode'];
  }

  private missingRequired(): string[] {
    return this.configFields
      .filter(f => f.required && !(this.dynForm[f.key] ?? '').trim())
      .map(f => f.label);
  }

  private calculateCompletion(): number {
    const required = this.requiredKeys();
    if (required.length === 0) return 100;
    const form: any = this.currentForm;
    const filled = required.filter(f => !!(form[f] && String(form[f]).trim())).length;
    return Math.round((filled / required.length) * 100);
  }

  /** Filled-in configured fields as {label, value}, in form order. */
  private filledLines(): { label: string; value: string }[] {
    return this.configFields
      .map(f => ({ label: f.label, value: (this.dynForm[f.key] ?? '').trim() }))
      .filter(l => l.value);
  }

  private get currentForm(): any {
    if (this.config) {
      // "summary" lets the cart and the approval email show the details
      // without knowing each product's fields.
      return { ...this.dynForm, summary: this.filledLines() };
    }
    return this.isBusinessCard ? this.bcForm : this.rcForm;
  }
}
