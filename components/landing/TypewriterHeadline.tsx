const TEXT = "Reconcile transactions in seconds, not hours.";

export function TypewriterHeadline() {
  const steps = TEXT.length;

  return (
    <h1
      className="typewriter-headline max-w-[700px] text-4xl font-extrabold tracking-[-0.03em] text-primary sm:text-5xl md:text-[3rem] leading-[1.1]"
      style={
        {
          "--typewriter-chars": steps,
          "--typewriter-duration": "2.8s",
        } as React.CSSProperties
      }
    >
      <span className="typewriter-text" data-text={TEXT} />
      <span className="typewriter-cursor" aria-hidden />
    </h1>
  );
}
