"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
      className="btn-primary !px-6 !py-3 text-base"
    >
      <span>تسجيل الدخول عبر ديسكورد</span>
    </button>
  );
}
