import { redirect } from "next/navigation";

export default async function OrganizationIndexPage({
  params,
}: {
  params: Promise<{ }>;
}) {
  
  redirect(`/organization/general`);
}
