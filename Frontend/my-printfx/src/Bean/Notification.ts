// Named AppNotification (not "Notification") because "Notification" is
// already a global type in TypeScript's DOM lib (the browser's Web
// Notifications API) — reusing that name causes confusing type conflicts.
export interface AppNotification {
  id: number;
  message: string;
  type: 'approval_request' | 'rejection_notice';
  orderId: number;
  read: boolean;
  createdDate: Date;
}