import { useAuthStore } from '../state/useAuthStore.js';
import type {
  AuthResponseDto,
  AuthUserIdentity,
} from '@dhamrai/shared-contracts';

export class AuthService {
  private static _instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService._instance) {
      AuthService._instance = new AuthService();
    }
    return AuthService._instance;
  }

  /**
   * Initiates Google OAuth with NestJS gateway, retrieving authorization URL
   * and setting the encrypted HttpOnly transaction cookie.
   */
  public async beginGoogleOAuth(): Promise<{ authorizationUrl: string }> {
    const response = await fetch('/api/auth/google/start', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to initiate Google OAuth: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as { authorizationUrl: string };
    return data;
  }

  /**
   * Opens Google OAuth in a popup window, listens for code callback via postMessage,
   * exchanges code for session token, and updates useAuthStore.
   */
  public async openGoogleLoginPopup(): Promise<AuthUserIdentity> {
    const { authorizationUrl } = await this.beginGoogleOAuth();

    const width = 520;
    const height = 650;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

    const popup = window.open(
      authorizationUrl,
      'dhamrai_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      throw new Error(
        'পপ-আপ উইন্ডোটি ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপ-আপ অনুমোদন করুন। (Popup blocked. Please allow popups to sign in.)'
      );
    }

    return new Promise<AuthUserIdentity>((resolve, reject) => {
      let isSettled = false;

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollTimer);
      };

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'DHAMRAI_OAUTH_CODE') {
          isSettled = true;
          cleanup();

          const { code, state } = event.data as { code: string; state: string };
          try {
            const authResponse = await this.exchangeCode(code, state);
            resolve(authResponse.user);
          } catch (err) {
            reject(err);
          }
        } else if (event.data?.type === 'DHAMRAI_OAUTH_ERROR') {
          isSettled = true;
          cleanup();
          reject(new Error(event.data.error || 'Google Sign-In failed.'));
        }
      };

      window.addEventListener('message', handleMessage);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          if (!isSettled) {
            cleanup();
            reject(
              new Error(
                'গুগল সাইন-ইন বাতিল করা হয়েছে। (Google Sign-In cancelled by user.)'
              )
            );
          }
        }
      }, 500);
    });
  }

  /**
   * Exchanges authorization code for backend session token and Google refresh token.
   */
  public async exchangeCode(
    code: string,
    state: string,
    redirectUri?: string
  ): Promise<AuthResponseDto> {
    const effectiveRedirectUri =
      redirectUri || `${window.location.origin}/oauth/callback`;

    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        code,
        state,
        redirectUri: effectiveRedirectUri,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const message =
        errJson.message || `Exchange failed with status ${response.status}`;
      throw new Error(message);
    }

    const data = (await response.json()) as AuthResponseDto;
    useAuthStore.getState().login(data.sessionToken, data.user);
    return data;
  }

  /**
   * Verifies existing session on startup or page reload.
   */
  public async restoreSession(): Promise<boolean> {
    const store = useAuthStore.getState();
    const stored = store.restoreSessionFromStorage();

    if (!stored) {
      store.setSyncStatus(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'OFFLINE'
          : 'LOCAL_ONLY'
      );
      return false;
    }

    // Check offline status
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      store.login(stored.sessionToken, stored.user);
      store.setSyncStatus('OFFLINE');
      return true;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${stored.sessionToken}`,
        },
      });

      if (response.ok) {
        store.login(stored.sessionToken, stored.user);
        return true;
      }

      if (response.status === 401) {
        store.logout();
        return false;
      }

      // If backend error / network issue, keep local session
      store.login(stored.sessionToken, stored.user);
      store.setSyncStatus('SYNC_ERROR', 'সার্ভার পাওয়া যায়নি (Server unavailable)');
      return true;
    } catch {
      // Network drop, keep offline session
      store.login(stored.sessionToken, stored.user);
      store.setSyncStatus('OFFLINE');
      return true;
    }
  }

  /**
   * Logs out user, clears token from sessionStorage and resets store.
   */
  public async logout(): Promise<void> {
    useAuthStore.getState().logout();
  }
}

export const authService = AuthService.getInstance();
