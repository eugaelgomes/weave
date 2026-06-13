import { redirect } from "next/navigation";

export default async function WeaveAiRoot({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/${orgId}/weave-ai/agents`);
}
