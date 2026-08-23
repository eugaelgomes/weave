import { redirect } from "next/navigation";

export default async function OrganizationIndexPage({
  params,
}: {
  params: Promise<Record<string, never>>;
}) {
  redirect(`/organization/general`);
}
