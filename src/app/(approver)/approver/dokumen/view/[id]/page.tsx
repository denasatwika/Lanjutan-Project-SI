import ViewDocumentClient from './ViewDocumentClient';

export default function ViewDocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return <ViewDocumentClient id={id} />;
}