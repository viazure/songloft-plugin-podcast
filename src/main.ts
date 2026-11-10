import type { HTTPRequest, HTTPResponse } from "@songloft/plugin-sdk";
import { handleHTTP } from "./router";
import { refreshScheduler } from "./schedule";
import { loadRefreshSchedule, loadSubscriptions, saveRefreshSchedule } from "./store";
import { runScheduledRefreshAll } from "./refresh";
import { subscribePlayEvents, unsubscribePlayEvents } from "./playEvents";

async function onInit(): Promise<void> {
  refreshScheduler.setPersist(async (st) => {
    await saveRefreshSchedule(st);
  });
  refreshScheduler.setOnTick(async () => {
    await runScheduledRefreshAll();
  });
  const saved = await loadRefreshSchedule();
  await refreshScheduler.applyState(saved, { rearm: true, persist: false });

  // P1: background history/progress when host broadcasts play events.
  // Without the `events` permission (or on older hosts) this no-ops and only
  // the plugin page can write play_history / progress.
  const eventsOk = subscribePlayEvents();

  const subs = await loadSubscriptions();
  songloft.log.info(
    `[podcast] ready; subscriptions=${subs.length}; playEvents=${eventsOk ? "on" : "off"}`
  );
  if (saved.enabled) {
    songloft.log.info(
      `[podcast] refresh schedule armed: every ${saved.intervalHours}h; nextDue=${
        saved.nextDueAt ? new Date(saved.nextDueAt).toISOString() : "(pending)"
      }`
    );
  }
}

async function onDeinit(): Promise<void> {
  unsubscribePlayEvents();
  refreshScheduler.dispose();
  songloft.log.info("[podcast] stopped");
}

async function onHTTPRequest(req: HTTPRequest): Promise<HTTPResponse> {
  return await handleHTTP(req);
}

globalThis.onInit = onInit;
globalThis.onDeinit = onDeinit;
globalThis.onHTTPRequest = onHTTPRequest;
