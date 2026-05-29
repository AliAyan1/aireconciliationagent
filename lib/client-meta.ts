export function applyClientMeta(meta: { title: string; description?: string }) {
  if (typeof document === "undefined") return;

  document.title = meta.title;

  if (meta.description) {
    let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.name = "description";
      document.head.appendChild(el);
    }
    el.content = meta.description;
  }
}

