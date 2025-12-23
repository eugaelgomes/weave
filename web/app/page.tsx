"use client";
import { useAuth } from "./contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SignIn from "./auth/signin/page";

export default function Home() {
  const { authenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authenticated) {
      router.push("/app/home");
    }
  }, [authenticated, router]);

  // Login se não autenticado
  if (!authenticated) return <SignIn />;

  return null;
}
