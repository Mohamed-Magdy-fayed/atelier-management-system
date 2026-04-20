"use client";

import { Button } from "@/components/ui/button";
import type { DateRangePreset, DateRangeValue } from "@/lib/date-range";

interface DateRangePresetsProps {
    presets: DateRangePreset[];
    onSelect: (range: DateRangeValue) => void;
}

export function DateRangePresets({
    presets,
    onSelect,
}: DateRangePresetsProps) {
    if (!presets.length) return null;

    return (
        <div className="flex flex-wrap gap-1 border-t p-2">
            {presets.map((preset) => (
                <Button
                    className="h-7 min-w-24 flex-1"
                    key={preset.id}
                    onClick={() => onSelect(preset.getRange())}
                    size="sm"
                    type="button"
                    variant="outline"
                >
                    {preset.label}
                </Button>
            ))}
        </div>
    );
}
