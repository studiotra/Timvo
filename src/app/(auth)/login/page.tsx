import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; signup?: string }>;
}) {
  return (
    <Suspense fallback={<LoginForm error={null} />}>
      <LoginFormWrapper searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; signup?: string }>;
}) {
  const { error, next, signup } = await searchParams;
  return (
    <LoginForm
      error={error ?? null}
      next={next ?? null}
      signupContractor={signup === "contractor"}
    />
  );
}
