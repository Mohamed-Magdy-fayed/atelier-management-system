export type ProductImportAction = "create" | "update" | "restore" | "skip";
export type ProductImportStatus = "valid" | "invalid" | "done";

export type ProductImportRowValues = {
  code: string;
  nameEn: string;
  nameAr: string;
  price: number;
  isActive: boolean;
};

export type ProductImportPreviewRow = {
  rowNumber: number;
  status: "valid" | "invalid";
  action: ProductImportAction;
  reasons: string[];
  values: ProductImportRowValues;
  targetProductId: string | null;
};

export type ProductImportCommitRow = {
  rowNumber: number;
  status: "done" | "invalid";
  action: ProductImportAction;
  reasons: string[];
  targetProductId: string | null;
};

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
