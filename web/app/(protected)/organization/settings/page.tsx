import { redirect } from "next/navigation";

export default async function OrganizationSettingsRedirectPage({
  params,
}: {
  params: Promise<{ }>;
}) {
  
  redirect(`/organization/general`);
}
