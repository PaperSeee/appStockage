import { Component } from '@angular/core';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-example',
  template: '<div>Example Component</div>'
})
export class ExampleComponent {
  constructor(private firebaseService: FirebaseService) {
    // Your Firebase instance is now accessible via this.firebaseService
    console.log('Firebase service initialized');
  }

  async fetchData() {
    try {
      const data = await this.firebaseService.getAllDocuments('your-collection');
      console.log('Data:', data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
}
