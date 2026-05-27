"use client";

import { useEffect, useState } from "react";
import {
  initDisplayPreferences,
  subscribeDisplayPreferences,
} from "@/lib/display-preferences";

/** Hydrates display prefs and re-renders children when currency/date/accent change. */
export function DisplayPreferencesInit({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, tick] = useState(0);

  useEffect(() => {
    initDisplayPreferences();
    return subscribeDisplayPreferences(() => {
      tick((n) => n + 1);
    });
  }, []);

  return <>{children}</>;
}
