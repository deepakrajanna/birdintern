import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "./SignInButton";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = session.user.role;
    if (role === "admin") redirect("/admin");
    if (role === "supervisor") redirect("/supervisor");
    redirect("/intern");
  }

  return (
    <div className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Bird Records</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sign in with your Google account. Access is restricted to authorized
        users.
      </p>
      <div className="mt-6">
        <SignInButton />
      </div>
    </div>
  );
}
