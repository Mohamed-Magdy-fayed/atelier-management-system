"use client";

import { CheckIcon, ChevronDownIcon, RotateCcwIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/button";
import { LanguageToggle, useTranslation } from "@/features/core/i18n/client";
import { whatsappUrl } from "../lib/lead";
import { SANDBOX_COOKIE, SANDBOX_COOKIE_MAX_AGE_SECONDS } from "../lib/routing";
import {
  getSandboxState,
  getServerSandboxState,
  resetSandboxState,
  type SandboxState,
  subscribeSandboxState,
} from "../state";
import { LeadDialog } from "./lead-dialog";
import "./try-experience.css";

type TourStep = {
  id: string;
  path: "/branches" | "/dresses";
  /** Button inside the app that opens this step's form, clicked for the visitor. */
  openSelector?: string;
  titleKey:
    | "sandbox.try.steps.branchesTitle"
    | "sandbox.try.steps.addressTitle"
    | "sandbox.try.steps.dressesTitle"
    | "sandbox.try.steps.dressTitle";
  bodyKey:
    | "sandbox.try.steps.branchesBody"
    | "sandbox.try.steps.addressBody"
    | "sandbox.try.steps.dressesBody"
    | "sandbox.try.steps.dressBody";
  doneKey?: "sandbox.try.steps.addressDone" | "sandbox.try.steps.dressDone";
  isComplete?: (state: SandboxState) => boolean;
};

const STEPS: readonly TourStep[] = [
  {
    id: "branches",
    path: "/branches",
    titleKey: "sandbox.try.steps.branchesTitle",
    bodyKey: "sandbox.try.steps.branchesBody",
  },
  {
    id: "address",
    path: "/branches",
    openSelector: '[data-tour="add-branch"]',
    titleKey: "sandbox.try.steps.addressTitle",
    bodyKey: "sandbox.try.steps.addressBody",
    doneKey: "sandbox.try.steps.addressDone",
    isComplete: (state) =>
      state.branches.some(
        (branch) =>
          branch.userCreated && Boolean(branch.addressEn || branch.addressAr),
      ),
  },
  {
    id: "dresses",
    path: "/dresses",
    titleKey: "sandbox.try.steps.dressesTitle",
    bodyKey: "sandbox.try.steps.dressesBody",
  },
  {
    id: "dress",
    path: "/dresses",
    openSelector: '[data-tour="add-dress"]',
    titleKey: "sandbox.try.steps.dressTitle",
    bodyKey: "sandbox.try.steps.dressBody",
    doneKey: "sandbox.try.steps.dressDone",
    isComplete: (state) => state.dresses.some((dress) => dress.userCreated),
  },
];

const STEP_STORAGE_KEY = "gl-sandbox:step";
const OPEN_POLL_MS = 150;
const OPEN_POLL_LIMIT_MS = 6000;

function setSandboxCookie(enabled: boolean) {
  // biome-ignore lint/suspicious/noDocumentCookie: same approach as the locale cookie in i18n/client.tsx
  document.cookie = enabled
    ? `${SANDBOX_COOKIE}=1; path=/; max-age=${SANDBOX_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
    : `${SANDBOX_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Clicks `selector` inside the demo frame once it exists, for the visitor. */
function openWhenReady(frameWindow: Window, selector: string) {
  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    const target = frameWindow.document.querySelector(selector);
    if (target) {
      window.clearInterval(timer);
      (target as HTMLElement).click();
    } else if (Date.now() - startedAt > OPEN_POLL_LIMIT_MS) {
      window.clearInterval(timer);
    }
  }, OPEN_POLL_MS);
  return () => window.clearInterval(timer);
}

export function TryExperience() {
  const { t, locale, dir } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const cancelOpenRef = useRef<(() => void) | null>(null);
  const navigatingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [leadOpen, setLeadOpen] = useState(false);

  const state = useSyncExternalStore(
    subscribeSandboxState,
    getSandboxState,
    getServerSandboxState,
  );

  // The sandbox screens are served only to browsers holding this cookie, so it
  // must be in place before the frame loads and removed when the page goes.
  useEffect(() => {
    setSandboxCookie(true);
    setReady(true);
    const onHide = () => setSandboxCookie(false);
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setSandboxCookie(true);
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      setSandboxCookie(false);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = Number.parseInt(
        window.localStorage.getItem(STEP_STORAGE_KEY) ?? "",
        10,
      );
      if (Number.isInteger(saved) && saved >= 0 && saved < STEPS.length) {
        setStepIndex(saved);
      }
    } catch {
      // Progress simply is not remembered.
    }
  }, []);

  const step = STEPS[stepIndex] ?? STEPS[0];
  const complete = step.isComplete?.(state) ?? true;
  const isLast = stepIndex === STEPS.length - 1;
  const allDone = isLast && complete;
  const branchAdded = STEPS[1].isComplete?.(state) ?? false;
  const dressAdded = STEPS[3].isComplete?.(state) ?? false;

  const driveFrame = useCallback((target: TourStep) => {
    cancelOpenRef.current?.();
    cancelOpenRef.current = null;

    const frame = frameRef.current;
    const frameWindow = frame?.contentWindow;
    if (!frame || !frameWindow) return;

    const open = () => {
      if (target.openSelector) {
        cancelOpenRef.current = openWhenReady(frameWindow, target.openSelector);
      }
    };

    try {
      if (frameWindow.location.pathname === target.path) {
        open();
      } else {
        navigatingRef.current = true;
        frame.addEventListener("load", open, { once: true });
        frameWindow.location.assign(target.path);
      }
    } catch {
      // Cross-origin or not yet loaded: the visitor can still use the frame.
    }
  }, []);

  // Drive the app whenever the step changes. Before the frame exists this is a
  // no-op; its `onLoad` picks the current step up instead.
  useEffect(() => {
    if (!ready) return;
    driveFrame(step);
    return () => cancelOpenRef.current?.();
  }, [ready, step, driveFrame]);

  function handleFrameLoad() {
    // A load we caused with `location.assign` is already handled by the
    // one-shot listener in `driveFrame`; only react to loads we did not start.
    if (navigatingRef.current) {
      navigatingRef.current = false;
      return;
    }
    driveFrame(step);
  }

  function goTo(index: number) {
    const clamped = Math.min(Math.max(index, 0), STEPS.length - 1);
    setStepIndex(clamped);
    try {
      window.localStorage.setItem(STEP_STORAGE_KEY, String(clamped));
    } catch {
      // Not remembered.
    }
  }

  function handleReset() {
    if (!window.confirm(String(t("sandbox.try.resetConfirm")))) return;
    resetSandboxState();
    goTo(0);
    setFrameVersion((version) => version + 1);
  }

  function scrollToPhone() {
    phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="try-root">
      <div className="try-inner">
        <header className="try-header" dir={dir}>
          <p className="font-semibold">{String(t("appName"))}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcwIcon aria-hidden />
              {String(t("sandbox.try.resetDemo"))}
            </Button>
            <LanguageToggle />
          </div>
        </header>

        <div className="try-grid">
          <div className="try-steps" dir={dir}>
            <p className="text-primary font-medium">
              {String(t("sandbox.try.eyebrow"))}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-balance sm:text-3xl">
              {String(t("sandbox.try.title"))}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-prose text-pretty">
              {String(t("sandbox.try.intro"))}
            </p>

            <h2 className="mt-6 mb-2 font-semibold">
              {String(t("sandbox.try.stepsHeading"))}
            </h2>
            <ol className="try-step-list">
              {STEPS.map((item, index) => {
                const isCurrent = index === stepIndex;
                const done = item.isComplete?.(state) ?? index < stepIndex;
                return (
                  <li
                    key={item.id}
                    className="try-step"
                    aria-current={isCurrent ? "step" : undefined}
                    data-done={done}
                  >
                    <span className="try-step-number" aria-hidden>
                      {done ? <CheckIcon className="size-4" /> : index + 1}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        <span className="sr-only">
                          {String(t("sandbox.try.stepLabel"))} {index + 1}:{" "}
                        </span>
                        {String(t(item.titleKey))}
                      </p>
                      {isCurrent ? (
                        <>
                          <p className="text-muted-foreground text-pretty">
                            {String(t(item.bodyKey))}
                          </p>
                          {item.doneKey && complete ? (
                            <output className="block text-primary font-medium">
                              {String(t(item.doneKey))}
                            </output>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0}
                onClick={() => goTo(stepIndex - 1)}
              >
                {String(t("sandbox.try.back"))}
              </Button>
              {!isLast ? (
                <Button
                  type="button"
                  variant={complete ? "default" : "outline"}
                  onClick={() => goTo(stepIndex + 1)}
                >
                  {String(t("sandbox.try.next"))}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="try-cue"
                onClick={scrollToPhone}
              >
                {String(t("sandbox.try.tryBelow"))}
                <ChevronDownIcon aria-hidden />
              </Button>
            </div>

            <div className="bg-card mt-6 space-y-3 rounded-xl border p-4">
              <p className="font-semibold">
                {String(
                  allDone
                    ? t("sandbox.try.allDoneTitle")
                    : t("sandbox.lead.title"),
                )}
              </p>
              {allDone ? (
                <p className="text-muted-foreground">
                  {String(t("sandbox.try.allDoneBody"))}
                </p>
              ) : null}
              <p className="text-muted-foreground">
                {String(t("sandbox.try.pricingNote"))}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={allDone ? "default" : "outline"}
                  onClick={() => setLeadOpen(true)}
                >
                  {String(t("sandbox.try.startFree"))}
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    // biome-ignore lint/a11y/useAnchorContent: Button supplies the link text through its children
                    <a
                      href={whatsappUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  {String(t("sandbox.try.whatsapp"))}
                </Button>
              </div>
            </div>

            <p className="text-muted-foreground mt-4">
              {String(t("sandbox.try.savedLocally"))}
            </p>
          </div>

          <div className="try-phone-col" ref={phoneRef}>
            <div className="try-phone">
              {ready ? (
                <iframe
                  key={`${locale}-${frameVersion}`}
                  ref={frameRef}
                  src="/branches"
                  title={String(t("sandbox.try.phoneLabel"))}
                  onLoad={handleFrameLoad}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <LeadDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        branchAdded={branchAdded}
        dressAdded={dressAdded}
      />
    </div>
  );
}
