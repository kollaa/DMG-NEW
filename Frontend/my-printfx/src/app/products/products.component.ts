import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../service/product.service';
import { CompanyService } from '../../service/company.service';
import { CompanyContextService } from '../../service/company-contextservice';
import { CategoryService } from '../../service/category.service';
import { Product } from '../../Bean/product';
import { Company } from '../../Bean/company';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit, OnDestroy {

  products: Product[] = [];
  company: Company | null = null;
  loading = true;
  companyId!: number;
  isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';

  // From the URL: /products/:id/category/:categoryId
  // 'all' = every product, 'uncategorized' = products with no category, or a category id
  categoryKey = 'all';
  categoryName = '';

  private sideBySideKeywords = ['rack', 'brochure', 'door', 'trifold'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private companyService: CompanyService,
    private companyContext: CompanyContextService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.companyId = Number(this.route.snapshot.paramMap.get('id'));
    this.categoryKey = this.route.snapshot.paramMap.get('categoryId') ?? 'all';
    this.loadCompany();
    this.loadCategoryName();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.companyContext.clearCompany();
  }

  private loadCompany(): void {
    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (company) => {
        this.company = company;
        this.companyContext.setCompany(company); // push to navbar
      },
      error: (err) => console.error('Failed to load company', err)
    });
  }

  private loadProducts(): void {
    this.loading = true;
    this.productService.getProductsByCompany(this.companyId).subscribe({
      next: (products) => this.applyCategoryFilter(products),
      error: (err) => {
        console.error('Failed to load products', err);
        this.loading = false;
      }
    });
  }

  /** Shows only the products in the chosen category. */
  private applyCategoryFilter(all: Product[]): void {
    if (this.categoryKey === 'all') {
      this.products = all;
      this.loading = false;
      return;
    }

    this.categoryService.getProductIds(this.companyId, this.categoryKey).subscribe({
      next: (ids) => {
        const keep = new Set(ids);
        this.products = all.filter(p => keep.has(p.id));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load category products', err);
        this.products = all;
        this.loading = false;
      }
    });
  }

  /** Puts the category name (e.g. "Business Cards") in the page heading. */
  private loadCategoryName(): void {
    if (this.categoryKey === 'all') {
      this.categoryName = '';
      return;
    }
    if (this.categoryKey === 'uncategorized') {
      this.categoryName = 'Uncategorized';
      return;
    }
    this.categoryService.getCategories(this.companyId).subscribe({
      next: (res) => {
        this.categoryName = res.categories.find(c => String(c.id) === this.categoryKey)?.name ?? '';
      },
      error: (err) => console.error('Failed to load category name', err)
    });
  }

  isSideBySide(product: Product): boolean {
    const name = product.name.toLowerCase();
    return this.sideBySideKeywords.some(keyword => name.includes(keyword));
  }

  goBack(): void {
    if (this.categoryKey === 'all') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/products', this.companyId]); // back to the category tiles
    }
  }

  goToAddProduct(): void {
    this.router.navigate(['/addproduct', this.companyId]);
  }

  startOrder(product: Product): void {
    this.router.navigate(['/order', this.companyId, product.id]);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}