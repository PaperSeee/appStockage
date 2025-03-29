import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class SharingService {
  
  constructor(private modalController: ModalController) {}
  
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
    this.openShareWindow(shareUrl);
  }
  
  // Twitter/X share
  shareOnTwitter(text: string, url: string) {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    this.openShareWindow(shareUrl);
  }
  
  // WhatsApp share
  shareOnWhatsApp(text: string, url: string) {
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    this.openShareWindow(shareUrl);
  }
  
  // LinkedIn share
  shareOnLinkedIn(url: string, title: string) {
    const shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    this.openShareWindow(shareUrl);
  }
  
  // Email share
  shareByEmail(subject: string, body: string) {
    const shareUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = shareUrl;
  }
  
  // Instagram and Snapchat don't have direct web sharing URLs
  // We'd need to use a custom approach or plugins for native apps
  
  // Helper method to open share windows
  private openShareWindow(url: string) {
    window.open(url, '_blank', 'width=600,height=400');
  }
  
  // Method to show a share modal with all platform options
  async showShareOptions(title: string, text: string, url: string) {
    // First try Web Share API (for mobile devices that support it)
    const shared = await this.share(title, text, url);
    
    if (!shared) {
      // If Web Share API isn't available, show our custom modal
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
