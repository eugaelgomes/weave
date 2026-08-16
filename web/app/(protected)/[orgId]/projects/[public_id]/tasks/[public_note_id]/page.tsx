import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ public_note_id: string }>;
};

/**
 * Alias route for project tasks; canonical note URL is /notes/{public_note_id}.
 */
export default async function ProjectTaskAliasPage({ params }: PageProps) {
  const { public_note_id: publicNoteId } = await params;
  redirect(`/notes/${publicNoteId}`);
}
