// Redirect ke dashboard utama (Kehadiran)
import { redirect } from 'next/navigation'
export default function Page() {
  redirect('/admin/dashboard/kehadiran')
}
