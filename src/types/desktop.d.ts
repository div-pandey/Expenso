export interface DesktopApi {
  isDesktop: boolean;
  platform: string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  showNotification: (options: {
    title: string;
    body: string;
    icon?: string;
    extra?: Record<string, unknown>;
  }) => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  onTriggerAction: (callback: (action: string, extra?: Record<string, unknown>) => void) => () => void;
}

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}

