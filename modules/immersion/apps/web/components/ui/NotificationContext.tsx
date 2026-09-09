"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  title?: string;
  duration?: number; // ms, default 4000; 0 for manual/loading
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItemData {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  resolve: ((value: boolean) => void) | null;
  isLoading: boolean;
}

// Global Event Bridge for Calling from outside React components
class NotificationBridge {
  private toastListeners: Set<(toasts: ToastItemData[]) => void> = new Set();
  private confirmListeners: Set<(state: ConfirmState) => void> = new Set();
  private toasts: ToastItemData[] = [];
  private confirmState: ConfirmState = {
    isOpen: false,
    options: null,
    resolve: null,
    isLoading: false,
  };

  subscribeToasts(listener: (toasts: ToastItemData[]) => void) {
    this.toastListeners.add(listener);
    listener(this.toasts);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  subscribeConfirm(listener: (state: ConfirmState) => void) {
    this.confirmListeners.add(listener);
    listener(this.confirmState);
    return () => {
      this.confirmListeners.delete(listener);
    };
  }

  private notifyToasts() {
    this.toastListeners.forEach((l) => l([...this.toasts]));
  }

  private notifyConfirm() {
    this.confirmListeners.forEach((l) => l({ ...this.confirmState }));
  }

  // Toast API
  show(type: ToastType, message: string, options?: ToastOptions): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const duration = options?.duration !== undefined ? options.duration : type === "loading" ? 0 : 4000;
    const newToast: ToastItemData = {
      id,
      type,
      message,
      title: options?.title,
      duration,
      action: options?.action,
      createdAt: Date.now(),
    };

    // Keep max 5 toasts visible
    this.toasts = [newToast, ...this.toasts.slice(0, 4)];
    this.notifyToasts();
    return id;
  }

  update(id: string, updates: Partial<ToastItemData>) {
    this.toasts = this.toasts.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          ...updates,
          duration: updates.duration !== undefined ? updates.duration : t.duration || 4000,
        };
      }
      return t;
    });
    this.notifyToasts();
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notifyToasts();
  }

  dismissAll() {
    this.toasts = [];
    this.notifyToasts();
  }

  async promise<T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    },
    options?: ToastOptions
  ): Promise<T> {
    const id = this.show("loading", msgs.loading, { ...options, duration: 0 });
    try {
      const data = await promise;
      const successMsg = typeof msgs.success === "function" ? msgs.success(data) : msgs.success;
      this.update(id, { type: "success", message: successMsg, duration: 4000 });
      return data;
    } catch (err: any) {
      const errorMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
      this.update(id, { type: "error", message: errorMsg, duration: 5000 });
      throw err;
    }
  }

  // Confirm API
  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmState = {
        isOpen: true,
        options,
        resolve,
        isLoading: false,
      };
      this.notifyConfirm();
    });
  }

  setConfirmLoading(isLoading: boolean) {
    this.confirmState.isLoading = isLoading;
    this.notifyConfirm();
  }

  handleConfirmDecision(confirmed: boolean) {
    if (this.confirmState.resolve) {
      this.confirmState.resolve(confirmed);
    }
    this.confirmState = {
      isOpen: false,
      options: null,
      resolve: null,
      isLoading: false,
    };
    this.notifyConfirm();
  }
}

const bridge = new NotificationBridge();

// Standalone notify helper for direct use anywhere
export const notify = {
  success: (message: string, options?: ToastOptions) => bridge.show("success", message, options),
  error: (message: string, options?: ToastOptions) => bridge.show("error", message, options),
  warning: (message: string, options?: ToastOptions) => bridge.show("warning", message, options),
  info: (message: string, options?: ToastOptions) => bridge.show("info", message, options),
  loading: (message: string, options?: ToastOptions) => bridge.show("loading", message, options),
  update: (id: string, updates: Partial<ToastItemData>) => bridge.update(id, updates),
  dismiss: (id: string) => bridge.dismiss(id),
  dismissAll: () => bridge.dismissAll(),
  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    },
    options?: ToastOptions
  ) => bridge.promise(promise, msgs, options),
};

// Standalone confirmDialog helper for direct use anywhere
export const confirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  return bridge.confirm(options);
};

// React Context
interface NotificationContextValue {
  toasts: ToastItemData[];
  confirmState: ConfirmState;
  notify: typeof notify;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  setConfirmLoading: (loading: boolean) => void;
  handleConfirmDecision: (confirmed: boolean) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    options: null,
    resolve: null,
    isLoading: false,
  });

  useEffect(() => {
    const unsubToasts = bridge.subscribeToasts(setToasts);
    const unsubConfirm = bridge.subscribeConfirm(setConfirmState);
    return () => {
      unsubToasts();
      unsubConfirm();
    };
  }, []);

  const value: NotificationContextValue = {
    toasts,
    confirmState,
    notify,
    confirm: confirmDialog,
    setConfirmLoading: (isLoading) => bridge.setConfirmLoading(isLoading),
    handleConfirmDecision: (confirmed) => bridge.handleConfirmDecision(confirmed),
    dismissToast: (id) => bridge.dismiss(id),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      toasts: [],
      confirmState: { isOpen: false, options: null, resolve: null, isLoading: false },
      notify,
      confirm: confirmDialog,
      setConfirmLoading: (loading: boolean) => bridge.setConfirmLoading(loading),
      handleConfirmDecision: (confirmed: boolean) => bridge.handleConfirmDecision(confirmed),
      dismissToast: (id: string) => bridge.dismiss(id),
    };
  }
  return ctx;
}
