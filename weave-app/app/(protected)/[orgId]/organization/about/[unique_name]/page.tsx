import { redirect } from "next/navigation";

type AboutRedirectPageProps = {
  params: Promise<{ unique_name: string, orgId: string }>;
};

export default async function OrganizationAboutRedirectPage({ params }: AboutRedirectPageProps) {
  const { orgId } = await params;
  redirect(`/${orgId}/organization/editor`);
}
