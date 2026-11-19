import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminUserService, ManagedUser, NewUserRequest, UserRole } from '../../service/admin-user.service';

@Component({
  selector: 'app-manage-users',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css'
})
export class ManageUsersComponent implements OnInit {
  users: ManagedUser[] = [];
  loading = true;
  errorMessage = '';
  infoMessage = '';
  search = '';

  showAddForm = false;
  saving = false;
  formError = '';
  newUser: NewUserRequest = this.emptyUser();

  busyId: number | null = null;

  // Reset-password dialog
  resetTarget: ManagedUser | null = null;
  resetNewPassword = '';
  resetConfirmPassword = '';
  resetError = '';
  resetSaving = false;
  currentEmail = typeof window !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';

  constructor(private adminUserService: AdminUserService) {}

  ngOnInit(): void {
    this.load();
  }

  get filteredUsers(): ManagedUser[] {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      return this.users;
    }
    return this.users.filter(u =>
      (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  get pendingCount(): number {
    return this.users.filter(u => u.status === 'PENDING').length;
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminUserService.getAllUsers().subscribe({
      next: users => {
        this.users = users;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err?.status === 403
          ? 'You need admin access to view this page.'
          : (err?.error?.error || 'Could not load users.');
      }
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.formError = '';
    if (!this.showAddForm) {
      this.newUser = this.emptyUser();
    }
  }

  addUser(): void {
    this.formError = '';
    const { name, email, password } = this.newUser;
    if (!name.trim() || !email.trim() || !password) {
      this.formError = 'Name, email and password are required.';
      return;
    }
    if (password.length < 8) {
      this.formError = 'Password must be at least 8 characters.';
      return;
    }

    this.saving = true;
    this.adminUserService.createUser({ ...this.newUser, email: email.trim(), name: name.trim() }).subscribe({
      next: created => {
        this.saving = false;
        this.users = [...this.users, created].sort((a, b) => a.email.localeCompare(b.email));
        this.infoMessage = `${created.name || created.email} was added as ${this.roleLabel(created.role)}. `
          + `Share the password with them directly; they can change it with "Forgot Password".`;
        this.showAddForm = false;
        this.newUser = this.emptyUser();
      },
      error: err => {
        this.saving = false;
        this.formError = err?.error?.error || 'Could not add the user.';
      }
    });
  }

  changeRole(user: ManagedUser, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const role = select.value as UserRole;
    if (role === user.role) {
      return;
    }

    const who = user.name || user.email;
    const message = role === 'ADMIN'
      ? `Make ${who} an Admin? Admins can add companies, products and users, and approve orders.`
      : `Change ${who} to Viewer? They will lose admin access.`;
    if (!confirm(message)) {
      select.value = user.role; // put the dropdown back
      return;
    }

    this.busyId = user.id;
    this.errorMessage = '';
    this.infoMessage = '';
    this.adminUserService.changeRole(user.id, role).subscribe({
      next: updated => {
        this.busyId = null;
        this.users = this.users.map(u => (u.id === updated.id ? updated : u));
        this.infoMessage = `${who} is now ${this.roleLabel(updated.role)}.`;
      },
      error: err => {
        this.busyId = null;
        select.value = user.role;
        this.errorMessage = err?.error?.error || 'Could not change the role.';
      }
    });
  }

  // ── Reset password ──────────────────────────────────────────

  openReset(user: ManagedUser): void {
    this.resetTarget = user;
    this.resetNewPassword = '';
    this.resetConfirmPassword = '';
    this.resetError = '';
  }

  closeReset(): void {
    if (this.resetSaving) {
      return;
    }
    this.resetTarget = null;
  }

  submitReset(): void {
    if (!this.resetTarget) {
      return;
    }
    this.resetError = '';
    if (this.resetNewPassword.length < 8) {
      this.resetError = 'Password must be at least 8 characters.';
      return;
    }
    if (this.resetNewPassword !== this.resetConfirmPassword) {
      this.resetError = 'Passwords do not match.';
      return;
    }

    const user = this.resetTarget;
    this.resetSaving = true;
    this.adminUserService.resetPassword(user.id, this.resetNewPassword).subscribe({
      next: () => {
        this.resetSaving = false;
        this.resetTarget = null;
        this.infoMessage = `Password for ${user.name || user.email} was reset. Share the new password with them directly.`;
      },
      error: err => {
        this.resetSaving = false;
        this.resetError = err?.error?.error || 'Could not reset the password.';
      }
    });
  }

  // ── Delete user ─────────────────────────────────────────────

  deleteUser(user: ManagedUser): void {
    const who = user.name || user.email;
    if (!confirm(`Permanently delete ${who}? They will no longer be able to log in. This can't be undone.`)) {
      return;
    }
    this.runDelete(user, false);
  }

  private runDelete(user: ManagedUser, deleteOrders: boolean): void {
    const who = user.name || user.email;
    this.busyId = user.id;
    this.errorMessage = '';
    this.infoMessage = '';

    this.adminUserService.deleteUser(user.id, deleteOrders).subscribe({
      next: () => {
        this.busyId = null;
        this.users = this.users.filter(u => u.id !== user.id);
        this.infoMessage = `${who} was deleted.`;
      },
      error: err => {
        this.busyId = null;
        const orderCount = err?.error?.orderCount;
        if (err?.status === 409 && orderCount && !deleteOrders) {
          const ok = confirm(
            `${who} has ${orderCount} order(s). Deleting this user will also permanently delete `
            + `those orders and their history. Continue?`);
          if (ok) {
            this.runDelete(user, true);
          }
          return;
        }
        this.errorMessage = err?.error?.error || 'Could not delete the user.';
      }
    });
  }

  roleLabel(role: UserRole): string {
    return role === 'ADMIN' ? 'Admin' : 'Viewer';
  }

  isMe(user: ManagedUser): boolean {
    return user.email.toLowerCase() === this.currentEmail.toLowerCase();
  }

  private emptyUser(): NewUserRequest {
    return { name: '', email: '', password: '', role: 'VIEWER' };
  }
}