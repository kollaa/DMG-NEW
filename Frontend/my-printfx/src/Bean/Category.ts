 export interface Category {
  id: number;
  name: string;
  displayOrder: number;
  productCount: number;
}

export interface CategoryList {
  categories: Category[];
  uncategorizedCount: number;
}