export type ProductGridRow = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  price: number;
  isActive: boolean;
  createdAt: Date | null;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};
