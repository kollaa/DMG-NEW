import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../service/product.service';
import { CompanyService } from '../../service/company.service';
import { CartService } from '../../service/cart.service';

import { Product } from '../../Bean/product';
import { CompanyContextService } from '../../service/company-contextservice';

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
  previewSide: 'front' | 'back' = 'front';
  private viewReady = false;
  private productReady = false;

  // When editing an existing cart item (came from the cart page's "Edit
  // Customization" link with ?editOrderId=123), this holds that order's
  // id so Save/Add to Cart update it in place instead of creating a
  // second, duplicate order.
  editingOrderId: number | null = null;

  // ── Shared quantity (applies to ALL product types) ──────────────
  quantities = [250, 500, 1000, 2500, 5000];
  selectedQuantity = 250;
  optionsOpen = false;

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

  // Pulls the saved order and pre-fills whichever form applies, plus the
  // quantity. Runs independently of loadProduct()/loadCompany() — by the
  // time this resolves and mutates bcForm/rcForm, either the canvas hasn't
  // rendered yet (and will pick up the new values on its first render), or
  // it already has (and tryRenderCanvas() below re-triggers it).
  private loadOrderForEdit(id: number): void {
    this.cartService.getOrderById(id).subscribe({
      next: (order) => {
        this.selectedQuantity = order.quantity;

        if (order.formDetails) {
          // isBusinessCard/isRackCard depend on `product`, which may not
          // have loaded yet — that's fine, both forms just get populated
          // with whatever matching keys exist; only the relevant one ends
          // up actually rendered once `product` arrives.
          this.bcForm = { ...this.bcForm, ...order.formDetails };
          this.rcForm = { ...this.rcForm, ...order.formDetails };
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
    if (!this.canvasRef || !this.product) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgSrc = this.previewSide === 'front'
      ? this.product.imageUrl
      : (this.product.imageUrlBack || this.product.imageUrl);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width  = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (this.isBusinessCard && this.previewSide === 'front') {
        this.drawBusinessCardText(ctx, canvas.width, canvas.height);
      }
      if (this.isRackCard && this.previewSide === 'back') {
        this.drawRackCardText(ctx, canvas.width, canvas.height);
      }
    };
    img.src = imgSrc;
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

  switchSide(side: 'front' | 'back'): void {
    this.previewSide = side;
    setTimeout(() => this.renderCanvas(), 50);
  }

  onFormChange(): void {
    this.renderCanvas();
  }

  toggleOptions(): void {
    this.optionsOpen = !this.optionsOpen;
  }

  onQuantityChange(): void {
    // price getter is computed — no extra action needed
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

  get price(): number {
    if (!this.product) return 0;
    const name = this.product.name.toLowerCase();
    let tier = this.pricingTiers['default'];
    for (const key of Object.keys(this.pricingTiers)) {
      if (name.includes(key)) { tier = this.pricingTiers[key]; break; }
    }
    return tier[this.selectedQuantity] ?? 0;
  }

  // ── Navigation ──────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/products', this.companyId]);
  }

  saveOrder(): void {
    this.captureBothSides((front, back) => {
      const payload = {
        productId:        this.productId,
        companyId:        this.companyId,
        productName:      this.product?.name ?? '',
        companyName:      this.companyName || this.product?.name || '',
        quantity:         this.selectedQuantity,
        price:            this.price,
        status:           'in-progress' as const,
        percentComplete:  this.calculateCompletion(),
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

  addToCart(): void {
    this.captureBothSides((front, back) => {
      const payload = {
        productId:        this.productId,
        companyId:        this.companyId,
        productName:      this.product?.name ?? '',
        companyName:      this.companyName || this.product?.name || '',
        quantity:         this.selectedQuantity,
        price:            this.price,
        status:           'ready' as const,
        percentComplete:  100,
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

  // Renders and captures BOTH sides of the card as separate data URLs,
  // regardless of which side the user currently has selected in the
  // preview toggle — otherwise only whichever side happens to be showing
  // at the moment "Add to Cart" is clicked would ever get saved, and the
  // other side would never make it into the cart at all. Restores
  // whatever side was originally showing once done, so this doesn't
  // visibly disrupt the preview.
  private captureBothSides(callback: (front: string | undefined, back: string | undefined) => void): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !this.product) {
      callback(undefined, undefined);
      return;
    }

    const originalSide = this.previewSide;

    const renderSide = (side: 'front' | 'back', done: (dataUrl: string) => void) => {
      const imgSrc = side === 'front'
        ? this.product!.imageUrl
        : (this.product!.imageUrlBack || this.product!.imageUrl);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        if (this.isBusinessCard && side === 'front') {
          this.drawBusinessCardText(ctx, canvas.width, canvas.height);
        }
        if (this.isRackCard && side === 'back') {
          this.drawRackCardText(ctx, canvas.width, canvas.height);
        }
        done(canvas.toDataURL('image/png'));
      };
      img.src = imgSrc;
    };

    renderSide('front', (frontUrl) => {
      if (this.product?.imageUrlBack) {
        renderSide('back', (backUrl) => {
          this.previewSide = originalSide;
          this.renderCanvas();
          callback(frontUrl, backUrl);
        });
      } else {
        this.previewSide = originalSide;
        this.renderCanvas();
        callback(frontUrl, undefined);
      }
    });
  }

  private calculateCompletion(): number {
    const requiredFields = this.isBusinessCard
      ? ['fullName', 'title', 'companyName', 'email', 'address', 'cityState', 'zipCode']
      : ['phoneNumber', 'address', 'cityState', 'zipCode'];

    const form: any = this.currentForm;
    const filled = requiredFields.filter(f => !!(form[f] && String(form[f]).trim())).length;
    return Math.round((filled / requiredFields.length) * 100);
  }

  private get currentForm() {
    return this.isBusinessCard ? this.bcForm : this.rcForm;
  }
}