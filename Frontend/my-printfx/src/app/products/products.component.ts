import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-products',
  imports: [],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {

  companyName: string = '';
  products: string[] = [];

  companyProductsMap: any = {
    1: { name: 'Company A', products: ['Product A1', 'Product A2', 'Product A3'] },
    2: { name: 'Company B', products: ['Product B1', 'Product B2'] },
    3: { name: 'Company C', products: ['Product C1', 'Product C2', 'Product C3', 'Product C4'] }
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const companyId = params['companyId'];
      if (this.companyProductsMap[companyId]) {
        this.companyName = this.companyProductsMap[companyId].name;
        this.products = this.companyProductsMap[companyId].products;
      }
    });
  }

}
