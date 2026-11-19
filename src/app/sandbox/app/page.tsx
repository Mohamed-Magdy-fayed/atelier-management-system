import { redirect } from "next/navigation";

export default function SandboxAppIndex() {
  redirect("/branches");
}
