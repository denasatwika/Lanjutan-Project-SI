import SignDocumentClient from "./SignDocumentClient";

export default async function SignDocumentModal({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await Promise.resolve(params);
  return <SignDocumentClient id={id} />;
}
