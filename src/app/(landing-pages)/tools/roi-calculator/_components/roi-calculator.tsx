"use client";

import { useState } from "react";

import { LinkButton } from "@/components/general/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatCurrency(amount: number, currency: "EGP" | "USD") {
  const formatter = new Intl.NumberFormat(
    currency === "EGP" ? "ar-EG" : "en-US",
    { style: "currency", currency, maximumFractionDigits: 0 },
  );
  return formatter.format(amount);
}

export function RoiCalculator() {
  const [teamSize, setTeamSize] = useState(5);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(100);
  const [currency, setCurrency] = useState<"EGP" | "USD">("EGP");

  const weeklyManualCost = teamSize * hoursPerWeek * hourlyRate;
  const annualManualCost = weeklyManualCost * 52;
  const automationSavings = annualManualCost * 0.7;

  return (
    <div className="bg-background rounded-2xl border p-8 shadow-sm">
      {/* Inputs */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Team size (people doing manual work)</Label>
          <Input
            type="number"
            min={1}
            max={1000}
            value={teamSize}
            onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label>Manual hours per person per week</Label>
          <Input
            type="number"
            min={1}
            max={80}
            value={hoursPerWeek}
            onChange={(e) =>
              setHoursPerWeek(Math.max(1, Number(e.target.value)))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Average hourly cost per person</Label>
          <Input
            type="number"
            min={1}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as "EGP" | "USD")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EGP">EGP — Egyptian Pound</SelectItem>
              <SelectItem value="USD">USD — US Dollar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 rounded-xl border bg-muted/30 p-6">
        <h3 className="mb-4 font-bold">Your Numbers</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-sm">
              Annual cost of manual work
            </p>
            <p className="text-destructive mt-1 text-2xl font-bold">
              {formatCurrency(annualManualCost, currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              Potential annual savings (70% automation)
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(automationSavings, currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              Hours reclaimed/year
            </p>
            <p className="text-primary mt-1 text-2xl font-bold">
              {(teamSize * hoursPerWeek * 52 * 0.7).toLocaleString()} hrs
            </p>
          </div>
        </div>

        <p className="text-muted-foreground mt-4 text-xs">
          * Based on 70% automation rate. Actual results vary by process
          complexity.
        </p>
      </div>

      <div className="mt-8 text-center">
        <p className="font-semibold">
          Want to automate this for your business?
        </p>
        <LinkButton
          href="/contact?source=roi-calculator"
          size="lg"
          className="mt-4"
        >
          Build This Automation For Us
        </LinkButton>
      </div>
    </div>
  );
}
