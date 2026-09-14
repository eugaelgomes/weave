import { redirect } from "next/navigation";

export default async function WorkspaceMembersIndexPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/workspace/${encodeURIComponent(publicId)}/members/list`);
}
