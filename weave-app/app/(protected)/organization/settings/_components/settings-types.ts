import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Organization, OrganizationProperties } from "@/app/_services/organization";

export type EditableImage = "logo" | "banner";

export interface OrganizationInfoFormData {
  org_name: string;
  unique_name: string;
  slogan: string;
}

export type NestedSettingsSection = "features" | "notifications" | "branding";
export type DirectSettingsSection = Exclude<keyof OrganizationProperties, NestedSettingsSection>;

export type OnDirectPropertyChange = <S extends DirectSettingsSection>(
  section: S,
  value: OrganizationProperties[S]
) => Promise<void>;

export type OnNestedPropertyChange = <S extends NestedSettingsSection>(
  section: S,
  key: keyof NonNullable<OrganizationProperties[S]>,
  value: unknown
) => Promise<void>;

export interface WorkspaceOverviewProps {
  workspace: Organization | null;
  userIsOwner: boolean;
  setEditingImage: Dispatch<SetStateAction<EditableImage | null>>;
  setIsEditingInfo: Dispatch<SetStateAction<boolean>>;
  isEditingInfo: boolean;
  handleUpdateInfo: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  formData: OrganizationInfoFormData;
  setFormData: Dispatch<SetStateAction<OrganizationInfoFormData>>;
}

