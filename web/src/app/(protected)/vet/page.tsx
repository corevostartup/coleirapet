import { redirect } from "next/navigation";

export default function VetIndexPage() {
  redirect("/vet/pets");
}
