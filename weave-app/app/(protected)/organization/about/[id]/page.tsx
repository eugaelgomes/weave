"use client";

import { useAuth } from "../../../../_contexts/auth-context";
import { OrganizationHeader } from "@/app/(protected)/_components/ui/headers/organization-header";

const AboutOrg = () => {
  const { user } = useAuth();

  return (
    <div className="flex h-full w-full flex-col">
      <OrganizationHeader />
      <div className="flex h-full w-full items-center justify-center">
        <h1 className="text-2xl font-bold">Veja tudo sobre {user?.org_name ?? "a organização"}</h1>
      </div>
    </div>
  );
};

export default AboutOrg;
