"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { Step1Profile } from "./_components/Step1Profile";
import { Step2Workspace } from "./_components/Step2Workspace";
import { Step3Complete } from "./_components/Step3Complete";

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam) {
      setCurrentStep(parseInt(stepParam, 10));
    } else if (user) {
      const completed = user.onboarding_state?.completed_steps || [];
      if (!completed.includes("profile")) {
        setCurrentStep(1);
      } else if (!completed.includes("workspace")) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    }
  }, [searchParams, user]);

  const handleNextStep = async () => {
    await refreshUser();
    setCurrentStep((prev) => prev + 1);
  };

  const handleComplete = async (workspaceId: string) => {
    await refreshUser();
    router.push(`/${workspaceId}/home`);
  };

  return (
    <div className="w-full">
      {currentStep === 1 && <Step1Profile onNext={handleNextStep} />}
      {currentStep === 2 && <Step2Workspace onNext={(workspaceId) => setCurrentStep(3)} />}
      {currentStep === 3 && <Step3Complete onComplete={handleComplete} />}
    </div>
  );
}
