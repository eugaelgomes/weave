"use client";

import { useRouter } from "next/navigation";
import AgentForm from "@/app/(protected)/_components/agent/agent-form";

export default function NewAgentPage() {
  const router = useRouter();

  return <AgentForm onCancel={() => router.push("/home")} onSuccess={() => router.push("/home")} />;
}
