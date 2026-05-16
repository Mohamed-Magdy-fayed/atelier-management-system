export type BranchGridRow = {
  id: string;
  shortCode: string;
  nameEn: string;
  nameAr: string;
  addressEn: string | null;
  addressAr: string | null;
  phone: string | null;
  opensAt: string | null;
  closesAt: string | null;
  mapUrl: string | null;
  ownerId: string | null;
  ownerName: string | null;
  memberCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};
