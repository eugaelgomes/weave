import { redirect } from "next/navigation";

export default async function WorkspaceByIdPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/workspace/${publicId}/general`);
}
