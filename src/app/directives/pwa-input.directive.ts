import { Directive, ElementRef, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { KeyboardService } from '../services/keyboard.service';

@Directive({
  selector: '[appPwaInput]',
  standalone: true
})
export class PwaInputDirective implements OnInit {
  private isIOS = false;
  private isPWA = false;

  constructor(
    private el: ElementRef,
    private platform: Platform,
    private keyboardService: KeyboardService
  ) {}

  ngOnInit() {
    this.isIOS = this.platform.is('ios');
    this.isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;

    if (this.isIOS && this.isPWA) {
      // Add special classes for iOS PWA
      this.el.nativeElement.classList.add('ios-pwa-input');
      
      // Make element higher priority for focus
      this.el.nativeElement.addEventListener('touchend', (e: Event) => {
        e.preventDefault();
        // Force focus with delay to ensure iOS shows keyboard
        setTimeout(() => {
          this.el.nativeElement.focus();
        }, 100);
      });
      
      // Fix blur issues
      this.el.nativeElement.addEventListener('blur', () => {
        // Ensure we're not preventing essential blur actions
        setTimeout(() => {
          // Custom blur logic if needed
        }, 100);
      });
    }
  }
}
