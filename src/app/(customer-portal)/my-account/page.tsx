import { AlertCircleIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { DressViewDialog } from "@/components/dress-view-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Lead, Muted } from "@/components/ui/typography";
import { getAuth } from "@/features/core/auth/nextjs/actions";
import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { CustomerAccountActions } from "@/features/customer-portal/components/customer-account-actions";
import { CustomerPhotoUpload } from "@/features/customer-portal/components/customer-photo-upload";
import { DressQrShare } from "@/features/customer-portal/components/dress-qr-share";
import { ReservationReceiptSheet } from "@/features/customer-portal/components/reservation-receipt-sheet";
import { getCustomerPortalData } from "@/features/customer-portal/server/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusLabelKey = {
  reserved: "systemPages.reservationStatusReserved",
  pickedUp: "systemPages.reservationStatusPickedUp",
  returned: "systemPages.reservationStatusReturned",
  cancelled: "systemPages.reservationStatusCancelled",
} as const;

const statusBorderClass: Record<string, string> = {
  reserved: "border-s-4 border-s-primary",
  pickedUp: "border-s-4 border-s-accent",
  returned: "border-s-4 border-s-secondary",
  cancelled: "border-s-4 border-s-muted",
};

const PICKUP_REMINDER_DAYS = 7;
const RETURN_REMINDER_DAYS = 3;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function MyAccountPage() {
  const auth = await getAuth();
  if (!auth.isAuthenticated) return null;

  const { t } = await getT();
  const locale = await getLocaleCookie();
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const { stats, reservations } = await getCustomerPortalData(
    auth.session.user.id,
  );

  const fmtMoney = (n: number) => formatCurrency(n, currencyLocale);
  const fmtDate = (d: Date) => formatDate(d, {}, currencyLocale);

  const now = new Date();

  type ReminderKind =
    | "pickupOverdue"
    | "pickupUpcoming"
    | "returnOverdue"
    | "returnSoon";

  const reminders = reservations.flatMap((row) => {
    const branchName = locale === "ar" ? row.branchNameAr : row.branchNameEn;
    const branchAddress =
      locale === "ar" ? row.branchAddressAr : row.branchAddressEn;

    if (row.status === "reserved") {
      if (row.receivingDateTime < now) {
        return [
          {
            kind: "pickupOverdue" as ReminderKind,
            row,
            branchName,
            branchAddress,
            date: row.receivingDateTime,
          },
        ];
      }
      if (row.receivingDateTime <= addDays(now, PICKUP_REMINDER_DAYS)) {
        return [
          {
            kind: "pickupUpcoming" as ReminderKind,
            row,
            branchName,
            branchAddress,
            date: row.receivingDateTime,
          },
        ];
      }
    }

    if (row.status === "pickedUp") {
      if (row.returnDateTime < now) {
        return [
          {
            kind: "returnOverdue" as ReminderKind,
            row,
            branchName,
            branchAddress,
            date: row.returnDateTime,
          },
        ];
      }
      if (row.returnDateTime <= addDays(now, RETURN_REMINDER_DAYS)) {
        return [
          {
            kind: "returnSoon" as ReminderKind,
            row,
            branchName,
            branchAddress,
            date: row.returnDateTime,
          },
        ];
      }
    }

    return [];
  });

  const reminderStyles: Record<
    ReminderKind,
    { className: string; title: string; preposition: string }
  > = {
    pickupOverdue: {
      className: "border-destructive bg-destructive/10 text-destructive",
      title: t("customerPortal.reminderPickupOverdue"),
      preposition: t("customerPortal.reminderAt"),
    },
    pickupUpcoming: {
      className: "border-primary bg-primary/10 text-primary",
      title: t("customerPortal.reminderPickupUpcoming"),
      preposition: t("customerPortal.reminderAt"),
    },
    returnOverdue: {
      className: "border-destructive bg-destructive/10 text-destructive",
      title: t("customerPortal.reminderReturnOverdue"),
      preposition: t("customerPortal.reminderBy"),
    },
    returnSoon: {
      className: "border-accent bg-accent/10 text-accent-foreground",
      title: t("customerPortal.reminderReturnSoon"),
      preposition: t("customerPortal.reminderBy"),
    },
  };

  const statCards = [
    {
      label: t("customerPortal.statTotalReservations"),
      value: stats.totalReservations,
    },
    { label: t("customerPortal.statActive"), value: stats.activeReservations },
    {
      label: t("customerPortal.statCompleted"),
      value: stats.completedReservations,
    },
    {
      label: t("customerPortal.statTotalSpent"),
      value: fmtMoney(stats.totalSpent),
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <H1 className="font-serif text-3xl tracking-tight md:text-4xl">
          {t("customerPortal.title")}
        </H1>
        <Lead className="text-muted-foreground">
          {t("customerPortal.lead")}
        </Lead>
        <CustomerAccountActions />
        {!stats.linkedByPhone ? (
          <Muted className="block text-xs leading-relaxed">
            {t("customerPortal.phoneHint")}
          </Muted>
        ) : null}
      </header>

      {reminders.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-medium text-lg tracking-tight">
            {t("customerPortal.remindersTitle")}
          </h2>
          <ul className="space-y-2">
            {reminders.map(({ kind, row, branchName, branchAddress, date }) => {
              const style = reminderStyles[kind];
              return (
                <li key={`${kind}-${row.id}`}>
                  <Alert className={cn("py-3", style.className)}>
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm font-medium leading-none">
                      {style.title}
                    </AlertTitle>
                    <AlertDescription className="mt-1 text-xs opacity-90">
                      <span className="font-medium">{row.dressTitle}</span>
                      {" · "}
                      {style.preposition} {branchName}
                      {" · "}
                      {fmtDate(date)}
                      {branchAddress ? (
                        <span className="ms-1 opacity-75">
                          · {branchAddress}
                        </span>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="scroll-mt-20 space-y-4" id="overview">
        <h2 className="font-medium text-lg tracking-tight">
          {t("customerPortal.overviewTitle")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {statCards.map((card) => (
            <Card key={card.label} className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {card.value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="scroll-mt-20 space-y-4" id="reservations">
        <h2 className="font-medium text-lg tracking-tight">
          {t("customerPortal.reservationsTitle")}
        </h2>
        {reservations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Muted>{t("customerPortal.reservationsEmpty")}</Muted>
              <Link
                className="mt-4 inline-block text-primary text-sm underline-offset-4 hover:underline"
                href="/#catalog"
              >
                {t("landing.primaryGuest")}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {reservations.map((row) => {
              const branchName =
                locale === "ar" ? row.branchNameAr : row.branchNameEn;
              const branchAddress =
                locale === "ar" ? row.branchAddressAr : row.branchAddressEn;
              const statusKey =
                statusLabelKey[row.status as keyof typeof statusLabelKey];
              const remaining = row.totalPrice - row.totalPaid;

              return (
                <li key={row.id}>
                  <Card
                    className={cn(
                      "overflow-hidden border-border/80 shadow-sm",
                      statusBorderClass[row.status] ?? "",
                    )}
                  >
                    <CardHeader className="gap-2 space-y-0 pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base leading-snug">
                            {row.dressTitle}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {row.reservationCode} · {row.dressCode}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {statusKey ? t(statusKey) : row.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <Muted className="text-xs">
                              {t("publicCatalog.branchSectionTitle")}
                            </Muted>
                            <p>{branchName}</p>
                            {branchAddress ? (
                              <p className="mt-0.5 flex items-start gap-1 text-muted-foreground text-xs">
                                <MapPinIcon className="mt-0.5 h-3 w-3 shrink-0" />
                                {branchAddress}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <Muted className="text-xs">
                              {t("customerPortal.occasionDate")}
                            </Muted>
                            <p>{fmtDate(row.occasionDate)}</p>
                          </div>
                          {row.status === "reserved" ? (
                            <div>
                              <Muted className="text-xs">
                                {t("customerPortal.pickupDateLabel")}
                              </Muted>
                              <p className="flex items-center gap-1 font-medium text-primary">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {fmtDate(row.receivingDateTime)}
                              </p>
                            </div>
                          ) : null}
                          {row.status === "pickedUp" ? (
                            <div>
                              <Muted className="text-xs">
                                {t("customerPortal.returnDateLabel")}
                              </Muted>
                              <p className="flex items-center gap-1 font-medium text-accent-foreground">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {fmtDate(row.returnDateTime)}
                              </p>
                            </div>
                          ) : null}
                          <div>
                            <Muted className="text-xs">
                              {t("customerPortal.totalLabel")}
                            </Muted>
                            <p className="font-medium tabular-nums">
                              {fmtMoney(row.totalPrice)}
                            </p>
                          </div>
                          <div>
                            <Muted className="text-xs">
                              {t("customerPortal.paidLabel")}
                            </Muted>
                            <p className="tabular-nums">
                              {fmtMoney(row.totalPaid)}
                            </p>
                          </div>
                          {remaining > 0 ? (
                            <div>
                              <Muted className="text-xs">
                                {t("customerPortal.remainingLabel")}
                              </Muted>
                              <p className="font-medium tabular-nums text-destructive">
                                {fmtMoney(remaining)}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0">
                          <DressQrShare
                            copiedLabel={t("customerPortal.dressShareCopied")}
                            dressId={row.dressId}
                            dressTitle={row.dressTitle}
                            scanLabel={t("customerPortal.dressQrScan")}
                            shareLabel={t("customerPortal.dressShareButton")}
                            size={104}
                          />
                        </div>
                      </div>
                      <CustomerPhotoUpload
                        photoUrl={row.customerPhotoUrl}
                        replaceLabel={t("customerPortal.photoUploadReplace")}
                        reservationId={row.id}
                        uploadPrompt={t("customerPortal.photoUploadPrompt")}
                      />
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2 pt-0">
                      <DressViewDialog
                        dressId={row.dressId}
                        showAdminDetails={false}
                        triggerLabel={String(t("customerPortal.viewDress"))}
                        staticData={{
                          title: row.dressTitle,
                          code: row.dressCode,
                          images: row.dressImages,
                          size: row.dressSize,
                          color: row.dressColor,
                          description: row.dressDescription,
                          pricePerDay: row.dressPricePerDay,
                          depositAmount: row.dressDepositAmount,
                          insurance: row.dressInsurance,
                        }}
                      />
                      <ReservationReceiptSheet
                        branchAddress={branchAddress}
                        branchName={branchName ?? ""}
                        branchPhone={row.branchPhone}
                        branchSection={t("customerPortal.receiptBranch")}
                        customerName={row.customerName}
                        customerPhone={row.customerPhone}
                        customerSection={t("customerPortal.receiptCustomer")}
                        datesSection={t("customerPortal.receiptDates")}
                        depositPaid={
                          row.depositPaid > 0 ? fmtMoney(row.depositPaid) : null
                        }
                        depositPaidLabel={t(
                          "customerPortal.receiptDepositPaid",
                        )}
                        discount={
                          row.discount > 0 ? fmtMoney(row.discount) : null
                        }
                        discountLabel={t("customerPortal.receiptDiscount")}
                        dressCode={row.dressCode}
                        dressSection={t("customerPortal.receiptDress")}
                        dressTitle={row.dressTitle}
                        insurance={
                          row.insurance > 0 ? fmtMoney(row.insurance) : null
                        }
                        insuranceLabel={t("customerPortal.receiptInsurance")}
                        notes={row.notes}
                        notesLabel={t("customerPortal.receiptNotes")}
                        occasionDate={fmtDate(row.occasionDate)}
                        occasionDateLabel={t(
                          "customerPortal.receiptOccasionDate",
                        )}
                        pickupDate={fmtDate(row.receivingDateTime)}
                        pickupDateLabel={t("customerPortal.receiptPickupDate")}
                        pricingSection={t("customerPortal.receiptPricing")}
                        remaining={remaining > 0 ? fmtMoney(remaining) : null}
                        remainingLabel={t("customerPortal.receiptRemaining")}
                        reservationCode={row.reservationCode}
                        returnDate={fmtDate(row.returnDateTime)}
                        returnDateLabel={t("customerPortal.receiptReturnDate")}
                        statusLabel={statusKey ? t(statusKey) : row.status}
                        totalPaid={fmtMoney(row.totalPaid)}
                        totalPaidLabel={t("customerPortal.receiptTotalPaid")}
                        totalPrice={fmtMoney(row.totalPrice)}
                        totalRentalLabel={t(
                          "customerPortal.receiptTotalRental",
                        )}
                        triggerLabel={t("customerPortal.receiptViewLink")}
                      />
                    </CardFooter>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
