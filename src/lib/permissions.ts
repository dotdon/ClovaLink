import { Session } from 'next-auth';

export enum Permission {
  VIEW_ACTIVITIES = 'VIEW_ACTIVITIES',
  CREATE_EMPLOYEES = 'CREATE_EMPLOYEES',
  EDIT_EMPLOYEES = 'EDIT_EMPLOYEES',
  VIEW_EMPLOYEES = 'VIEW_EMPLOYEES',
  CREATE_COMPANIES = 'CREATE_COMPANIES',
  EDIT_COMPANIES = 'EDIT_COMPANIES',
  DELETE_COMPANIES = 'DELETE_COMPANIES',
  VIEW_COMPANIES = 'VIEW_COMPANIES',
  CREATE_DOCUMENTS = 'CREATE_DOCUMENTS',
  EDIT_DOCUMENTS = 'EDIT_DOCUMENTS',
  DELETE_DOCUMENTS = 'DELETE_DOCUMENTS',
  RENAME_DOCUMENTS = 'RENAME_DOCUMENTS',
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  CREATE_UPLOAD_LINKS = 'CREATE_UPLOAD_LINKS',
  VIEW_UPLOAD_LINKS = 'VIEW_UPLOAD_LINKS',
  VIEW_STATS = 'VIEW_STATS',
  VIEW_CALENDAR = 'VIEW_CALENDAR',
  CREATE_EVENTS = 'CREATE_EVENTS',
  EDIT_EVENTS = 'EDIT_EVENTS',
  DELETE_EVENTS = 'DELETE_EVENTS',
  MANAGE_COMPANY_EVENTS = 'MANAGE_COMPANY_EVENTS', // Create events for entire company
  CREATE_MEMOS = 'CREATE_MEMOS',
  VIEW_MEMOS = 'VIEW_MEMOS',
  EDIT_MEMOS = 'EDIT_MEMOS',
  DELETE_MEMOS = 'DELETE_MEMOS',
  VIEW_TRASH = 'VIEW_TRASH',
  RESTORE_TRASH = 'RESTORE_TRASH',
  PERMANENTLY_DELETE = 'PERMANENTLY_DELETE',
}

// Define permissions for each role
const rolePermissions: { [key: string]: Permission[] } = {
  SUPER_ADMIN: Object.values(Permission), // Super Admins have all permissions, including managing other admins
  ADMIN: [
    // ADMINs have most permissions but cannot access security dashboard or manage super admins
    Permission.VIEW_ACTIVITIES,
    Permission.CREATE_EMPLOYEES,
    Permission.EDIT_EMPLOYEES,
    Permission.VIEW_EMPLOYEES,
    Permission.CREATE_COMPANIES,
    Permission.EDIT_COMPANIES,
    Permission.DELETE_COMPANIES,
    Permission.VIEW_COMPANIES,
    Permission.CREATE_DOCUMENTS,
    Permission.EDIT_DOCUMENTS,
    Permission.DELETE_DOCUMENTS,
    Permission.RENAME_DOCUMENTS,
    Permission.VIEW_DOCUMENTS,
    Permission.CREATE_UPLOAD_LINKS,
    Permission.VIEW_UPLOAD_LINKS,
    Permission.VIEW_STATS,
    Permission.VIEW_CALENDAR,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_EVENTS,
    Permission.MANAGE_COMPANY_EVENTS,
    Permission.CREATE_MEMOS,
    Permission.VIEW_MEMOS,
    Permission.EDIT_MEMOS,
    Permission.DELETE_MEMOS,
    Permission.VIEW_TRASH,
    Permission.RESTORE_TRASH,
    Permission.PERMANENTLY_DELETE,
  ],
  IT: [
    Permission.VIEW_ACTIVITIES,
    Permission.VIEW_STATS,
    Permission.VIEW_EMPLOYEES,
    Permission.EDIT_EMPLOYEES, // IT can help with account issues
    Permission.VIEW_COMPANIES,
    Permission.VIEW_DOCUMENTS, // For troubleshooting
    Permission.VIEW_UPLOAD_LINKS, // For troubleshooting
    Permission.VIEW_CALENDAR, // For system monitoring
    Permission.VIEW_MEMOS, // For troubleshooting
    Permission.VIEW_TRASH, // For data recovery
    Permission.RESTORE_TRASH, // For data recovery
  ],
  MANAGER: [
    Permission.VIEW_ACTIVITIES,
    Permission.CREATE_EMPLOYEES,
    Permission.EDIT_EMPLOYEES,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_COMPANIES,
    Permission.CREATE_DOCUMENTS,
    Permission.EDIT_DOCUMENTS,
    Permission.DELETE_DOCUMENTS,
    Permission.RENAME_DOCUMENTS,
    Permission.VIEW_DOCUMENTS,
    Permission.CREATE_UPLOAD_LINKS,
    Permission.VIEW_UPLOAD_LINKS,
    Permission.VIEW_CALENDAR,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_EVENTS,
    Permission.MANAGE_COMPANY_EVENTS,
    Permission.VIEW_TRASH,
    Permission.RESTORE_TRASH,
    Permission.PERMANENTLY_DELETE,
    Permission.CREATE_MEMOS,
    Permission.VIEW_MEMOS,
    Permission.EDIT_MEMOS,
    Permission.DELETE_MEMOS,
  ],
  USER: [
    Permission.VIEW_DOCUMENTS,
    Permission.CREATE_DOCUMENTS,
    Permission.VIEW_CALENDAR,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS, // Users can edit their own events
    Permission.DELETE_EVENTS, // Users can delete their own events
    Permission.CREATE_MEMOS,
    Permission.VIEW_MEMOS,
    Permission.EDIT_MEMOS, // Users can edit their own memos
    Permission.DELETE_MEMOS, // Users can delete their own memos
    Permission.VIEW_TRASH, // Users can view trash
    Permission.RESTORE_TRASH, // Users can restore their own deleted items
  ],
};

