import { redirect } from "next/navigation";

export default async function WorkspaceSettingsRedirectPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/workspace/${publicId}/settings/general`);
}
