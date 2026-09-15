import { redirect } from "next/navigation";

type AboutRedirectPageProps = {
  params: Promise<{ unique_name: string; publicId: string }>;
};

export default async function WorkspaceAboutRedirectPage({ params }: AboutRedirectPageProps) {
  const { publicId } = await params;
  redirect(`/workspace/${publicId}/editor`);
}
