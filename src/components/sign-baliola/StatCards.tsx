"use client";

import StatCard from "./StatCard";
import { Document } from "./DokumenCard";

export default function StatCards({ documents }: { documents: Document[] }) {
  const totalCount = documents.length;
  const rejectedCount = documents.filter(doc => doc.status.toLowerCase() === 'rejected').length;
  const signedCount = documents.filter(doc => doc.status.toLowerCase() === 'signed').length;
  const draftCount = documents.filter(doc => doc.status.toLowerCase() === 'draft').length;
  const pendingCount = documents.filter(doc => doc.status.toLowerCase() === 'pending').length;

  const dynamicStats = [
    {
      title: "Total Dokumen",
      value: totalCount,
      change: 10,
      color: "blue" as const,
      chart: [70, 20, 40, 30, 40, 90],
    },
    {
      title: "Ditolak",
      value: rejectedCount,
      change: 14,
      color: "red" as const,
      chart: [50, 40, 30, 20, 40, 50],
    },
    {
      title: "Ditandatangani",
      value: signedCount,
      change: 30,
      color: "green" as const,
      chart: [20, 30, 50, 60, 80, 75],
    },
    {
      title: "Diproses",
      value: pendingCount,
      change: 30,
      color: "yellow" as const,
      chart: [40, 50, 45, 60, 70, 60],
    },
    {
      title: "Draft",
      value: draftCount,
      change: 20,
      color: "orange" as const,
      chart: [30, 40, 60, 50, 70, 80],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {dynamicStats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value.toString()}
          change={stat.change}
          color={stat.color}
          chart={stat.chart}
        />
      ))}
    </div>
  );
}
