import ConfirmSignClient from "./ConfirmSignClient";

export default async function ConfirmSignPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await Promise.resolve(params); // contoh agar tidak error
  return <ConfirmSignClient id={id} />;
}
