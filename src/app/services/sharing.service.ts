import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { LinkHandlerService } from './link-handler.service';

@Injectable({
  providedIn: 'root'
})
export class SharingService {
  
  constructor(
    private modalController: ModalController,
    private linkHandler: LinkHandlerService
  ) {}
  
  // Try to use Web Share API first, fallback to custom methods
  async share(title: string, text: string, url: string): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
        return true;
      } catch (error) {
        console.error('Error sharing via Web Share API:', error);
        return false;
      }
    }
    return false;
  }
  
  // Facebook share
  shareOnFacebook(url: string) {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    this.linkHandler.openUrl(shareUrl);
  }
  
  // Twitter/X share
  shareOnTwitter(text: string, url: string) {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    this.linkHandler.openUrl(shareUrl);
  }
  
  // WhatsApp share
  shareOnWhatsApp(text: string, url: string) {
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    this.linkHandler.openUrl(shareUrl);
  }
  
  // LinkedIn share
  shareOnLinkedIn(url: string, title: string) {
    const shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    this.linkHandler.openUrl(shareUrl);
  }
  
  // Email share
  shareByEmail(subject: string, body: string) {
    const shareUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Emails peuvent s'ouvrir dans des apps natives
    window.location.href = shareUrl;
  }
  
  // Helper method to open share windows
  private openShareWindow(url: string) {
    this.linkHandler.openUrl(url);
  }
  
  // Method to show a share modal with all platform options
  async showShareOptions(title: string, text: string, url: string) {
    // First try Web Share API (for mobile devices that support it)
    const shared = await this.share(title, text, url);
    
    if (!shared) {
      // Si Web Share API n'est pas disponible, montrer notre modal personnalisé
      const modal = await this.modalController.create({
        component: 'ShareModalComponent',
        componentProps: {
          title,
          text,
          url
        }
      });
      
      await modal.present();
    }
  }
}
