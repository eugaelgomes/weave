"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectBody() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/weave-engine/compose${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function ComposeInsightRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectBody />
    </Suspense>
  );
}
