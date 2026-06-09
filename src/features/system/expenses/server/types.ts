export type ExpenseGridRow = {
  id: string;
  branchId: string;
  type: string;
  amount: number;
  dressId: string | null;
  dressCode: string | null;
  dressTitle: string | null;
  employeeId: string | null;
  employeeName: string | null;
  description: string;
  note: string | null;
  date: string;
  createdBy: string;
  createdAt: Date;
};
