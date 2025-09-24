import { Attendance, Request, User } from './types'
import { mockRequests } from './mock/requests'

export const seedUsers: User[] = [
  { id:'u-emp', name:'Alex Employee', role:'employee', department:'Engineering' },
  { id:'u-sup', name:'Sam Supervisor', role:'supervisor', department:'Operations' },
  { id:'u-hr', name:'Hana HR', role:'hr', department:'Human Resources' },
  { id:'u-chief', name:'Chris Chief', role:'chief', department:'Executive' },
]

export const seedRequests: Request[] = mockRequests

export const seedAttendance: Attendance[] = []
