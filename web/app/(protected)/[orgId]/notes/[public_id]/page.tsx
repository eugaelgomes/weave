"use client";

import { useParams, useRouter } from "next/navigation";
import { SharedTaskDetail } from "@/app/(protected)/_components/shared-task-detail/shared-task-detail";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col bg-white text-[13px] dark:bg-[#1d1d1b]">
      <SharedTaskDetail
        taskId={params.public_id as string}
        isModal={false}
        onClose={() => router.back()}
      />
    </div>
  );
}
