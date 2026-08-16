import { redirect } from "next/navigation";

export default async function OrganizationMembersIndexPage({
  params,
}: {
  params: Promise<{ }>;
}) {
  
  redirect(`/organization/members/list`);
}
