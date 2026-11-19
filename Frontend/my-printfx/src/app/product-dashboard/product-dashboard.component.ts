import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';


import { ProductService } from '../../service/product.service';
import { Product } from '../../Bean/product';
import { Company } from '../../Bean/company';


@Component({
  selector: 'app-product-dashboard',
  templateUrl: './product-dashboard.component.html',
  styleUrls: ['./product-dashboard.component.scss']
})
export class ProductDashboardComponent implements OnInit {

  products: Product[] = [];
  company: Company | null = null;
  loading = true;
  companyId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.companyId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCompany();
    this.loadProducts();
  }

  private loadCompany(): void {
    this.productService.getCompany(this.companyId).subscribe({
      next: (company) => (this.company = company),
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

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }

  goToAddProduct(): void {
    this.router.navigate(['/products', this.companyId, 'add']);
  }

  startOrder(product: Product): void {
    this.router.navigate(['/products', this.companyId, 'order', product.id]);
  }

  onImageError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.src = 'assets/images/product-placeholder.png';
}

}
