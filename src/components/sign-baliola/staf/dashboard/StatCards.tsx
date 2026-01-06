"use client";

import StatCard from "@/components/sign-baliola/staf/dashboard/StatCard";
import { Document } from "@/components/sign-baliola/staf/dashboard/DokumenCard";

export default function StatCards({ documents }: { documents: Document[] }) {
  const totalCount = documents.length;
  const rejectedCount = documents.filter(
    (doc) => doc.status.toLowerCase() === "rejected"
  ).length;
  const signedCount = documents.filter(
    (doc) => doc.status.toLowerCase() === "signed"
  ).length;
  const draftCount = documents.filter(
    (doc) => doc.status.toLowerCase() === "draft"
  ).length;
  const pendingCount = documents.filter(
    (doc) => doc.status.toLowerCase() === "pending"
  ).length;

  const dynamicStats = [
    {
      title: "Total Dokumen",
      value: totalCount,
      change: 10,
      color: "blue" as const,
      chart: [20, 60, 40],
    },
    {
      title: "Ditolak",
      value: rejectedCount,
      change: 14,
      color: "red" as const,
      chart: [30, 40, 70],
    },
    {
      title: "Ditandatangani",
      value: signedCount,
      change: 30,
      color: "green" as const,
      chart: [40, 80, 75],
    },
    {
      title: "Diproses",
      value: pendingCount,
      change: 30,
      color: "yellow" as const,
      chart: [30, 70, 60],
    },
    {
      title: "Draft",
      value: draftCount,
      change: 20,
      color: "orange" as const,
      chart: [70, 40, 80],
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
