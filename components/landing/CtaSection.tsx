import Link from "next/link";

export function CtaSection() {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="gradient-border p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">
            Ready to run HisaabAI?
          </h2>
          <Link
            href="/login?role=team"
            className="btn-primary inline-block mt-8 px-10 py-4 text-lg"
          >
            Sign in to get started →
          </Link>
        </div>
      </div>
    </section>
  );
}
