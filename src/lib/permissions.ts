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
}

// Define permissions for each role
const rolePermissions: { [key: string]: Permission[] } = {
  ADMIN: Object.values(Permission), // Admins have all permissions
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
  ],
  USER: [
    Permission.VIEW_DOCUMENTS,
    Permission.CREATE_DOCUMENTS,
  ],
};

export function hasPermission(session: any, permission: Permission): boolean {
  if (!session?.user?.role) return false;
  const userRole = session.user.role;
  return rolePermissions[userRole]?.includes(permission) || false;
}

export function canAccessCompany(session: any, companyId: string): boolean {
  if (!session?.user) return false;
  
  // Admins can access any company
  if (session.user.role === 'ADMIN') return true;
  
  // Others can only access their own company
  return session.user.companyId === companyId;
}

export function canManageEmployee(session: any, employee: any): boolean {
  if (!session?.user) return false;
  
  // Admins can manage any employee
  if (session.user.role === 'ADMIN') return true;
  
  // Managers can only manage non-admin employees in their company
  if (session.user.role === 'MANAGER' && session.user.companyId === employee.companyId) {
    return employee.role !== 'ADMIN';
  }
  
  return false;
}

export function canManageDocument(session: any, document: any): boolean {
  if (!session?.user) return false;
  
  // Admins can manage any document
  if (session.user.role === 'ADMIN') return true;
  
  // Managers and Users can only manage documents in their company
  return session.user.companyId === document.companyId;
}

export function canAccessFolder(session: any, folder: any): boolean {
  if (!session?.user) return false;
  
  // Admins can access any folder
  if (session.user.role === 'ADMIN') return true;
  
  // Managers and Users can only access folders in their company
  return session.user.companyId === folder.companyId;
}

export function canManageFolder(session: any, folder: any): boolean {
  if (!session?.user) return false;
  
  // Admins can manage any folder
  if (session.user.role === 'ADMIN') return true;
  
  // Managers can manage folders in their company
  if (session.user.role === 'MANAGER' && session.user.companyId === folder.companyId) return true;
  
  return false;
}

// Add new function for activity export permissions
export function canExportActivities(session: any, targetEmployee: any): boolean {
  if (!session?.user) return false;
  
  // Admins can export any activities
  if (session.user.role === 'ADMIN') return true;
  
  // Managers can only export activities for non-admin employees in their company
  if (session.user.role === 'MANAGER' && session.user.companyId === targetEmployee.companyId) {
    return targetEmployee.role !== 'ADMIN';
  }
  
  return false;
} 