import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../service/product.service';
import { CompanyService } from '../../service/company.service';        // ← use this
//import { CompanyContextService } from '../../service/company-context.service';
import { Product } from '../../Bean/product';
import { Company } from '../../Bean/company';
import { CompanyContextService } from '../../service/company-contextservice';

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
  backendUrl = 'http://localhost:8080';
  isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
  
  private sideBySideKeywords = ['rack', 'brochure', 'door', 'trifold'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private companyService: CompanyService,            // ← swap
    private companyContext: CompanyContextService
  ) {}

  ngOnInit(): void {
    this.companyId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCompany();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.companyContext.clearCompany();
  }

  private loadCompany(): void {
    this.companyService.getCompanyById(this.companyId).subscribe({  // ← use existing method
      next: (company) => {
        this.company = company;
        this.companyContext.setCompany(company);  // ← push to navbar
      },
      error: (err) => console.error('Failed to load company', err)
    });
  }

  private loadProducts(): void {
    this.loading = true;
    this.productService.getProductsByCompany(this.companyId).subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.loading = false;
      }
    });
  }

  isSideBySide(product: Product): boolean {
    const name = product.name.toLowerCase();
    return this.sideBySideKeywords.some(keyword => name.includes(keyword));
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
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