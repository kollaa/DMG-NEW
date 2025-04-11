import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Company } from '../../Bean/company';
import { CompanyService } from '../../service/company.service';

@Component({
  selector: 'app-print-fx',
  standalone: true, // Required for using @for
  imports: [CommonModule],
  templateUrl: './print-fx.component.html',
  styleUrl: './print-fx.component.css'
})
export class PrintFxComponent {

  companies: Company[] = [];

 
  constructor(private router:Router, private companyService: CompanyService) {
    console.log("Hello");
  }


  ngOnInit() {
    this.companyService.getCompanies().subscribe((data) => {
      this.companies = data;
    });
  }

  goToProducts(CompanyId: number){
    this.router.navigate(['/products', CompanyId]);
  }

  openAddCompanyForm() {
    
    console.log('Add Company form should open');
    this.router.navigate(['/addcompany']);
    
  }

}   
