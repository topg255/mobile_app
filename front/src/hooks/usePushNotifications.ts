import { useCallback, useEffect, useState } from 'react';
import { pushAPI } from '../api';
import {
  NotificationPreferences,
  PushAnalytics,
  PushDeliveryStatus,
  PushEscalationConfig,
  PushNotificationHistoryRow,
  PushSubscriptionInfo,
} from '../types';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function browserName(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Chrome\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return 'Navigateur';
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [supported] = useState(
    typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
  );
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionInfo[]>([]);
  const [history, setHistory] = useState<PushNotificationHistoryRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [analytics, setAnalytics] = useState<PushAnalytics | null>(null);
  const [escalationConfig, setEscalationConfig] = useState<PushEscalationConfig | null>(null);
  const [testSending, setTestSending] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!supported) return;
    setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
    try {
      const res = await pushAPI.getSettings();
      setPreferences(res.data.preferences);
      setSubscriptions(res.data.subscriptions);
      setEnabled(
        res.data.subscriptions.some(
          (s) => s.isActive,
        ) && Notification.permission === 'granted',
      );
    } catch {
      // silencieux
    }
  }, [supported]);

  const refreshHistory = useCallback(async (page = 1) => {
    try {
      const res = await pushAPI.getHistory(page, 25);
      setHistory(res.data.items);
      setHistoryTotal(res.data.total);
    } catch {
      // silencieux
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    try {
      const res = await pushAPI.getAnalytics(14);
      setAnalytics(res.data);
    } catch {
      // silencieux
    }
  }, []);

  const refreshEscalation = useCallback(async () => {
    try {
      const res = await pushAPI.getEscalationConfig();
      setEscalationConfig(res.data);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshHistory();
    refreshAnalytics();
    refreshEscalation();
  }, [refreshStatus, refreshHistory, refreshAnalytics, refreshEscalation]);

  const getBrowserSubscription = async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  };

  const register = useCallback(async (): Promise<{ message: string }> => {
    if (!supported) return { message: 'Navigateur non pris en charge' };
    setLoading(true);
    try {
      const permissionState = await Notification.requestPermission();
      setPermission(permissionState);
      if (permissionState !== 'granted') {
        return { message: 'Permission refusee' };
      }

      const keyRes = await pushAPI.getVapidPublicKey();
      const publicKey = keyRes.data.publicKey;
      if (!publicKey) {
        return { message: 'Notifications non configurees sur le serveur (VAPID manquant)' };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await pushAPI.subscribe({
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
        browser: browserName(navigator.userAgent),
        device: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        platform: navigator.platform || 'unknown',
      });

      await refreshStatus();
      return { message: 'Notifications activees' };
    } finally {
      setLoading(false);
    }
  }, [supported, refreshStatus]);

  const unregister = useCallback(async (endpoint?: string) => {
    setLoading(true);
    try {
      const browserSub = await getBrowserSubscription();
      if (browserSub && (!endpoint || browserSub.endpoint === endpoint)) {
        await browserSub.unsubscribe();
      }
      await pushAPI.unsubscribe(endpoint);
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const updatePreferences = useCallback(
    async (data: Partial<NotificationPreferences>) => {
      const res = await pushAPI.updateSettings(data);
      setPreferences(res.data);
      return res.data;
    },
    [],
  );

  const sendTest = useCallback(async () => {
    setTestSending(true);
    try {
      const res = await pushAPI.sendTest();
      return res.data.message;
    } finally {
      setTestSending(false);
    }
  }, []);

  const updateEscalation = useCallback(
    async (data: Partial<PushEscalationConfig>) => {
      const res = await pushAPI.updateEscalationConfig(data);
      setEscalationConfig(res.data);
      return res.data;
    },
    [],
  );

  const runEscalation = useCallback(async () => {
    const res = await pushAPI.runEscalation();
    return res.data;
  }, []);

  return {
    supported,
    permission,
    enabled,
    loading,
    testSending,
    preferences,
    subscriptions,
    history,
    historyTotal,
    analytics,
    escalationConfig,
    register,
    unregister,
    updatePreferences,
    refreshStatus,
    refreshHistory,
    refreshAnalytics,
    refreshEscalation,
    sendTest,
    updateEscalation,
    runEscalation,
  };
}

export { PushDeliveryStatus };