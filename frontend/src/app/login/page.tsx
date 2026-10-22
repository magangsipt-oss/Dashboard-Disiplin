import LoginForm, { type LoginRole } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ role?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { role } = await searchParams;
  const selectedRole: LoginRole =
    role === "dosen" || role === "admin" || role === "akademik" ? role : "mhs";

  return <LoginForm role={selectedRole} />;
}
