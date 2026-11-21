import { ApiError, getToken, setToken } from '@/lib/api';

export function isRejectedToken(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 &&
    (error.errors?.authorization === 'invalid_token' || error.errors?.authorization === 'expired_token' ||
      error.message === 'Invalid authentication token.' || error.message === 'Authentication token has expired.');
}

export async function restoreSession(loadAccount: () => Promise<void>, loadPublic: () => Promise<void>, isCurrent: () => boolean = () => true): Promise<{
  sessionError: string | null;
  error: string | null;
  invalidSession: boolean;
  needsVendorOnboarding: boolean;
}> {
  let sessionError: string | null = null;
  let error: string | null = null;
  let invalidSession = false;
  let needsVendorOnboarding = false;
  try {
    if (await getToken()) await loadAccount();
  } catch (caught) {
    if (!isCurrent()) {
      return { sessionError, error, invalidSession, needsVendorOnboarding };
    } else if (isRejectedToken(caught)) {
      try {
        await setToken(null);
        invalidSession = true;
      } catch {
        sessionError = 'Unable to clear the expired session from secure storage.';
        error = sessionError;
      }
    } else if (caught instanceof ApiError && caught.status === 403 && caught.message === 'No farm is associated with this account.') {
      needsVendorOnboarding = true;
    } else {
      sessionError = caught instanceof ApiError ? caught.message : 'Unable to restore your saved session.';
      error = sessionError;
    }
  }
  try {
    await loadPublic();
  } catch (caught) {
    error ??= caught instanceof ApiError ? caught.message : 'Unable to load marketplace data.';
  }
  return { sessionError, error, invalidSession, needsVendorOnboarding };
}
