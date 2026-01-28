import { CornerLeftUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  color: "blue" | "green" | "red" | "yellow" | "orange";
  chart: number[];
}

const StatCard = ({ title, value, change, color, chart }: StatCardProps) => {
  const colorClasses = {
    blue: { text: "text-blue-600", chart: "bg-blue-200" },
    green: { text: "text-green-600", chart: "bg-green-200" },
    red: { text: "text-red-600", chart: "bg-red-200" },
    yellow: { text: "text-yellow-600", chart: "bg-yellow-200" },
    orange: { text: "text-orange-600", chart: "bg-orange-200" },
  };
  const selectedColor = colorClasses[color];

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex-1">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <div
            className={`text-xs flex items-center mt-1 ${selectedColor.text}`}
          >
            <CornerLeftUp className={`h-4 w-0`} />
            <span>+{change}% minggu lalu</span>
          </div>
        </div>
        <div className="h-12 flex items-end gap-1">
          {chart.map((bar, i) => (
            <div
              key={i}
              className={`w-2 rounded-full ${selectedColor.chart}`}
              style={{ height: `${bar}%` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