export function hasPermission(session: any, permission: Permission): boolean {
  if (!session?.user?.role) return false;
  const userRole = session.user.role;
  return rolePermissions[userRole]?.includes(permission) || false;
}

export function canAccessCompany(session: any, companyId: string): boolean {
  if (!session?.user) return false;
  
  // Super Admins and Admins can access any company
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') return true;
  
  // IT can access any company for troubleshooting
  if (session.user.role === 'IT') return true;
  
  // Others can only access their own company
  return session.user.companyId === companyId;
}

export function canManageEmployee(session: any, employee: any): boolean {
  if (!session?.user) return false;
  
  // Super Admins can manage anyone, including other admins
  if (session.user.role === 'SUPER_ADMIN') return true;
  
  // Admins can manage any employee (except SUPER_ADMIN)
  if (session.user.role === 'ADMIN') {
    return employee.role !== 'SUPER_ADMIN';
  }
  
  // IT can manage non-admin, non-super-admin employees for troubleshooting
  if (session.user.role === 'IT' && employee.role !== 'ADMIN' && employee.role !== 'SUPER_ADMIN') {
    return true;
  }
  
  // Managers can only manage non-admin employees in their company
  if (session.user.role === 'MANAGER' && session.user.companyId === employee.companyId) {
    return employee.role !== 'ADMIN' && employee.role !== 'SUPER_ADMIN';
  }
  
  return false;
}

export function canManageDocument(session: any, document: any): boolean {
  if (!session?.user) return false;
  
  // Super Admins and Admins can manage any document
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') return true;
  
  // IT can view but not manage documents (for troubleshooting only)
  // Managers and Users can only manage documents in their company
  return session.user.companyId === document.companyId;
}

export function canAccessFolder(session: any, folder: any): boolean {
  if (!session?.user) return false;
  
  // Super Admins, Admins, and IT can access any folder
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN' || session.user.role === 'IT') return true;
  
  // Managers and Users can only access folders in their company
  return session.user.companyId === folder.companyId;
}

export function canManageFolder(session: any, folder: any): boolean {
  if (!session?.user) return false;
  
  // Super Admins and Admins can manage any folder
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') return true;
  
  // Managers can manage folders in their company
  if (session.user.role === 'MANAGER' && session.user.companyId === folder.companyId) return true;
  
  return false;
}

// Add new function for activity export permissions
export function canExportActivities(session: any, targetEmployee: any): boolean {
  if (!session?.user) return false;
  
  // Super Admins and Admins can export any activities
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') return true;
  
  // IT can export activities for troubleshooting
  if (session.user.role === 'IT') return true;
  
  // Managers can only export activities for non-admin employees in their company
  if (session.user.role === 'MANAGER' && session.user.companyId === targetEmployee.companyId) {
    return targetEmployee.role !== 'ADMIN' && targetEmployee.role !== 'SUPER_ADMIN';
  }
  
  return false;
}

// Check if user can manage a memo
export function canManageMemo(session: any, memo: any): boolean {
  if (!session?.user) return false;
  
  // User owns the memo
  if (memo.employeeId === session.user.id) return true;
  
  // Super Admins and Admins can manage any memo
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') return true;
  
  // Managers can manage memos in their company
  if (session.user.role === 'MANAGER' && session.user.companyId === memo.companyId) return true;
  
  return false;
} 