import React, { Suspense } from "react";
import Navbar from "@/app/auth/_components/navbar";
import Footer from "@/app/auth/_components/footer";
import FeaturesList from "@/app/auth/_components/features-list";
import SignInForm from "./_components/sign-in-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar - Weave Notes",
  description: "Acesse sua conta do Weave Notes.",
};

export default function SignIn() {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b from-white via-neutral-50/40 to-white font-sans text-neutral-900 text-sm selection:bg-yellow-500/30 selection:text-yellow-900">
      
      <div className="w-full shrink-0">
        <Navbar />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <FeaturesList />
        <Suspense fallback={
          <div className="flex w-full flex-1 items-center justify-center border-l border-neutral-100 bg-white lg:w-1/2 lg:flex-none">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
          </div>
        }>
          <SignInForm />
        </Suspense>
      </main>

      <div className="w-full shrink-0">
        <Footer />
      </div>
    </div>
  );
}
