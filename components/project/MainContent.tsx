"use client";

import React, { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../layout/ErrorBoundary";

interface MainContentProps {
  children: React.ReactNode;
  enhancedProps: Record<string, unknown>;
}

export default function MainContent({ children, enhancedProps }: MainContentProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <ErrorBoundary>
      <main 
        ref={mainRef}
        className="flex-1 py-5 md:py-6 px-4 md:px-6 lg:px-8 overflow-y-auto h-full"
        style={{
          scrollBehavior: 'smooth'
        }}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, enhancedProps)
            : child
        )}
      </main>
    </ErrorBoundary>
  );
}