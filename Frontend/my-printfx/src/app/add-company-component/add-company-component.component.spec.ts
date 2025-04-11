import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCompanyComponentComponent } from './add-company-component.component';

describe('AddCompanyComponentComponent', () => {
  let component: AddCompanyComponentComponent;
  let fixture: ComponentFixture<AddCompanyComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCompanyComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCompanyComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
