"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Nav() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const role = session.user.role;
  const home =
    role === "admin"
      ? "/admin"
      : role === "supervisor"
        ? "/supervisor"
        : "/intern";

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href={home} className="font-semibold">
          Bird Records
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">
            {session.user.email}{" "}
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide">
              {role}
            </span>
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
