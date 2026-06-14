import { redirect } from "next/navigation";

export default async function OrganizationSettingsRedirectPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/${orgId}/organization/general`);
}
