import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AppNotification } from '../Bean/Notification';
import { environment } from '../app/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly apiUrl = `${environment.apiUrl}/api/notifications`;

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private eventSource?: EventSource;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(private http: HttpClient) {
    // Not auto-fetching here: this service is created before login happens,
    // so refresh() / connect() are called once a session exists.
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

  /**
   * Opens a live connection so the bell updates the moment the backend saves
   * a new notification. Safe to call repeatedly; it only connects once.
   */
  connect(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return; // already connected (or connecting)
    }
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const es = new EventSource(`${this.apiUrl}/stream?token=${encodeURIComponent(token)}`);

    // Backend saved a new notification for this user
    es.addEventListener('notification', () => this.refresh());

    // (Re)connected: catch up on anything missed while disconnected
    es.addEventListener('connected', () => this.refresh());

    es.onerror = () => {
      // If the connection just dropped, the browser retries by itself.
      // If it was refused (e.g. expired login), it stays closed: retry later.
      if (es.readyState === EventSource.CLOSED) {
        this.eventSource = undefined;
        this.scheduleReconnect();
      }
    };

    this.eventSource = es;
  }

  /** Call on logout. */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.eventSource?.close();
    this.eventSource = undefined;
    this.notificationsSubject.next([]);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, 15_000);
  }
}