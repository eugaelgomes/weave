import React, { Suspense } from "react";
import Navbar from "@/app/auth/_components/navbar";
import Footer from "@/app/auth/_components/footer";
import FeaturesList from "@/app/auth/_components/features-list";
import SignUpForm from "./_components/sign-up-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar Conta - Weave Notes",
  description: "Crie sua conta no Weave Notes e comece a ser mais produtivo.",
};

export default function SignUp() {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b from-white via-neutral-50/40 to-white font-sans text-sm text-neutral-900 selection:bg-yellow-500/30 selection:text-yellow-900">
      <div className="w-full shrink-0">
        <Navbar ctaLabel="Entrar" ctaHref="/auth/signin" />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <FeaturesList />
        <Suspense
          fallback={
            <div className="flex w-full flex-1 items-center justify-center border-l border-neutral-100 bg-white lg:w-1/2 lg:flex-none">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            </div>
          }
        >
          <SignUpForm />
        </Suspense>
      </main>

      <div className="w-full shrink-0">
        <Footer />
      </div>
    </div>
  );
}
