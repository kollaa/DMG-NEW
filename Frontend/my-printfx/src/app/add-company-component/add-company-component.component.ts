import { Component } from '@angular/core';
import { CompanyService } from '../../service/company.service';
import { Router, RouterOutlet } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-company-component',
  imports: [
     FormsModule, ReactiveFormsModule, CommonModule
  ],
  templateUrl: './add-company-component.component.html',
  styleUrl: './add-company-component.component.css'
})
export class AddCompanyComponentComponent {

  company = {
    name: '',
    imageUrl: ''
  };

  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  imageInvalid: boolean = false;

  onImageSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (file) {
      this.selectedFile = file;
      this.imageInvalid = false;
  
      // Image preview (optional)
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFile = null;
      this.imagePreview = null;
      this.imageInvalid = true;
    }
  }

  constructor(private companyService: CompanyService, private router:Router) {}

  addCompany() {
    if (!this.selectedFile) {
      this.imageInvalid = true;
      return;
    }
  
    const formData = new FormData();
    formData.append('name', this.company.name);
    formData.append('image', this.selectedFile);

    this.companyService.addCompany(formData).subscribe(response => {
      console.log('Company added successfully response');
      this.router.navigate(['/dashboard']);
    });
  }


}
