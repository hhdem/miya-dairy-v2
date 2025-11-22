export interface ElectronAPI {
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
  };
  dialog: {
    openFile: () => Promise<string | null>;
    openFiles: () => Promise<string[]>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
