import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SharingService } from '../../services/sharing.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-modal',
  templateUrl: './share-modal.component.html',
  styleUrls: ['./share-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ShareModalComponent {
  @Input() title: string = '';
  @Input() text: string = '';
  @Input() url: string = '';
  
  constructor(
    private modalController: ModalController,
    private sharingService: SharingService
  ) {}
  
  dismiss() {
    this.modalController.dismiss();
  }
  
  shareOnFacebook() {
    this.sharingService.shareOnFacebook(this.url);
    this.dismiss();
  }
  
  shareOnTwitter() {
    this.sharingService.shareOnTwitter(this.text, this.url);
    this.dismiss();
  }
  
  shareOnWhatsApp() {
    this.sharingService.shareOnWhatsApp(this.text, this.url);
    this.dismiss();
  }
  
  shareOnLinkedIn() {
    this.sharingService.shareOnLinkedIn(this.url, this.title);
    this.dismiss();
  }
  
  shareByEmail() {
    this.sharingService.shareByEmail(this.title, this.text + '\n\n' + this.url);
    this.dismiss();
  }
  
  // These methods would require Capacitor/Cordova plugins or other approaches
  shareOnInstagram() {
    console.log('Instagram sharing requires native app integration');
    this.dismiss();
  }
  
  shareOnSnapchat() {
    console.log('Snapchat sharing requires native app integration');
    this.dismiss();
  }
}
