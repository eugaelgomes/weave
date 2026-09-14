import { WorkspaceProvider } from "@/app/_contexts/workspace-context";

export default function WorkspaceCreateLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
