export interface Product {
  id: number;
  name: string;
  imageUrl: string;
  imageUrlBack: string;
  description: string;
  orderConfig?: string | null; // JSON text, see Bean/order-config.ts
}
