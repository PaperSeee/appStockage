import { Directive, ElementRef, OnInit, HostListener } from '@angular/core';
import { Platform } from '@ionic/angular';

@Directive({
  selector: '[pwaInput]'
})
export class PwaInputDirective implements OnInit {
  private isIOS: boolean;
  private isPWA: boolean;

  constructor(private el: ElementRef, private platform: Platform) {
    this.isIOS = false;
    this.isPWA = false;
  }

  ngOnInit() {
    this.isIOS = this.platform.is('ios');
    this.isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                ('standalone' in window.navigator && (window.navigator as any).standalone === true);

    if (this.isIOS && this.isPWA) {
      this.el.nativeElement.classList.add('ios-pwa-input');
    }
  }

  @HostListener('focus')
  onFocus() {
    if (this.isIOS && this.isPWA) {
      setTimeout(() => {
        this.el.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }
}
