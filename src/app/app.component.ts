import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false  // Explicitly set to false
})
export class AppComponent implements OnInit {
  constructor(private router: Router, private firebaseService: FirebaseService) {}

  async ngOnInit() {
    // Check for redirect result on app initialization
    try {
      const user = await this.firebaseService.getRedirectResult();
      if (user) {
        console.log('Successfully signed in via redirect');
        // Navigate to main page or handle user data
        this.router.navigate(['/tabs/tab1']);
      }
    } catch (error) {
      console.error('Error with redirect sign-in:', error);
    }
  }
}
