import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <LoginForm error={error ?? null} />;
}
