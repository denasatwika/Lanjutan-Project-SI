'use client'
import { CameraCapture } from '@/components/CameraCapture'
import { useAuth } from '@/lib/state/auth'
import { useAttendance } from '@/lib/state/attendance'
import { toast } from 'sonner'

export default function Page(){
  const user = useAuth(s=>s.user)!
  const checkIn = useAttendance(s=>s.checkIn)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Check-in</h1>
      <CameraCapture onCapture={(data)=>{ checkIn(user.id, data); toast('Check-in recorded') }} />
    </div>
  )
}