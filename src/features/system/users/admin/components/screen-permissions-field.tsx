"use client";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SCREEN_ACTIONS,
  type ScreenAction,
  type ScreenPermissionMap,
} from "@/features/core/auth/core/screen-permission-map";
import { useTranslation } from "@/features/core/i18n/client";
import {
  GRANTABLE_SCREEN_DEFINITIONS,
  type ScreenKey,
} from "@/features/system/registry";

const ACTION_LABEL_KEYS = {
  view: "systemPages.screenActionView",
  create: "systemPages.screenActionCreate",
  update: "systemPages.screenActionUpdate",
  delete: "systemPages.screenActionDelete",
} as const satisfies Record<ScreenAction, `systemPages.${string}`>;

type ScreenPermissionsFieldProps = {
  value: ScreenPermissionMap;
  onChange: (next: ScreenPermissionMap) => void;
  disabled?: boolean;
};

/**
 * Screens × actions matrix for one employee.
 *
 * Rows come from `GRANTABLE_SCREEN_DEFINITIONS`, so the admin-only screens
 * (Branches, Settings, Employees) never appear — their mutations are guarded by
 * `assertAdminRole` on the server, and a checkbox that changes nothing is worse
 * than no checkbox.
 */
export function ScreenPermissionsField({
  value,
  onChange,
  disabled,
}: ScreenPermissionsFieldProps) {
  const { t } = useTranslation();

  const toggle = useCallback(
    (screenKey: ScreenKey, action: ScreenAction, checked: boolean) => {
      const current = new Set(value[screenKey] ?? []);
      if (checked) {
        current.add(action);
        // Every other action implies being able to open the screen at all;
        // granting "delete" without "view" would hide the row it acts on.
        current.add("view");
      } else {
        current.delete(action);
        if (action === "view") current.clear();
      }

      const next: ScreenPermissionMap = { ...value };
      if (current.size === 0) {
        delete next[screenKey];
      } else {
        next[screenKey] = SCREEN_ACTIONS.filter((a) => current.has(a));
      }
      onChange(next);
    },
    [onChange, value],
  );

  const toggleRow = useCallback(
    (screenKey: ScreenKey, allGranted: boolean) => {
      const next: ScreenPermissionMap = { ...value };
      if (allGranted) {
        delete next[screenKey];
      } else {
        next[screenKey] = [...SCREEN_ACTIONS];
      }
      onChange(next);
    },
    [onChange, value],
  );

  const hasAny = Object.keys(value).length > 0;

  return (
    <Field>
      <FieldLabel>{String(t("systemPages.userScreenPermissions"))}</FieldLabel>
      <FieldDescription>
        {String(t("systemPages.userScreenPermissionsHint"))}
      </FieldDescription>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-32">
                {String(t("systemPages.userScreenPermissionsScreenColumn"))}
              </TableHead>
              {SCREEN_ACTIONS.map((action) => (
                <TableHead key={action} className="text-center">
                  {String(t(ACTION_LABEL_KEYS[action]))}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {GRANTABLE_SCREEN_DEFINITIONS.map((screen) => {
              const granted = value[screen.key] ?? [];
              const allGranted = granted.length === SCREEN_ACTIONS.length;

              return (
                <TableRow key={screen.key}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      disabled={disabled}
                      className="text-start hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      title={String(
                        t("systemPages.userScreenPermissionsSelectAllRow"),
                      )}
                      onClick={() => toggleRow(screen.key, allGranted)}
                    >
                      {screen.navTranslationKey
                        ? String(t(`systemPages.${screen.navTranslationKey}`))
                        : screen.key}
                    </button>
                  </TableCell>
                  {SCREEN_ACTIONS.map((action) => (
                    <TableCell key={action} className="text-center">
                      <Checkbox
                        checked={granted.includes(action)}
                        disabled={disabled}
                        aria-label={`${String(t(ACTION_LABEL_KEYS[action]))} — ${
                          screen.navTranslationKey
                            ? String(
                                t(`systemPages.${screen.navTranslationKey}`),
                              )
                            : screen.key
                        }`}
                        onCheckedChange={(checked) =>
                          toggle(screen.key, action, checked === true)
                        }
                        className="mx-auto"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {hasAny ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange({})}
        >
          {String(t("systemPages.userScreenPermissionsClearAll"))}
        </Button>
      ) : null}
    </Field>
  );
}
