export type BranchGridRow = {
  id: string;
  nameEn: string;
  nameAr: string;
  ownerId: string | null;
  ownerName: string | null;
  memberCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};
