import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Browser } from '@capacitor/browser';

@Injectable({
  providedIn: 'root'
})
export class LinkHandlerService {
  constructor(
    private router: Router,
    private navCtrl: NavController
  ) {
    this.setupLinkInterception();
  }

  setupLinkInterception() {
    // Interception des clics sur tous les liens
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor) {
        const href = anchor.getAttribute('href');
        
        // Si c'est un lien externe
        if (href && (href.startsWith('http') || href.startsWith('www') || href.includes('://'))) {
          event.preventDefault();
          this.handleExternalLink(href, anchor.getAttribute('target'));
        }
      }
    }, true);
  }

  handleExternalLink(url: string, target?: string | null) {
    // Si le lien doit rester dans l'app
    if (!target || target === '_self') {
      // Ouvrir dans la webview interne
      this.navCtrl.navigateForward('/browser', { 
        state: { url } 
      });
    } else {
      // Utiliser Browser.open pour les liens externes obligatoires
      this.openExternalUrl(url);
    }
  }

  // Méthode à utiliser à la place de window.open()
  openUrl(url: string, internal = true) {
    if (internal) {
      this.navCtrl.navigateForward('/browser', { 
        state: { url } 
      });
    } else {
      this.openExternalUrl(url);
    }
  }

  // Méthode privée pour ouvrir des URL externes avec Browser de Capacitor
  private async openExternalUrl(url: string) {
    try {
      await Browser.open({ url });
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de l\'URL:', error);
      // Fallback à window.open si Browser.open échoue
      window.open(url, '_blank');
    }
  }
}
