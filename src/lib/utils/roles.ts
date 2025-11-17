// New helper functions for displaying role labels and styles
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  IT: 'IT',
  MANAGER: 'Manager',
  USER: 'User',
};

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  SUPER_ADMIN: 'danger',
  ADMIN: 'primary',
  IT: 'warning',
  MANAGER: 'info',
  USER: 'secondary',
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  SUPER_ADMIN: 'super-admin-badge',
  ADMIN: 'admin-badge',
  IT: 'it-badge',
  MANAGER: 'manager-badge',
  USER: 'user-badge',
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatRoleLabel(role?: string | null): string {
  if (!role) return 'Unknown';
  return ROLE_LABELS[role] ?? titleCase(role);
}

export function getRoleBadgeVariant(role?: string | null): string {
  if (!role) return 'secondary';
  return ROLE_BADGE_VARIANTS[role] ?? 'secondary';
}

export function getRoleBadgeClass(role?: string | null): string {
  if (!role) return ROLE_BADGE_CLASSES.USER;
  return ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.USER;
}
