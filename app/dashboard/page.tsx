import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  const sessionParam =
    typeof params.session === "string" ? params.session : null;

  return <DashboardClient sessionParam={sessionParam} />;
}
