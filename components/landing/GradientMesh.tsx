export function GradientMesh() {
  return (
    <div className="gradient-mesh pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="gradient-mesh-blob gradient-mesh-blob-sky" />
      <div className="gradient-mesh-blob gradient-mesh-blob-purple" />
      <div className="gradient-mesh-blob gradient-mesh-blob-emerald" />
    </div>
  );
}
