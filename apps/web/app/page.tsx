import { brandosVersion, type HealthStatus } from "@brandos/shared";

async function getApiHealth(): Promise<HealthStatus | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as HealthStatus;
  } catch {
    return null;
  }
}

function HealthBadge({ health }: { health: HealthStatus | null }) {
  if (!health) {
    return (
      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200">
        API offline
      </span>
    );
  }

  return (
    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-200">
      API healthy: {health.service}
    </span>
  );
}

export default async function Home() {
  const health = await getApiHealth();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
          BrandOS monorepo
        </p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight">
          The operating system for brand intelligence.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          Next.js, NestJS, workers, shared packages, Postgres, and Redis are
          ready for the first real product slice.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <HealthBadge health={health} />
          <p className="text-sm text-zinc-500">Version {brandosVersion}</p>
        </div>
      </main>
    </div>
  );
}
