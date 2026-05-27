const PARTICLE_COUNT = 50;

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  size: 2 + (i % 3),
  delay: `${(i * 0.37) % 8}s`,
  duration: `${6 + (i % 7) * 1.2}s`,
}));

export function ParticleField() {
  return (
    <div className="particle-field pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle-dot"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
