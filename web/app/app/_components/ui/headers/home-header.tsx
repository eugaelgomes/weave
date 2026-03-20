"use client";

import React from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

const getFirstAndLastUserName = (fullName: string): string => {
  const names = fullName.trim().split(/\s+/);
  const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  if (names.length === 1) {
    return capitalize(names[0]);
  }

  const firstName = capitalize(names[0]);
  const lastName = capitalize(names[names.length - 1]);

  return `${firstName} ${lastName}`;
};

export function HomeHeader() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const userName = String(user?.user_name || user?.username || t.common.user);

  return (
    <BaseHeader
      leftContent={
        <>
          <span className="text-yellow-500">{t.greeting.hello}</span>{" "}
          {getFirstAndLastUserName(userName)}!
        </>
      }
    />
  );
}
