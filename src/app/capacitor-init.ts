import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

// This function ensures proper initialization of Capacitor plugins
// especially for PWA context with special focus on iOS keyboard issues
export async function initCapacitor() {
  try {
    console.log('Initializing Capacitor plugins...');
    
    // Detect if running as PWA
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                 'standalone' in window.navigator && window.navigator.standalone === true;
    
    const platform = Capacitor.getPlatform();
    
    // iOS PWA-specific keyboard configuration
    if (isPwa && platform === 'ios') {
      console.log('iOS PWA mode detected - applying keyboard fixes');
      
      try {
        // Configure keyboard behavior to avoid focus and scrolling issues
        await Keyboard.setResizeMode({ mode: KeyboardResize.None });
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
        
        // Apply additional CSS to help with keyboard interactions
        document.body.classList.add('ios-pwa');
        
        // Add listener to detect keyboard show/hide events
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-is-open');
          
          // If focused element is an input, ensure it's visible
          const activeElement = document.activeElement;
          if (activeElement instanceof HTMLInputElement || 
              activeElement instanceof HTMLTextAreaElement) {
            setTimeout(() => {
              activeElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }, 100);
          }
        });
        
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-is-open');
        });
        
        // Add global click listener for inputs
        document.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target instanceof HTMLInputElement || 
              target instanceof HTMLTextAreaElement) {
            // Force focus with a small delay
            setTimeout(() => {
              target.focus();
            }, 100);
          }
        }, true);
      } catch (keyboardError) {
        console.error('Failed to initialize Keyboard plugin:', keyboardError);
      }
    }
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator && isPwa) {
      try {
        const registration = await navigator.serviceWorker.register('/ngsw-worker.js');
        console.log('ServiceWorker registration successful with scope:', registration.scope);
      } catch (swError) {
        console.error('ServiceWorker registration failed:', swError);
      }
    }
    
  } catch (error) {
    console.error('Error initializing Capacitor plugins:', error);
  }
}
