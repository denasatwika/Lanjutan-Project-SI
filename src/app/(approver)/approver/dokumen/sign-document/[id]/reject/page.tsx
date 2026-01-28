import RejectDocumentClient from "./RejectDocumentClient";

export default async function RejectDocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return <RejectDocumentClient id={id} />;
}
