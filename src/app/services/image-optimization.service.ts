import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ImageOptimizationService {
  private readonly imageCache = new Map<string, string>();
  private readonly placeholderImage = 'assets/placeholder-image.jpg';
  private readonly lowMemoryThreshold = 50; // Mo

  constructor(private platform: Platform) {
    // Nettoyer le cache lorsque l'application est en arrière-plan ou que la mémoire est faible
    this.platform.pause.subscribe(() => this.clearImageCache());
    
    // Surveiller la mémoire disponible sur les appareils
    if ('memory' in navigator) {
      setInterval(() => {
        const memoryInfo = (navigator as any).memory;
        if (memoryInfo && (memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize) / 1048576 < this.lowMemoryThreshold) {
          this.clearImageCache();
        }
      }, 30000); // Vérifier toutes les 30 secondes
    }
  }

  /**
   * Optimise une URL d'image en fonction de la largeur et hauteur souhaitées
   */
  optimizeImageUrl(url: string, width: number, height: number): string {
    if (!url) return this.placeholderImage;
    
    // Vérifier dans le cache
    const cacheKey = `${url}_${width}x${height}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }
    
    // Pour les images Unsplash, ajouter des paramètres d'optimisation
    if (url.includes('unsplash.com')) {
      const optimizedUrl = `${url}&w=${width}&h=${height}&auto=format&q=80`;
      this.imageCache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }
    
    // Pour les images Pexels, optimiser l'URL
    if (url.includes('pexels.com')) {
      const optimizedUrl = url.replace('?auto=compress', `?auto=compress&w=${width}&h=${height}`);
      this.imageCache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }
    
    // Pour les avatars randomuser, utiliser une taille adaptée
    if (url.includes('randomuser.me')) {
      const optimizedUrl = url.replace('/api/', `/api/?w=${width}&h=${height}&`);
      this.imageCache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }
    
    // Pour les autres images, retourner l'URL d'origine
    this.imageCache.set(cacheKey, url);
    return url;
  }
  
  /**
   * Précharge une image pour une utilisation ultérieure
   */
  preloadImage(url: string, width: number, height: number): Promise<boolean> {
    return new Promise((resolve) => {
      const optimizedUrl = this.optimizeImageUrl(url, width, height);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = optimizedUrl;
    });
  }
  
  /**
   * Nettoie le cache d'images
   */
  clearImageCache(): void {
    this.imageCache.clear();
    console.log('Image cache cleared to free memory');
  }
  
  /**
   * Gère les erreurs de chargement d'image
   */
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement && imgElement.src !== this.placeholderImage) {
      imgElement.src = this.placeholderImage;
    }
  }
}
