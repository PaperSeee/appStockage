import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.fight.app',
  appName: 'App Fight',
  webDir: 'www',
  bundledWebRuntime: false,
  // Configuration pour cacher l'URL
  server: {
    // Désactiver la barre d'URL externe
    androidScheme: 'android-app',
    iosScheme: 'app',
    // Empêcher l'ouverture de liens dans le navigateur externe
    errorPath: 'error.html'
  },
  android: {
    allowMixedContent: true,
    webViewSettings: {
      // Cacher la barre d'adresse sur Android
      builtInZoomControls: false,
      displayZoomControls: false,
      // Désactiver les actions longues
      allowFileAccess: true,
      allowContentAccess: true,
      // Empêcher l'ouverture de liens externes
      setSupportMultipleWindows: false
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000
    },
    CapacitorURLScheme: {
      scheme: 'appfight'
    },
    Browser: {
      // Vous pouvez ajouter des configurations spécifiques au navigateur ici
    }
  }
};

export default config;
