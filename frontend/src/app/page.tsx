import { cookies } from "next/headers";
import DisciplinePortal from "@/components/DisciplinePortal";

export default async function Home() {
  const hasSessionCookie = (await cookies()).has("sidisiplin_session");
  return <DisciplinePortal hasSessionCookie={hasSessionCookie} />;
}
