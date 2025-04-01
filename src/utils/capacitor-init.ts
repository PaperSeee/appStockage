import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

export async function initCapacitor() {
  console.log('Initializing Capacitor plugins...');
  const isPwa = window.matchMedia('(display-mode: standalone)').matches ||
                ('standalone' in window.navigator && (window.navigator as any).standalone === true);

  if (isPwa) {
    console.log('PWA mode detected');
    const platform = Capacitor.getPlatform();

    if (platform === 'ios') {
      console.log('Applying iOS-specific keyboard fixes');
      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body }); // Utilisation de la valeur correcte
      } catch (error) {
        console.error('Error configuring keyboard:', error);
      }
    }
  }
}
