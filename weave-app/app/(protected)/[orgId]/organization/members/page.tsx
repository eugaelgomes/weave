import { redirect } from "next/navigation";

export default async function OrganizationMembersIndexPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/${orgId}/organization/members/list`);
}
