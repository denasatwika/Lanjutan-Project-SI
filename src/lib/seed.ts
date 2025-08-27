import { Attendance, Request, User } from './types'

export const seedUsers: User[] = [
  { id:'u-emp', name:'Alex Employee', role:'employee' },
  { id:'u-sup', name:'Sam Supervisor', role:'supervisor' },
  { id:'u-hr', name:'Hana HR', role:'hr' },
  { id:'u-chief', name:'Chris Chief', role:'chief' },
]

export const seedRequests: Request[] = [
  { id:'r-1', userId:'u-emp', type:'leave', status:'pending', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), payload:{ days:2, reason:'Family' }},
  { id:'r-2', userId:'u-emp', type:'overtime', status:'approved', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), payload:{ hours:3, reason:'Release' }},
]

export const seedAttendance: Attendance[] = []