import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  keyboard: any = null;
  isNative = false;
  isPWA = false;
  isSafari = false;

  constructor(private platform: Platform) {
    this.initializeKeyboard();
    this.detectPWA();
    this.detectSafari();
  }

  async initializeKeyboard() {
    // Check if Capacitor is available
    const isCapacitorAvailable = Capacitor && typeof Capacitor.isPluginAvailable === 'function';
    
    if (isCapacitorAvailable && Capacitor.isPluginAvailable('Keyboard')) {
      this.isNative = true;
      this.keyboard = Keyboard;
      
      // Configure Keyboard plugin
      if (this.platform.is('ios')) {
        try {
          await Keyboard.setResizeMode({ mode: KeyboardResize.None });
          await Keyboard.setAccessoryBarVisible({ isVisible: true });
          console.log('Configured iOS keyboard in native mode');
        } catch (error) {
          console.error('Error configuring keyboard:', error);
        }
      }
    } else {
      console.log('Keyboard plugin not available');
    }
  }

  detectPWA() {
    // Detect if running as PWA
    this.isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
    
    if (this.isPWA) {
      document.body.classList.add('pwa-mode');
      
      if (this.platform.is('ios')) {
        document.body.classList.add('ios-pwa');
        this.applyIOSPwaFixes();
      }
    }
  }
  
  detectSafari() {
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (this.isSafari) {
      document.body.classList.add('safari-browser');
    }
  }
  
  private applyIOSPwaFixes() {
    // Keyboard viewport fixes for iOS
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    }
    
    // Add global styles to fix iOS PWA input issues
    const style = document.createElement('style');
    style.innerHTML = `
      body.ios-pwa {
        /* Prevent scroll bounce */
        position: fixed;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      
      body.ios-pwa ion-content {
        --overflow: auto;
      }
      
      body.ios-pwa .ios-pwa-input:focus {
        position: relative;
        z-index: 1000;
      }
      
      body.keyboard-is-open {
        /* Add padding to prevent content hiding behind keyboard */
        padding-bottom: 270px; 
      }
    `;
    document.head.appendChild(style);
    
    // Handle document click for inputs
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }, true);
  }
}
