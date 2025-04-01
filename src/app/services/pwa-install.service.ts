import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any;
  private _canInstall = new BehaviorSubject<boolean>(false);
  canInstall$ = this._canInstall.asObservable();
  
  isPwa = false;

  constructor(private platform: Platform) {
    this.detectPwa();
    this.setupInstallPrompt();
  }

  private detectPwa(): void {
    // Détecte si l'app est déjà installée comme PWA
    this.isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
                
    // Ajouter un listener pour le changement de mode d'affichage
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isPwa = e.matches;
      console.log('PWA status changed:', this.isPwa);
      
      // Appliquer des styles spécifiques lorsque l'app est en mode PWA
      if (this.isPwa) {
        document.body.classList.add('pwa-mode');
        
        // Correction pour les problèmes de navigation iOS
        if (this.platform.is('ios')) {
          document.body.classList.add('pwa-ios');
        }
      }
    });
    
    // Si on est déjà en mode PWA, appliquer les styles immédiatement
    if (this.isPwa) {
      document.body.classList.add('pwa-mode');
      if (this.platform.is('ios')) {
        document.body.classList.add('pwa-ios');
      }
    }
  }

  private setupInstallPrompt(): void {
    // Capture l'événement beforeinstallprompt pour l'utiliser plus tard
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this._canInstall.next(true);
      console.log('L\'application peut être installée');
    });
    
    // Réinitialise après l'installation
    window.addEventListener('appinstalled', () => {
      this._canInstall.next(false);
      this.deferredPrompt = null;
      console.log('Application installée avec succès');
    });
  }

  async installPwa(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('Aucune invite d\'installation disponible');
      return false;
    }

    try {
      // Affiche l'invite d'installation
      this.deferredPrompt.prompt();
      // Attend la réponse de l'utilisateur
      const choiceResult = await this.deferredPrompt.userChoice;
      // Réinitialise l'invite
      this.deferredPrompt = null;
      this._canInstall.next(false);
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Erreur lors de l\'installation PWA:', error);
      return false;
    }
  }
}
