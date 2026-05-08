"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function AddToHomeScreenPrompt({ compact = false }: { compact?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(display-mode: standalone)").matches ||
        Boolean(("standalone" in window.navigator && window.navigator.standalone)),
  );

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const isIosSafari = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  }, []);

  if (dismissed || isStandalone || (!installEvent && !isIosSafari)) {
    return null;
  }

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    setInstallEvent(null);
    setDismissed(true);
  };

  return (
    <div
      className={`rounded-[1.75rem] border border-black/[0.08] bg-[#fffaf0]/95 p-4 shadow-[0_18px_55px_rgba(17,17,17,0.12)] ${
        compact ? "" : "mx-auto max-w-3xl"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#111111] text-brand-green">
            {isIosSafari ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-black text-text-primary">Add FrancScore to Home Screen</div>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {isIosSafari
                ? "On iPhone Safari, tap Share, then Add to Home Screen."
                : "Install the app for a focused mobile study experience."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {installEvent ? (
            <button type="button" className="btn btn-primary text-xs" onClick={install}>
              Add app
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-full bg-black/[0.06] px-4 py-2 text-xs font-black text-text-secondary"
            onClick={() => setDismissed(true)}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
