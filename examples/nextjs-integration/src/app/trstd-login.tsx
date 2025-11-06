"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { handleCotAuthCallback } from "./actions/handle-cot-auth-callback";
import { ConsumerData } from "@trustedshops-public/cot-integration-library";

export type TrstdLoginProps = {
  tsid: string;
  onAuthenticationChange?: (authUser: ConsumerData | null) => void;
};

export default function TrstdLogin({ tsid, onAuthenticationChange }: Readonly<TrstdLoginProps>) {
  const searchParams = useSearchParams();
  const path = usePathname();
  const trstdLoginElementRef = useRef<HTMLElement>(null);

  const getCurrentCotUser = useCallback(async () => {
    try {
      const response = await fetch('/api/current-cot-user');
      if (!response.ok) throw new Error('Failed to fetch current COT user');
      return (await response.json()) as ConsumerData | null;
    } catch (error) {
      console.error("Error fetching current COT user:", error);
      return null;
    }
  }, []);

  // Handle authentication callback on mount or when search params/path changes
  useEffect(() => {
    const code = searchParams.get('code') ?? undefined;
    const redirectUri = `${window.location.origin}${path}`;
    handleCotAuthCallback(redirectUri, code).catch((error) => {
      console.error("Error during authentication:", error);
    });
  }, [searchParams, path]);

  // Handle trstd-login.auth events
  useEffect(() => {
    const handleAuthEvents = async (event: Event) => {
      const { detail } = event as CustomEvent;
      if (detail === "LOGGED_IN") {
        console.log("User logged in");
        const authUser = await getCurrentCotUser();
        onAuthenticationChange?.(authUser);
      } else if (detail === "LOGGED_OUT") {
        console.log("User logged out");
        onAuthenticationChange?.(null);
      }
    };

    const trstdLoginElement = trstdLoginElementRef.current;
    if (trstdLoginElement) trstdLoginElement.addEventListener("trstd-login.auth", handleAuthEvents);

    return () => {
      if (trstdLoginElement) trstdLoginElement.removeEventListener("trstd-login.auth", handleAuthEvents);
    };
  }, [getCurrentCotUser, onAuthenticationChange]);

  return (
    <>
      <trstd-login ref={trstdLoginElementRef} tsid={tsid}></trstd-login>
      <Script
        src="https://cdn.trstd-login-test.trstd.com/trstd-login/script.js"
        type="module"
        strategy="lazyOnload"
      />
    </>
  );
}
