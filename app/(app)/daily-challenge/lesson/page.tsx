"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LessonRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/daily-challenge");
  }, [router]);
  return null;
}
