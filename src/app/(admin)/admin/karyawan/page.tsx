'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Plus, Edit, Trash2, X, UserPlus, AlertCircle, Eye } from 'lucide-react'
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type EmployeeResponse,
  type EmployeeCreatePayload,
  type EmployeeUpdatePayload,
  type EmploymentType,
  type EmployeeLevel,
  type EmployeeRole,
} from '@/lib/api/employees'
import { listDepartments, type DepartmentResponse } from '@/lib/api/departments'
import { HttpError } from '@/lib/types/errors'
import { Modal } from '@/components/ui/modal'

// Constants for dropdowns
const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
]

const EMPLOYEE_LEVELS: { value: EmployeeLevel; label: string }[] = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'CHIEF', label: 'Chief' },
  { value: 'HR', label: 'HR' },
]

const EMPLOYEE_ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'USER', label: 'User' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'ADMIN', label: 'Admin' },
]

type EmployeeFormData = Omit<EmployeeCreatePayload, 'role' | 'isActive'> & {
  role: EmployeeRole
  isActive: boolean
}

export default function AdminKaryawanPage() {
  const router = useRouter()

  // State
  const [employees, setEmployees] = useState<EmployeeResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL')
  const [filterLevel, setFilterLevel] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeResponse | null>(null)

  // Form states
  const [formData, setFormData] = useState<EmployeeFormData>({
    fullName: '',
    email: '',
    phone: '',
    employmentType: 'FULL_TIME',
    level: 'EMPLOYEE',
    role: 'USER',
    departmentId: '',
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EmployeeFormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  // Load employees and departments
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [employeesData, departmentsData] = await Promise.all([
        listEmployees(),
        listDepartments(),
      ])
      setEmployees(employeesData)
      setDepartments(departmentsData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDepartment = filterDepartment === 'ALL' || emp.departmentId === filterDepartment
      const matchesLevel = filterLevel === 'ALL' || emp.level === filterLevel
      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && emp.isActive) ||
        (filterStatus === 'INACTIVE' && !emp.isActive)
      return matchesSearch && matchesDepartment && matchesLevel && matchesStatus
    })
  }, [employees, searchQuery, filterDepartment, filterLevel, filterStatus])

  // Get department name
  function getDepartmentName(departmentId: string): string {
    const dept = departments.find((d) => d.id === departmentId)
    return dept?.name ?? 'Unknown'
  }

  // Reset form
  function resetForm() {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      employmentType: 'FULL_TIME',
      level: 'EMPLOYEE',
      role: 'USER',
      departmentId: departments[0]?.id ?? '',
      isActive: true,
    })
    setFormErrors({})
  }

  // Validate form
  function validateForm(): boolean {
    const errors: Partial<Record<keyof EmployeeFormData, string>> = {}

    if (!formData.fullName.trim()) errors.fullName = 'Full name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = 'Invalid email format'
    if (!formData.phone.trim()) errors.phone = 'Phone is required'
    else if (formData.phone.trim().length < 5) errors.phone = 'Phone must be at least 5 characters'
    if (!formData.departmentId) errors.departmentId = 'Department is required'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle create
  async function handleCreate() {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload: EmployeeCreatePayload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        employmentType: formData.employmentType,
        level: formData.level,
        role: formData.role,
        departmentId: formData.departmentId,
        isActive: formData.isActive,
      }

      const created = await createEmployee(payload)
      setEmployees((prev) => [...prev, created])
      toast.success(`Employee "${created.fullName}" created successfully`)
      setCreateModalOpen(false)
      resetForm()
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to create employee'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit
  async function handleEdit() {
    if (!selectedEmployee || !validateForm()) return

    setSubmitting(true)
    try {
      const payload: EmployeeUpdatePayload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        employmentType: formData.employmentType,
        level: formData.level,
        role: formData.role,
        departmentId: formData.departmentId,
        isActive: formData.isActive,
      }

      const updated = await updateEmployee(selectedEmployee.id, payload)
      setEmployees((prev) => prev.map((emp) => (emp.id === updated.id ? updated : emp)))
      toast.success(`Employee "${updated.fullName}" updated successfully`)
      setEditModalOpen(false)
      setSelectedEmployee(null)
      resetForm()
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to update employee'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!selectedEmployee) return

    setSubmitting(true)
    try {
      await deleteEmployee(selectedEmployee.id)
      setEmployees((prev) => prev.filter((emp) => emp.id !== selectedEmployee.id))
      toast.success(`Employee "${selectedEmployee.fullName}" deleted successfully`)
      setDeleteModalOpen(false)
      setSelectedEmployee(null)
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to delete employee'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Open create modal
  function openCreateModal() {
    resetForm()
    setFormData((prev) => ({ ...prev, departmentId: departments[0]?.id ?? '' }))
    setCreateModalOpen(true)
  }

  // Open edit modal
  function openEditModal(employee: EmployeeResponse) {
    setSelectedEmployee(employee)
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      employmentType: employee.employmentType,
      level: employee.level,
      role: employee.role,
      departmentId: employee.departmentId,
      isActive: employee.isActive,
    })
    setFormErrors({})
    setEditModalOpen(true)
  }

  // Open delete modal
  function openDeleteModal(employee: EmployeeResponse) {
    setSelectedEmployee(employee)
    setDeleteModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading employees...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage company employees and their information
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow-md transition hover:opacity-90"
          style={{ background: '#00156B' }}
        >
          <Plus size={20} />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Levels</option>
            {EMPLOYEE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/admin/karyawan/${employee.id}`)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        {employee.fullName}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getDepartmentName(employee.departmentId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/karyawan/${employee.id}`)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(employee)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredEmployees.length} of {employees.length} employee(s)
      </div>

      {/* Create Modal */}
      <Modal open={createModalOpen} onClose={() => !submitting && setCreateModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <UserPlus size={24} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Add New Employee</h2>
            </div>
            <button
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <EmployeeForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            departments={departments}
          />

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-xl text-white font-semibold shadow-md transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#00156B' }}
            >
              {submitting ? 'Creating...' : 'Create Employee'}
            </button>
            <button
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => !submitting && setEditModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Edit size={24} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Edit Employee</h2>
            </div>
            <button
              onClick={() => setEditModalOpen(false)}
              disabled={submitting}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <EmployeeForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            departments={departments}
          />

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleEdit}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-xl text-white font-semibold shadow-md transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#00156B' }}
            >
              {submitting ? 'Updating...' : 'Update Employee'}
            </button>
            <button
              onClick={() => setEditModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onClose={() => !submitting && setDeleteModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-red-50 mb-4">
              <AlertCircle size={48} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Delete Employee</h2>
            <p className="text-gray-600 mt-2">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{selectedEmployee?.fullName}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. Historical leave and overtime requests will be kept for
              audit purposes.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold shadow-md transition hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Deleting...' : 'Delete Employee'}
            </button>
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Employee Form Component
function EmployeeForm({
  formData,
  setFormData,
  formErrors,
  departments,
}: {
  formData: EmployeeFormData
  setFormData: React.Dispatch<React.SetStateAction<EmployeeFormData>>
  formErrors: Partial<Record<keyof EmployeeFormData, string>>
  departments: DepartmentResponse[]
}) {
  return (
    <div className="grid gap-4">
      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
          className={`w-full px-3 py-2 rounded-lg border ${formErrors.fullName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          placeholder="John Doe"
        />
        {formErrors.fullName && (
          <p className="text-sm text-red-600 mt-1">{formErrors.fullName}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          className={`w-full px-3 py-2 rounded-lg border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          placeholder="john.doe@example.com"
        />
        {formErrors.email && <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          className={`w-full px-3 py-2 rounded-lg border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          placeholder="+1234567890"
        />
        {formErrors.phone && <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>}
      </div>

      {/* Department */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Department <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.departmentId}
          onChange={(e) => setFormData((prev) => ({ ...prev, departmentId: e.target.value }))}
          className={`w-full px-3 py-2 rounded-lg border ${formErrors.departmentId ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        {formErrors.departmentId && (
          <p className="text-sm text-red-600 mt-1">{formErrors.departmentId}</p>
        )}
      </div>

      {/* Grid for Employment Type and Level */}
      <div className="grid grid-cols-2 gap-4">
        {/* Employment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
          <select
            value={formData.employmentType}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, employmentType: e.target.value as EmploymentType }))
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select
            value={formData.level}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, level: e.target.value as EmployeeLevel }))
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {EMPLOYEE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
        <select
          value={formData.role}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, role: e.target.value as EmployeeRole }))
          }
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {EMPLOYEE_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Active Employee
        </label>
      </div>
    </div>
  )
}
