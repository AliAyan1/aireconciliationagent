"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceReviewControlsProps {
  onApprove: () => void;
  onReject: () => void;
  onNext: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function VoiceReviewControls({
  onApprove,
  onReject,
  onNext,
  onSkip,
  disabled,
}: VoiceReviewControlsProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    setSupported(!!SR);
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-PK";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript?.toLowerCase() ?? "";
      if (transcript.includes("approve")) onApprove();
      else if (transcript.includes("reject")) onReject();
      else if (transcript.includes("next")) onNext();
      else if (transcript.includes("skip")) onSkip();
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
  }, [onApprove, onReject, onNext, onSkip]);

  const toggle = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || disabled) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }, [listening, disabled]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        listening
          ? "border-[var(--danger)] bg-[rgba(239,68,68,0.1)] text-[var(--danger)]"
          : "border-default text-secondary hover:border-accent"
      }`}
      title="Voice: say Approve, Reject, Next, or Skip"
    >
      {listening ? "🎤 Listening…" : "🎤 Voice"}
    </button>
  );
}
