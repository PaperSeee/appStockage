import { isPlatform } from '@ionic/angular';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
// Removed SplashScreen import that was causing the error

export class CapacitorInit {
  static init(): void {
    if (this.isNativePlatform()) {
      this.initializeCapacitor();
    } else {
      this.initializePwa();
    }
  }

  private static isNativePlatform(): boolean {
    return isPlatform('ios') || isPlatform('android');
  }

  private static isPwa(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }

  private static async initializeCapacitor(): Promise<void> {
    try {
      // Initialize Status Bar
      await StatusBar.setStyle({ style: Style.Light });
      
      // Add listeners for app events
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      // SplashScreen code removed to avoid the error
      // If you install @capacitor/splash-screen later, you can uncomment:
      // await SplashScreen.hide();
    } catch (err) {
      console.error('Error initializing Capacitor', err);
    }
  }
  
  private static initializePwa(): void {
    if (this.isPwa()) {
      // Add PWA specific initialization
      console.log('Running as PWA');
      
      // Apply PWA specific styles
      document.body.classList.add('pwa-mode');
    }
  }
}
