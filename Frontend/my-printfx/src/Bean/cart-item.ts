export interface CartItem {
  id: number;                // matches the backend Order entity's Long id
  productId: number;
  companyId: number;
  productName: string;      // e.g. "DMG BC"
  companyName: string;      // e.g. "DMG" or "Scott Petroleum"
  quantity: number;
  price: number;
  orderCode: string;        // e.g. "D-DMG-00000046" — assigned by the backend
  modifiedDate: Date;
  status: 'ready' | 'in-progress' | 'pending_approval' | 'pending_payment' | 'submitted';
  percentComplete: number;           // 0-100, only meaningful for 'in-progress'
  thumbnailDataUrl?: string; // snapshot of the customized card canvas — front side
  thumbnailDataUrlBack?: string; // snapshot of the back, if the product has one
  formDetails?: any;         // the bcForm/rcForm values, for editing later
}