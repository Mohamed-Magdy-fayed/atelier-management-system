export type SettingGridRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isActive: boolean | null;
  value: string | null;
  amount: number | null;
  createdAt: Date;
  updatedAt: Date | null;
};
