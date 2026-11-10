/**
 * Lightweight Node-side check of playback-state semantics via vm-free duplicate logic.
 * Frontend playback-state.js is IIFE browser code; mirror key transitions here.
 */
import { describe, expect, it } from "vitest";

type Phase =
  | "idle"
  | "preparing"
  | "play_request"
  | "playing"
  | "paused"
  | "prepare_error"
  | "play_error"
  | "ended";

function nextPhase(phase: Phase, event: string): Phase {
  if (event === "prepare_start") return "preparing";
  if (event === "prepare_fail") return "prepare_error";
  if (event === "play_request") return "play_request";
  if (event === "host_playing") {
    if (phase === "play_request" || phase === "preparing" || phase === "paused") return "playing";
    return phase === "idle" ? "playing" : phase;
  }
  if (event === "host_paused") {
    if (phase === "playing") return "paused";
    return phase;
  }
  if (event === "play_fail") return "play_error";
  return phase;
}

describe("playback phase transitions", () => {
  it("click is not success until host_playing", () => {
    let p: Phase = "idle";
    p = nextPhase(p, "prepare_start");
    expect(p).toBe("preparing");
    p = nextPhase(p, "play_request");
    expect(p).toBe("play_request");
    expect(p).not.toBe("playing");
    p = nextPhase(p, "host_playing");
    expect(p).toBe("playing");
  });

  it("prepare_error keeps distinct from play_error", () => {
    let p: Phase = "preparing";
    p = nextPhase(p, "prepare_fail");
    expect(p).toBe("prepare_error");
    p = nextPhase("play_request", "play_fail");
    expect(p).toBe("play_error");
  });

  it("paused from playing", () => {
    expect(nextPhase("playing", "host_paused")).toBe("paused");
  });

  it("prepare_error and play_error stay distinct for retry UX", () => {
    expect(nextPhase("preparing", "prepare_fail")).not.toBe(
      nextPhase("play_request", "play_fail")
    );
  });
});
