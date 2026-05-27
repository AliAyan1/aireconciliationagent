import { ShareViewLoader } from "./ShareViewLoader";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ShareViewLoader token={token} />;
}
