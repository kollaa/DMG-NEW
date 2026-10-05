import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminUserService, PendingUser } from '../../service/admin-user.service';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  pendingUsers: PendingUser[] = [];
  loading = true;
  errorMessage = '';
  infoMessage = '';
  busyId: number | null = null;

  constructor(private adminUserService: AdminUserService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminUserService.getPendingUsers().subscribe({
      next: (users) => {
        this.pendingUsers = users;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.status === 403
          ? 'You need admin access to view this page.'
          : (err?.error?.error || 'Could not load pending signups.');
      }
    });
  }

  approve(user: PendingUser): void {
    this.act(user, 'approve');
  }

  reject(user: PendingUser): void {
    if (!confirm(`Reject the signup from ${user.name} (${user.email})?`)) {
      return;
    }
    this.act(user, 'reject');
  }

  private act(user: PendingUser, action: 'approve' | 'reject'): void {
    this.busyId = user.id;
    this.infoMessage = '';
    this.errorMessage = '';
    const request = action === 'approve'
      ? this.adminUserService.approve(user.id)
      : this.adminUserService.reject(user.id);

    request.subscribe({
      next: () => {
        this.busyId = null;
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== user.id);
        this.infoMessage = `${user.name} was ${action === 'approve' ? 'approved' : 'rejected'}. An email has been sent to ${user.email}.`;
      },
      error: (err) => {
        this.busyId = null;
        this.errorMessage = err?.error?.error || `Could not ${action} this user.`;
      }
    });
  }
}