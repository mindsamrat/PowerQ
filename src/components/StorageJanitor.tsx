"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution, purgeExpiredStorage } from "@/lib/client-session";

/**
 * Runs once per page load: deletes browser-stored quiz data older than 48 h
 * (as the privacy policy promises) and records first-touch attribution
 * (utm_* / Instagram referral) so revenue can be traced to a post.
 */
export default function StorageJanitor() {
  const pathname = usePathname();
  useEffect(() => {
    purgeExpiredStorage();
    captureAttribution(window.location.search, pathname ?? "/");
  }, [pathname]);
  return null;
}
