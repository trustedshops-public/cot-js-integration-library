"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { cotAuthHandler } from "./actions/cot-auth-handler";
import { AnonymousConsumerData } from "@trustedshops-public/cot-integration-library";

export type CotSwitchProps = {
  tsid: string;
  onAuthenticationChange?: (authUser: AnonymousConsumerData | null) => void;
};

export default function CotSwitch({ tsid, onAuthenticationChange }: CotSwitchProps) {
  const searchParams = useSearchParams();
  const path = usePathname();
  const [isReady, setIsReady] = useState(false);

  const getCurrentCotUser = useCallback(async () => {
    try {
      const response = await fetch('/api/current-cot-user');
      if (!response.ok) {
        throw new Error('Failed to fetch current COT user');
      }
      return await response.json() as AnonymousConsumerData | null;
    } catch (error) {
      console.error("Error fetching current COT user:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    const redirectUriParam = `${window.location.origin}${path}`;

    cotAuthHandler(codeParam, redirectUriParam).then(() => {
      setIsReady(true);
      getCurrentCotUser().then((authUser) => {
        if (onAuthenticationChange) {
          onAuthenticationChange(authUser);
        }
      });
    }).catch((error) => {
      console.error("Error during authentication:", error);
    });
  }, [searchParams, path, onAuthenticationChange, getCurrentCotUser]);

  return (
    isReady ? (
      <>
        <trstd-switch tsid={tsid}></trstd-switch>
        <Script
          src="https://cdn.trstd-login-test.trstd.com/switch/switch.js"
          type="module"
        />
      </>
    ) : (
      <></>
    )
  );
}