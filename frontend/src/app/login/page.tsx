"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "../components/LoginPage";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://127.0.0.1:8000");

export default function LoginRoute() {
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (savedToken) {
      router.replace("/");
    }
  }, [router]);

  return (
    <LoginPage
      backendUrl={BACKEND_URL}
      onLoginSuccess={() => {
        router.push("/");
      }}
    />
  );
}
