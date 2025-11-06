import prisma from './prisma';

/**
 * Check if a user has 2FA enabled (either TOTP or passkey)
 */
export async function userHas2FA(userId: string): Promise<boolean> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      select: {
        totpEnabled: true,
        passkeys: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!employee) {
      return false;
    }

    // User has 2FA if they have TOTP enabled OR at least one passkey
    return employee.totpEnabled || employee.passkeys.length > 0;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
}

/**
 * Check if 2FA is required globally for the organization
 */
export async function is2FARequired(companyId: string): Promise<boolean> {
  try {
    // Check system setting for global 2FA requirement
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'require_two_factor' },
    });

    if (setting && setting.value === 'true') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking 2FA requirement:', error);
    return false;
  }
}

/**
 * Check if user needs to set up 2FA
 */
export async function userNeeds2FA(userId: string, companyId: string): Promise<boolean> {
  try {
    const isRequired = await is2FARequired(companyId);
    if (!isRequired) {
      return false; // 2FA is not required globally
    }

    const has2FA = await userHas2FA(userId);
    return !has2FA; // User needs 2FA if it's required but they don't have it
  } catch (error) {
    console.error('Error checking if user needs 2FA:', error);
    return false;
  }
}

