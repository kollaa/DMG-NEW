import { TestBed } from '@angular/core/testing';

import { AdminUserService } from './admin-user.service';
import { beforeEach, describe, it } from 'node:test';

describe('AdminuserService', () => {
  let service: AdminUserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminUserService);
  });

});
function expect(service: AdminUserService) {
  throw new Error('Function not implemented.');
}

