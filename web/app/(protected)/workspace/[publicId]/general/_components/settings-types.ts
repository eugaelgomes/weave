import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Workspace, WorkspaceProperties } from "@/app/_services/workspace";

export type EditableImage = "logo" | "banner";

export interface WorkspaceInfoFormData {
  workspace_name: string;
  unique_name: string;
  slogan: string;
}

export type NestedSettingsSection = "features" | "notifications" | "branding";
export type DirectSettingsSection = Exclude<keyof WorkspaceProperties, NestedSettingsSection>;

export type OnDirectPropertyChange = <S extends DirectSettingsSection>(
  section: S,
  value: WorkspaceProperties[S]
) => Promise<void>;

export type OnNestedPropertyChange = <S extends NestedSettingsSection>(
  section: S,
  key: keyof NonNullable<WorkspaceProperties[S]>,
  value: unknown
) => Promise<void>;

export interface WorkspaceOverviewProps {
  workspace: Workspace | null;
  userIsOwner: boolean;
  setEditingImage: Dispatch<SetStateAction<EditableImage | null>>;
  setIsEditingInfo: Dispatch<SetStateAction<boolean>>;
  isEditingInfo: boolean;
  handleUpdateInfo: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  formData: WorkspaceInfoFormData;
  setFormData: Dispatch<SetStateAction<WorkspaceInfoFormData>>;
}
