import { redirect } from "next/navigation";

type AboutRedirectPageProps = {
  params: Promise<{ unique_name: string }>;
};

export default async function OrganizationAboutRedirectPage({ params }: AboutRedirectPageProps) {
  redirect(`/organization/editor`);
}
