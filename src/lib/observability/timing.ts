export function createRouteTimer(routeName: string, userId?: string | null) {
  const start = Date.now();
  const steps: Array<{ label: string; duration_ms: number }> = [];
  let last = start;

  return {
    step(label: string) {
      const now = Date.now();
      steps.push({ label, duration_ms: now - last });
      last = now;
    },
    done(extra?: Record<string, unknown>) {
      if (process.env.NODE_ENV !== "development") {
        return;
      }

      console.info("[timing]", {
        route: routeName,
        user_id: userId ?? null,
        duration_ms: Date.now() - start,
        steps,
        ...(extra ?? {}),
      });
    },
  };
}
