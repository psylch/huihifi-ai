const defaultDebugInfo = {
  enabled: true,
  defaultVisible: true,
};

const defaultDemoMode = {
  enabled: false,
  responseDelay: 100,
};

export const appConfig = {
  debugInfo: {
    enabled: defaultDebugInfo.enabled,
    defaultVisible: defaultDebugInfo.defaultVisible,
  },

  demoMode: {
    enabled: defaultDemoMode.enabled,
    responseDelay: defaultDemoMode.responseDelay,
  },

  updateDebugSettings(settings: { enabled?: boolean; defaultVisible?: boolean }) {
    if (settings.enabled !== undefined) {
      this.debugInfo.enabled = settings.enabled;
    }
    if (settings.defaultVisible !== undefined) {
      this.debugInfo.defaultVisible = settings.defaultVisible;
    }
  },
};

