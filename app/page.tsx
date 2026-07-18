import { redirect } from "next/navigation";

export default function Home() {
  // Dashboard layout enforces auth and bounces to /login when signed out.
  redirect("/dashboard");
}
