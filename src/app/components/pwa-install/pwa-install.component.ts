import { Component, OnInit } from '@angular/core';
import { PwaInstallService } from '../../services/pwa-install.service';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-pwa-install',
  template: `
    <ion-button *ngIf="canInstall" expand="block" (click)="installPwa()">
      <ion-icon name="download-outline" slot="start"></ion-icon>
      Installer l'application
    </ion-button>
  `,
  styles: [`
    ion-button {
      margin: 10px;
      --background: #3880ff;
    }
  `],
  standalone: false // Ajout de cette propriété
})
export class PwaInstallComponent implements OnInit {
  canInstall = false;
  
  constructor(
    private pwaInstallService: PwaInstallService,
    private platform: Platform
  ) {}
  
  ngOnInit() {
    this.pwaInstallService.canInstall$.subscribe(canInstall => {
      this.canInstall = canInstall && !this.pwaInstallService.isPwa;
    });
  }
  
  async installPwa() {
    try {
      const installed = await this.pwaInstallService.installPwa();
      console.log('PWA installed:', installed);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  }
}
