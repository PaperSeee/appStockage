import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { IonicModule, IonContent, AlertController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessagingService, Conversation, Message } from '../../../services/messaging.service';
import { FirebaseService } from '../../../services/firebase.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;
  
  conversationId: string = '';
  conversation: Conversation | null = null;
  messages: Message[] = [];
  currentUserId: string | null = null;
  newMessage: string = '';
  loading = true;
  
  private messagesSub: Subscription | null = null;
  private conversationSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messagingService: MessagingService,
    private firebaseService: FirebaseService,
    private alertController: AlertController,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    this.loading = true;
    
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      this.currentUserId = user ? user.uid : null;
      
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.conversationId = id;
          this.messagingService.setActiveConversation(id);
          
          // Subscribe to active conversation
          this.conversationSub = this.messagingService.activeConversation$.subscribe(conversation => {
            this.conversation = conversation;
          });
          
          // Subscribe to messages
          this.messagesSub = this.messagingService.messages$.subscribe(messages => {
            this.messages = messages;
            this.loading = false;
            
            // Scroll to bottom after messages are loaded
            setTimeout(() => {
              this.scrollToBottom();
            }, 100);
          });
        }
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
      this.loading = false;
    }
  }

  sendMessage() {
    if (this.newMessage.trim() && this.conversationId) {
      this.messagingService.sendMessage(this.conversationId, this.newMessage);
      this.newMessage = '';
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }

  scrollToBottom() {
    if (this.content) {
      this.content.scrollToBottom(300);
    }
  }

  getConversationPhoto(): string {
    // If this is a group conversation, return the group photo
    if (this.conversation?.isGroup) {
      return this.conversation.groupPhoto || 'assets/default-group.png';
    }
    
    // Otherwise, get the other participant's photo
    return this.getOtherParticipantInfo().photo;
  }

  getConversationName(): string {
    // If this is a group conversation, return the group name
    if (this.conversation?.isGroup) {
      return this.conversation.groupName || 'Groupe';
    }
    
    // Otherwise, get the other participant's name
    return this.getOtherParticipantInfo().name;
  }

  getSenderName(senderId: string): string {
    if (!this.conversation?.participantsInfo || !this.conversation.participantsInfo[senderId]) {
      return 'Utilisateur';
    }
    
    const senderInfo = this.conversation.participantsInfo[senderId];
    return `${senderInfo.firstName || ''} ${senderInfo.lastName || ''}`.trim() || 'Utilisateur';
  }

  async showGroupInfo() {
    if (!this.conversation?.isGroup) return;
    
    // For now, just show a simple alert with group information
    // In a real app, you might want to navigate to a dedicated group info page or show a modal
    const participantsInfo = Object.entries(this.conversation.participantsInfo)
      .map(([id, info]: [string, any]) => {
        const name = `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Utilisateur';
        const role = id === this.conversation?.groupCreator ? ' (Créateur)' : '';
        return `- ${name}${role}`;
      })
      .join('\n');
    
    const alert = await this.alertController.create({
      header: this.conversation.groupName || 'Groupe',
      subHeader: `${this.conversation.participants.length} participants`,
      message: `Participants:\n${participantsInfo}`,
      buttons: [
        {
          text: 'Fermer',
          role: 'cancel'
        },
        {
          text: 'Quitter le groupe',
          role: 'destructive',
          handler: () => {
            this.leaveGroup();
          }
        }
      ]
    });
    
    await alert.present();
  }

  async leaveGroup() {
    if (!this.conversation?.isGroup || !this.currentUserId) return;
    
    // Capture currentUserId as a non-null string to use in the async handler
    const userId = this.currentUserId;
    
    const alert = await this.alertController.create({
      header: 'Quitter le groupe',
      message: 'Êtes-vous sûr de vouloir quitter ce groupe ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Quitter',
          role: 'destructive',
          handler: async () => {
            try {
              await this.messagingService.removeParticipantFromGroup(
                this.conversationId, 
                userId  // Use the captured non-null userId variable
              );
              this.router.navigate(['/messaging']);
            } catch (error) {
              console.error('Error leaving group:', error);
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  getOtherParticipantInfo() {
    if (!this.currentUserId || !this.conversation?.participantsInfo) {
      return { name: 'Chat', photo: '' };
    }
    
    const otherParticipantId = this.conversation.participants.find(id => id !== this.currentUserId);
    
    if (!otherParticipantId || !this.conversation.participantsInfo[otherParticipantId]) {
      return { name: 'Chat', photo: '' };
    }
    
    const participantInfo = this.conversation.participantsInfo[otherParticipantId];
    
    return {
      name: `${participantInfo.firstName} ${participantInfo.lastName}`.trim() || 'Chat',
      photo: participantInfo.photo || 'assets/par défaut.jpg'
    };
  }

  formatMessageTime(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  isFirstMessageOfDay(message: Message, index: number): boolean {
    if (index === 0) return true;
    
    const currentDate = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
    const prevMessage = this.messages[index - 1];
    const prevDate = prevMessage.timestamp?.toDate ? prevMessage.timestamp.toDate() : new Date(prevMessage.timestamp);
    
    return currentDate.toDateString() !== prevDate.toDateString();
  }

  formatDateDivider(message: Message): string {
    if (!message.timestamp) return '';
    
    const date = message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  ngOnDestroy() {
    if (this.messagesSub) {
      this.messagesSub.unsubscribe();
    }
    
    if (this.conversationSub) {
      this.conversationSub.unsubscribe();
    }
  }
}
