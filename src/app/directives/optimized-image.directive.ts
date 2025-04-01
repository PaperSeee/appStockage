import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';
import { ImageOptimizationService } from '../services/image-optimization.service';

@Directive({
  selector: 'img[appOptimizedImage]',
  standalone: true
})
export class OptimizedImageDirective implements OnInit {
  @Input() set appOptimizedImage(src: string) {
    this._src = src;
    this.updateImage();
  }
  
  @Input() width = 300;
  @Input() height = 200;
  
  private _src: string = '';
  private placeholderClass = 'image-loading';
  private loadedClass = 'image-loaded';
  
  constructor(
    private el: ElementRef<HTMLImageElement>,
    private renderer: Renderer2,
    private imageService: ImageOptimizationService
  ) {}
  
  ngOnInit() {
    // Ajouter la classe de loading et configurer les gestionnaires d'événements
    this.renderer.addClass(this.el.nativeElement, this.placeholderClass);
    
    this.el.nativeElement.addEventListener('load', () => {
      this.renderer.removeClass(this.el.nativeElement, this.placeholderClass);
      this.renderer.addClass(this.el.nativeElement, this.loadedClass);
    });
    
    this.el.nativeElement.addEventListener('error', (event) => {
      this.imageService.handleImageError(event);
    });
    
    // Configurer l'image avec lazy loading
    this.renderer.setAttribute(this.el.nativeElement, 'loading', 'lazy');
    
    // Mise à jour initiale de l'image
    this.updateImage();
  }
  
  private updateImage() {
    if (this._src) {
      // Appliquer l'URL optimisée
      const optimizedUrl = this.imageService.optimizeImageUrl(this._src, this.width, this.height);
      this.renderer.setAttribute(this.el.nativeElement, 'src', optimizedUrl);
    }
  }
}
