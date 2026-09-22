import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AppNotification } from '../Bean/Notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly apiUrl = 'http://localhost:8080/api/notifications';

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Deliberately NOT auto-fetching here — same reasoning as CartService:
    // this service is instantiated before login happens, so refresh() must
    // be called explicitly once a session actually exists.
  }

  get notifications(): AppNotification[] {
    return this.notificationsSubject.value;
  }

  refresh(): void {
    this.http.get<AppNotification[]>(this.apiUrl).subscribe({
      next: items => this.notificationsSubject.next(items),
      error: err => console.error('Failed to load notifications', err)
    });
  }

  markRead(id: number): void {
    this.http.put<AppNotification>(`${this.apiUrl}/${id}/read`, {}).subscribe({
      next: () => this.refresh(),
      error: err => console.error('Failed to mark notification read', err)
    });
  }
}