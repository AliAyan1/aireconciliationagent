"use client";

import { useSyncExternalStore } from "react";
import {
  ensureAudioContext,
  getSoundMuteSnapshot,
  playApproveDing,
  subscribeSoundMute,
  toggleSoundsMuted,
} from "@/lib/ui-sounds";

function subscribeNoop() {
  return () => {};
}

function getClientMounted() {
  return true;
}

function getServerMounted() {
  return false;
}

export function SoundMuteToggle() {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted
  );

  const muted = useSyncExternalStore(
    subscribeSoundMute,
    getSoundMuteSnapshot,
    () => false
  );

  if (!mounted) {
    return (
      <span
        className="inline-block h-9 w-9 rounded-lg border border-default bg-card"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        ensureAudioContext();
        const nowMuted = toggleSoundsMuted();
        if (!nowMuted) playApproveDing();
      }}
      className="btn-ghost flex h-9 w-9 items-center justify-center rounded-lg p-0"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      aria-pressed={muted}
      title={muted ? "Sounds off — click to unmute" : "Sounds on — click to mute"}
    >
      <span className="text-lg leading-none" aria-hidden>
        {muted ? "🔇" : "🔊"}
      </span>
    </button>
  );
}
