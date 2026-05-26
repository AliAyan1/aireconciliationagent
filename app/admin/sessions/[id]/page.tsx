import { AdminSessionView } from "@/components/AdminSessionView";

export default async function AdminSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminSessionView sessionId={id} />;
}
