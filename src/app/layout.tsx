// src/app/layout.tsx
import './globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // app/layout.tsx
    <html lang="id"><body className="font-sans">{children}</body></html>
  );
}
