'use client'
import { CameraCapture } from '@/components/CameraCapture'
import { useAuth } from '@/lib/state/auth'
import { useAttendance } from '@/lib/state/attendance'
import { toast } from 'sonner'

export default function Page(){
  const user = useAuth(s=>s.user)
  const checkIn = useAttendance(s=>s.checkIn)
  const handleCapture = (data?: string) => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu')
      return
    }
    checkIn(user.id, data)
    toast('Check-in recorded')
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Check-in</h1>
      {!user ? (
        <div className="card p-4 text-sm text-gray-600">Silakan login untuk melakukan check-in.</div>
      ) : (
        <CameraCapture onCapture={handleCapture} />
      )}
    </div>
  )
}
