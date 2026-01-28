'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Attendance } from '../types'
import { uid } from '../utils/id'

interface AttState{
  items: Attendance[]
  checkIn: (userId:string, photoDataUrl?:string)=>Attendance
  forUser: (userId:string)=>Attendance[]
}

export const useAttendance = create<AttState>()(persist((set,get)=>({
  items: [],
  checkIn: (userId, photoDataUrl)=>{
    const a: Attendance = { id: uid('att'), userId, checkInAt: new Date().toISOString(), photoDataUrl }
    set({ items: [a, ...get().items] })
    return a
  },
  forUser: (userId)=> get().items.filter(a=>a.userId===userId)
}),{ name:'hrapp_v1_att' }))
