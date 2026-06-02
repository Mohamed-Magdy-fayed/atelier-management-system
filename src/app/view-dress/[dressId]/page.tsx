import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ dressId: string }>;
};

export default async function LegacyViewDressPage({ params }: Props) {
  const { dressId } = await params;
  redirect(`/collection/${dressId}`);
}
