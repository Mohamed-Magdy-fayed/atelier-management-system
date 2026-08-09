export type SettingGridRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isActive: boolean | null;
  /** Always null for a secret setting — the ciphertext never leaves the server. */
  value: string | null;
  amount: number | null;
  /** Masked tail (`••••8f2a`) for a secret setting, otherwise null. */
  valueHint: string | null;
  /** Whether a secret setting currently holds a value, for "keep current". */
  hasValue: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};
