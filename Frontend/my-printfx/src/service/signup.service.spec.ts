import { TestBed } from '@angular/core/testing';

import { SignupService } from './signup.service';
import { beforeEach, describe, it } from 'node:test';

describe('SignupService', () => {
  let service: SignupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignupService);
  });
});
function expect(service: SignupService) {
  throw new Error('Function not implemented.');
}

