import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { MessagingService, Conversation } from '../../../services/messaging.service';
import { FirebaseService } from '../../../services/firebase.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-conversations-list',
  templateUrl: './conversations-list.component.html',
  styleUrls: ['./conversations-list.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ConversationsListComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  loading = true;
  currentUserId: string | null = null;
  private conversationsSub: Subscription | null = null;

  constructor(
    private router: Router,
    private messagingService: MessagingService,
    private firebaseService: FirebaseService
  ) {}

  async ngOnInit() {
    this.loading = true;
    
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      this.currentUserId = user ? user.uid : null;
      
      // Subscribe to conversations
      this.conversationsSub = this.messagingService.conversations$.subscribe(conversations => {
        this.conversations = conversations;
        this.loading = false;
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.loading = false;
    }
  }

  openChat(conversation: Conversation) {
    if (conversation.id) {
      this.router.navigate(['/messaging/chat', conversation.id]);
    }
  }

  getOtherParticipantInfo(conversation: Conversation) {
    if (!this.currentUserId) return { name: 'Unknown', photo: '' };
    
    // If it's a group chat, return group info
    if (conversation.isGroup) {
      return {
        name: conversation.groupName || 'Groupe',
        photo: conversation.groupPhoto || 'assets/default-group.png',
        isGroup: true,
        participantCount: conversation.participants.length
      };
    }
    
    // For one-on-one chats, find the other participant
    if (!conversation.participantsInfo) return { name: 'Unknown', photo: '' };
    
    const otherParticipantId = conversation.participants.find(id => id !== this.currentUserId);
    
    if (!otherParticipantId || !conversation.participantsInfo[otherParticipantId]) {
      return { name: 'Unknown', photo: '' };
    }
    
    const participantInfo = conversation.participantsInfo[otherParticipantId];
    
    return {
      name: `${participantInfo.firstName} ${participantInfo.lastName}`.trim() || 'Unknown',
      photo: participantInfo.photo || 'assets/default-avatar.png'
    };
  }

  formatLastMessageTime(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24 hours, show time
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Less than 7 days, show day name
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  getUnreadCount(conversation: Conversation): number {
    if (!this.currentUserId || !conversation.unreadCount) return 0;
    return conversation.unreadCount[this.currentUserId] || 0;
  }

  isLastMessageFromMe(conversation: Conversation): boolean {
    return this.currentUserId !== null && conversation.lastMessageSenderId === this.currentUserId;
  }

  // Return conversations sorted by most recent first for the active conversations row
  sortedConversations(): Conversation[] {
    return [...this.conversations].sort((a, b) => {
      const timeA = a.lastMessageTime?.toDate ? a.lastMessageTime.toDate() : new Date(a.lastMessageTime || 0);
      const timeB = b.lastMessageTime?.toDate ? b.lastMessageTime.toDate() : new Date(b.lastMessageTime || 0);
      return timeB.getTime() - timeA.getTime();
    });
  }

  // Check if conversation is recent (within the last 24 hours)
  isRecentConversation(conversation: Conversation): boolean {
    if (!conversation.lastMessageTime) return false;
    
    const timestamp = conversation.lastMessageTime.toDate 
      ? conversation.lastMessageTime.toDate() 
      : new Date(conversation.lastMessageTime);
      
    const now = new Date();
    const timeDiff = now.getTime() - timestamp.getTime();
    
    // Return true if conversation had activity in the last 24 hours
    return timeDiff < 24 * 60 * 60 * 1000;
  }
  
  // Get a truncated name for the active conversations row
  getTruncatedName(name: string): string {
    if (!name) return 'User';
    const parts = name.split(' ');
    return parts[0].length > 8 ? parts[0].substring(0, 8) + '...' : parts[0];
  }

  ngOnDestroy() {
    if (this.conversationsSub) {
      this.conversationsSub.unsubscribe();
    }
  }
}
