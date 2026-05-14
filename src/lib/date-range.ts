export interface DateRangeValue {
  from: Date;
  to: Date;
}

export interface DateRangePreset {
  id: string;
  label: string;
  getRange: () => DateRangeValue;
}
