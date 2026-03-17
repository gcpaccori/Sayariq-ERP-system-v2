"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const authType = hashParams.get("type");

    if (authType === "recovery" && hashParams.get("access_token")) {
      window.location.replace(`/auth/reset-password${hash}`);
      return;
    }

    window.location.replace("/landing/v1.html");
  }, []);

  return null;
}
