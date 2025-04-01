import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Keyboard } from '@capacitor/keyboard';

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  private isIOS: boolean;
  private isPWA: boolean;

  constructor(private platform: Platform) {
    this.isIOS = this.platform.is('ios');
    this.isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                ('standalone' in window.navigator && (window.navigator as any).standalone === true);
  }

  async initialize() {
    if (this.isIOS && this.isPWA) {
      console.log('KeyboardService: Initializing keyboard for iOS PWA');
      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
        await Keyboard.setResizeMode({ mode: 'ionic' });
      } catch (error) {
        console.error('Error configuring keyboard:', error);
      }
    }
  }
}
