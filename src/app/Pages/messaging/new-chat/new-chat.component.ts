import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { MessagingService, UserDocument } from '../../../services/messaging.service';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  discipline?: string;
  level?: string;
}

@Component({
  selector: 'app-new-chat',
  templateUrl: './new-chat.component.html',
  styleUrls: ['./new-chat.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class NewChatComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  loading = true;
  currentUserId: string | null = null;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private messagingService: MessagingService
  ) {}

  async ngOnInit() {
    this.loading = true;
    
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      this.currentUserId = user ? user.uid : null;
      
      if (this.currentUserId) {
        // Get all users except current user
        const usersData = await this.firebaseService.getAllDocuments('users') as UserDocument[];
        this.users = usersData
          .filter(user => user.id !== this.currentUserId)
          .map(user => ({
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            photo: user.photo || '',
            discipline: user.discipline || '',
            level: user.level || ''
          }));
          
        this.filteredUsers = [...this.users];
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.loading = false;
    }
  }

  filterUsers() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredUsers = [...this.users];
      return;
    }
    
    this.filteredUsers = this.users.filter(user => 
      (user.firstName && user.firstName.toLowerCase().includes(term)) ||
      (user.lastName && user.lastName.toLowerCase().includes(term)) ||
      (user.discipline && user.discipline.toLowerCase().includes(term))
    );
  }

  async startConversation(user: User) {
    try {
      const conversationId = await this.messagingService.createConversation(user.id);
      this.router.navigate(['/messaging/chat', conversationId]);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }

  getUserFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`.trim() || 'Utilisateur';
  }
}
