import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintFxComponent } from './print-fx.component';

describe('PrintFxComponent', () => {
  let component: PrintFxComponent;
  let fixture: ComponentFixture<PrintFxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintFxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintFxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
