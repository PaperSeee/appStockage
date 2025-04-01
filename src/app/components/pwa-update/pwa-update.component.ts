import { Component, OnInit } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { interval } from 'rxjs';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-pwa-update',
  template: '',
  styles: []
})
export class PwaUpdateComponent implements OnInit {
  constructor(
    private swUpdate: SwUpdate,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      // Vérifier les mises à jour toutes les 6 heures
      interval(6 * 60 * 60 * 1000).subscribe(() => this.swUpdate.checkForUpdate());
      
      // Lorsqu'une mise à jour est disponible
      this.swUpdate.versionUpdates.subscribe(async (event) => {
        if (event.type === 'VERSION_READY') {
          const toast = await this.toastCtrl.create({
            message: 'Une nouvelle version est disponible. Cliquez pour mettre à jour.',
            position: 'bottom',
            buttons: [
              {
                text: 'Mettre à jour',
                handler: () => {
                  window.location.reload();
                }
              }
            ]
          });
          await toast.present();
        }
      });
    }
  }
}
