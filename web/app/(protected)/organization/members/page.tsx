import { redirect } from "next/navigation";

export default async function OrganizationMembersIndexPage({
  params,
}: {
  params: Promise<Record<string, never>>;
}) {
  redirect(`/workspace/members/list`);
}
