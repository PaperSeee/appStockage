import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.page.html',
  styleUrls: ['./browser.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class BrowserPage implements OnInit {
  url: SafeResourceUrl = '';
  title = 'Chargement...';

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    const state = this.router.getCurrentNavigation()?.extras.state;
    if (state && state['url']) {
      this.url = this.sanitizer.bypassSecurityTrustResourceUrl(state['url']);
    } else {
      this.navCtrl.back();
    }
  }

  onIframeLoad(event: Event) {
    try {
      const iframe = event.target as HTMLIFrameElement;
      if (iframe && iframe.contentDocument) {
        this.title = iframe.contentDocument.title || 'Page chargée';
      }
    } catch (e) {
      console.warn('Impossible d\'accéder au titre de la page:', e);
      this.title = 'Page chargée';
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}
