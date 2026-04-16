"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export interface CalendarPageViewContextValue {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
}

const CalendarPageViewContext = createContext<CalendarPageViewContextValue | null>(null);

export function CalendarPageViewProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const value = useMemo(
    () => ({ currentDate, setCurrentDate, selectedDate, setSelectedDate }),
    [currentDate, selectedDate]
  );

  return <CalendarPageViewContext.Provider value={value}>{children}</CalendarPageViewContext.Provider>;
}

export function useOptionalCalendarPageView(): CalendarPageViewContextValue | null {
  return useContext(CalendarPageViewContext);
}

export function useCalendarPageView(): CalendarPageViewContextValue {
  const ctx = useOptionalCalendarPageView();
  if (!ctx) {
    throw new Error("useCalendarPageView deve ser usado dentro de CalendarPageViewProvider");
  }
  return ctx;
}
