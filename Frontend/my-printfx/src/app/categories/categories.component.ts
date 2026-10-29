import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../../service/company.service';
import { CompanyContextService } from '../../service/company-contextservice';
import { Category } from '../../Bean/Category';
import { CategoryService } from '../../service/category.service';

@Component({
  selector: 'app-categories',
  imports: [],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit, OnDestroy {
  companyId = 0;
  categories: Category[] = [];
  uncategorizedCount = 0;
  loading = true;
  errorMessage = '';
  isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private companyService: CompanyService,
    private companyContext: CompanyContextService
  ) {}

  ngOnInit(): void {
    this.companyId = Number(this.route.snapshot.paramMap.get('id'));

    // Color the navbar / show the company logo, same as the products page does.
    // If products.component.ts uses a different method name than setCompany(), use that here.
    this.companyService.getCompanyById(this.companyId).subscribe({
      next: company => this.companyContext.setCompany(company)
    });

    this.load();
  }

  ngOnDestroy(): void {
    // Use the same "clear" method products.component.ts uses (if different).
    this.companyContext.clearCompany();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.categoryService.getCategories(this.companyId).subscribe({
      next: res => {
        this.categories = res.categories;
        this.uncategorizedCount = res.uncategorizedCount;
        this.loading = false;

        // Companies without categories keep working exactly as before
        if (this.categories.length === 0 && !this.isAdmin) {
          this.router.navigate(['/products', this.companyId, 'category', 'all'], { replaceUrl: true });
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not load categories.';
      }
    });
  }

  openCategory(category: Category): void {
    this.router.navigate(['/products', this.companyId, 'category', category.id]);
  }

  openUncategorized(): void {
    this.router.navigate(['/products', this.companyId, 'category', 'uncategorized']);
  }

  openAll(): void {
    this.router.navigate(['/products', this.companyId, 'category', 'all']);
  }

  addCategory(): void {
    const name = prompt('New category name:')?.trim();
    if (!name) {
      return;
    }
    this.categoryService.createCategory(this.companyId, name).subscribe({
      next: () => this.load(),
      error: err => alert(err?.error?.error || 'Could not create the category.')
    });
  }

  deleteCategory(category: Category, event: Event): void {
    event.stopPropagation();
    const note = category.productCount > 0
      ? ` Its ${category.productCount} product(s) will move to "Uncategorized".`
      : '';
    if (!confirm(`Delete the category "${category.name}"?${note}`)) {
      return;
    }
    this.categoryService.deleteCategory(this.companyId, category.id).subscribe({
      next: () => this.load(),
      error: err => alert(err?.error?.error || 'Could not delete the category.')
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}