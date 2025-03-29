import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class NotificationsComponent {
  @Input() notifications: any[] = [];

  constructor(
    private modalController: ModalController,
    private router: Router
  ) {}

  dismiss() {
    this.modalController.dismiss();
  }

  async viewNotification(notification: any) {
    await this.modalController.dismiss();
    
    // Rediriger vers le post
    this.router.navigate(['/tabs/tab3'], { 
      queryParams: { postId: notification.postId } 
    });
  }

  // Formatter la date pour affichage
  formatTime(date: Date): string {
    if (!date) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Moins d'une minute
    if (diff < 60 * 1000) {
      return 'à l\'instant';
    }
    
    // Moins d'une heure
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `il y a ${minutes} min`;
    }
    
    // Moins d'un jour
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `il y a ${hours}h`;
    }
    
    // Plus d'un jour
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `il y a ${days}j`;
  }
}
