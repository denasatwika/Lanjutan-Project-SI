"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenSquare, User } from "lucide-react";

const navItems = [
  { href: "/chief", icon: Home, label: "Home" },
  { href: "/chief/upload-signature", icon: PenSquare, label: "Upload" },
  { href: "/chief/profile", icon: User, label: "Profil" },
];

export default function Mobilenav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-4 right-4 bg-blue-950 rounded-2xl shadow-lg md:hidden">
      <div className="flex justify-around py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-full"
            >
              <item.icon
                className={`h-6 w-6 ${
                  isActive ? "text-red-500" : "text-white"
                }`}
              />
              <span
                className={`text-xs mt-1 font-medium ${
                  isActive ? "text-red-500" : "text-white"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
