"use client";
import DokumenChief from "./DokumenChief";

const MenungguAksi = ({ documents }: { documents: any[] }) => {
  if (!documents || documents.length === 0) {
    return null; // The parent component will handle the empty state message
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DokumenChief key={doc.id} doc={doc} />
      ))}
    </div>
  );
};

export default MenungguAksi;
