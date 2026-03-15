"use client";

import { useAuth } from "../../../../_contexts/auth-context";

const AboutOrg = () => {
      const { user } = useAuth();
    
  return (
    <div className="flex h-full w-full items-center justify-center">
      <h1 className="text-2xl font-bold">
        Veja tudo sobre {user?.org_name ?? "a organização"}
      </h1>
    </div>
  );
}

export default AboutOrg;