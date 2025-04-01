import { Injectable } from '@angular/core';
import { 
  Firestore, collection, doc, getDoc, setDoc, updateDoc, 
  query, where, orderBy, onSnapshot, serverTimestamp, 
  addDoc, arrayUnion, limit, getDocs
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Message {
  id?: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
}

// Update the interface to include group chat properties
export interface Conversation {
  id?: string;
  participants: string[];
  participantsInfo: { [key: string]: any };
  lastMessage: string;
  lastMessageTime: any;
  lastMessageSenderId: string;
  lastMessageRead?: boolean; // Add this property
  unreadCount: { [key: string]: number };
  isGroup?: boolean; // Indicates if this is a group conversation
  groupName?: string; // Name for group conversations
  groupPhoto?: string; // Photo URL for group conversations
  groupCreator?: string; // User ID of the creator
  groupCreatedAt?: any; // Timestamp when group was created
}

// User document interface
export interface UserDocument {
  id: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  discipline?: string;
  level?: string;
  [key: string]: any; // Allow other properties
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private firestore: Firestore;
  private currentUserId: string | null = null;
  
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  conversations$ = this.conversationsSubject.asObservable();
  
  private activeConversationSubject = new BehaviorSubject<Conversation | null>(null);
  activeConversation$ = this.activeConversationSubject.asObservable();
  
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSubject.asObservable();
  
  private conversationsUnsubscribe: (() => void) | null = null;
  private messagesUnsubscribe: (() => void) | null = null;

  constructor(private firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.firestore;
    this.initCurrentUser();
  }

  async initCurrentUser() {
    try {
      const user = await this.firebaseService.getCurrentUser() as any;
      if (user) {
        this.currentUserId = user.uid;
        this.listenToConversations();
      }
    } catch (error) {
      console.error('Error initializing current user:', error);
    }
  }

  // Listen to user's conversations in real-time
  private listenToConversations() {
    if (!this.currentUserId) return;

    if (this.conversationsUnsubscribe) {
      this.conversationsUnsubscribe();
    }

    const conversationsRef = collection(this.firestore, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', this.currentUserId)
    );

    this.conversationsUnsubscribe = onSnapshot(q, async (querySnapshot) => {
      const conversations: Conversation[] = [];

      for (const doc of querySnapshot.docs) {
        const conversation = { id: doc.id, ...doc.data() } as Conversation;

        // Ajouter des informations par défaut si aucun message n'existe
        if (!conversation.lastMessageTime) {
          conversation.lastMessage = 'Aucun message';
          conversation.lastMessageTime = conversation.groupCreatedAt || new Date();
        }

        // Charger les informations des participants si elles n'existent pas
        if (!conversation.participantsInfo || Object.keys(conversation.participantsInfo).length === 0) {
          conversation.participantsInfo = {};
          for (const participantId of conversation.participants) {
            if (participantId !== this.currentUserId) {
              const userDoc = await this.firebaseService.getDocument('users', participantId) as UserDocument;
              if (userDoc) {
                conversation.participantsInfo[participantId] = {
                  firstName: userDoc.firstName || '',
                  lastName: userDoc.lastName || '',
                  photo: userDoc.photo || 'assets/par défaut.jpg'
                };
              }
            }
          }
          await updateDoc(doc.ref, { participantsInfo: conversation.participantsInfo });
        }

        conversations.push(conversation);
      }

      this.conversationsSubject.next(conversations);
    });
  }

  // Listen to messages in the active conversation
  listenToMessages(conversationId: string) {
    if (!conversationId) return;
    
    // Clean up previous listener if exists
    if (this.messagesUnsubscribe) {
      this.messagesUnsubscribe();
    }
    
    const messagesRef = collection(this.firestore, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    this.messagesUnsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages: Message[] = querySnapshot.docs.map(doc => {
        return { id: doc.id, ...doc.data() } as Message;
      });
      
      this.messagesSubject.next(messages);
      
      // Mark messages as read if they weren't sent by the current user
      this.markMessagesAsRead(conversationId);
    });
  }

  // Set the active conversation
  async setActiveConversation(conversationId: string) {
    const conversationRef = doc(this.firestore, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const conversation = { id: conversationSnap.id, ...conversationSnap.data() } as Conversation;
      this.activeConversationSubject.next(conversation);
      this.listenToMessages(conversationId);
    } else {
      console.error('Conversation not found');
    }
  }

  // Send a message
  async sendMessage(conversationId: string, text: string) {
    if (!this.currentUserId || !text.trim()) return;
    
    try {
      const messageData: Omit<Message, 'id'> = {
        senderId: this.currentUserId,
        text: text.trim(),
        timestamp: serverTimestamp(),
        read: false
      };
      
      // Add message to the conversation's messages subcollection
      const messagesRef = collection(this.firestore, 'conversations', conversationId, 'messages');
      await addDoc(messagesRef, messageData);
      
      // Update conversation metadata
      const conversationRef = doc(this.firestore, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const conversation = conversationSnap.data() as Conversation;
        const unreadCount = { ...conversation.unreadCount };
        
        // Increment unread count for all participants except sender
        conversation.participants.forEach(participantId => {
          if (participantId !== this.currentUserId) {
            unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
          }
        });
        
        await updateDoc(conversationRef, {
          lastMessage: text.trim(),
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: this.currentUserId,
          unreadCount
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string) {
    if (!this.currentUserId) return;
    
    try {
      const conversationRef = doc(this.firestore, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const conversation = conversationSnap.data() as Conversation;
        const unreadCount = { ...conversation.unreadCount };
        
        // Reset unread count for current user
        if (unreadCount[this.currentUserId]) {
          unreadCount[this.currentUserId] = 0;
          await updateDoc(conversationRef, { unreadCount });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Create a new conversation
  async createConversation(otherUserId: string, initialMessage?: string): Promise<string> {
    if (!this.currentUserId || !otherUserId) {
      throw new Error('Missing user IDs');
    }
    
    // Check if a conversation already exists between these users
    const existingConv = await this.findExistingConversation(otherUserId);
    if (existingConv) {
      return existingConv.id!;
    }
    
    try {
      // Get other user's info
      const otherUserDoc = await this.firebaseService.getDocument('users', otherUserId) as UserDocument;
      const currentUserDoc = await this.firebaseService.getDocument('users', this.currentUserId) as UserDocument;
      
      if (!otherUserDoc || !currentUserDoc) {
        throw new Error('User not found');
      }
      
      const participantsInfo: {[key: string]: any} = {};
      
      participantsInfo[otherUserId] = {
        firstName: otherUserDoc.firstName || '',
        lastName: otherUserDoc.lastName || '',
        photo: otherUserDoc.photo || ''
      };
      
      participantsInfo[this.currentUserId] = {
        firstName: currentUserDoc.firstName || '',
        lastName: currentUserDoc.lastName || '',
        photo: currentUserDoc.photo || ''
      };
      
      // Create new conversation
      const conversationData: Omit<Conversation, 'id'> = {
        participants: [this.currentUserId, otherUserId],
        participantsInfo,
        lastMessage: initialMessage || '',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: this.currentUserId,
        lastMessageRead: false,
        unreadCount: {
          [otherUserId]: initialMessage ? 1 : 0
        }
      };
      
      const conversationsRef = collection(this.firestore, 'conversations');
      const conversationDoc = await addDoc(conversationsRef, conversationData);
      
      // If there's an initial message, add it
      if (initialMessage) {
        const messageData: Omit<Message, 'id'> = {
          senderId: this.currentUserId,
          text: initialMessage,
          timestamp: serverTimestamp(),
          read: false
        };
        
        const messagesRef = collection(this.firestore, 'conversations', conversationDoc.id, 'messages');
        await addDoc(messagesRef, messageData);
      }
      
      return conversationDoc.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Create a new group conversation
  async createGroupConversation(
    participantIds: string[], 
    groupName: string, 
    groupPhoto: string = '',
    initialMessage?: string
  ): Promise<string> {
    if (!this.currentUserId) {
      throw new Error('User not logged in');
    }
    
    if (!participantIds.length || !groupName.trim()) {
      throw new Error('Missing required group information');
    }
    
    try {
      // Make sure the current user is included in participants
      if (!participantIds.includes(this.currentUserId)) {
        participantIds.push(this.currentUserId);
      }
      
      // Get information about all participants
      const participantsInfo: {[key: string]: any} = {};
      
      for (const participantId of participantIds) {
        const userDoc = await this.firebaseService.getDocument('users', participantId) as UserDocument;
        if (userDoc) {
          participantsInfo[participantId] = {
            firstName: userDoc.firstName || '',
            lastName: userDoc.lastName || '',
            photo: userDoc.photo || ''
          };
        }
      }
      
      // Create initial unread counts object (0 for all users)
      const unreadCount: {[key: string]: number} = {};
      participantIds.forEach(id => {
        // The creator doesn't have unread messages at creation
        unreadCount[id] = id === this.currentUserId ? 0 : (initialMessage ? 1 : 0);
      });
      
      // Create new group conversation
      const conversationData: Omit<Conversation, 'id'> = {
        participants: participantIds,
        participantsInfo,
        lastMessage: initialMessage || 'Groupe créé',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: this.currentUserId,
        lastMessageRead: false,
        unreadCount,
        isGroup: true,
        groupName: groupName.trim(),
        groupPhoto,
        groupCreator: this.currentUserId,
        groupCreatedAt: serverTimestamp()
      };
      
      const conversationsRef = collection(this.firestore, 'conversations');
      const conversationDoc = await addDoc(conversationsRef, conversationData);
      
      // If there's an initial message, add it
      if (initialMessage) {
        const messageData: Omit<Message, 'id'> = {
          senderId: this.currentUserId,
          text: initialMessage,
          timestamp: serverTimestamp(),
          read: false
        };
        
        const messagesRef = collection(this.firestore, 'conversations', conversationDoc.id, 'messages');
        await addDoc(messagesRef, messageData);
      } else {
        // Add a system message about group creation
        const systemMessage: Omit<Message, 'id'> = {
          senderId: 'system',
          text: `${participantsInfo[this.currentUserId]?.firstName || 'Utilisateur'} a créé le groupe "${groupName}"`,
          timestamp: serverTimestamp(),
          read: false
        };
        
        const messagesRef = collection(this.firestore, 'conversations', conversationDoc.id, 'messages');
        await addDoc(messagesRef, systemMessage);
      }
      
      return conversationDoc.id;
    } catch (error) {
      console.error('Error creating group conversation:', error);
      throw error;
    }
  }
  
  // Add a participant to a group
  async addParticipantToGroup(conversationId: string, userId: string): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      const conversationRef = doc(this.firestore, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const conversation = conversationSnap.data() as Conversation;
        
        // Check if this is a group and if the user is not already in it
        if (!conversation.isGroup) {
          throw new Error('This is not a group conversation');
        }
        
        if (conversation.participants.includes(userId)) {
          throw new Error('User is already in this group');
        }
        
        // Get the user info to add to participants info
        const userDoc = await this.firebaseService.getDocument('users', userId) as UserDocument;
        if (!userDoc) {
          throw new Error('User not found');
        }
        
        // Update conversation with new participant
        const updatedParticipants = [...conversation.participants, userId];
        const updatedParticipantsInfo = {
          ...conversation.participantsInfo,
          [userId]: {
            firstName: userDoc.firstName || '',
            lastName: userDoc.lastName || '',
            photo: userDoc.photo || ''
          }
        };
        
        // Update unread count for the new user
        const updatedUnreadCount = { ...conversation.unreadCount, [userId]: 0 };
        
        await updateDoc(conversationRef, {
          participants: updatedParticipants,
          participantsInfo: updatedParticipantsInfo,
          unreadCount: updatedUnreadCount
        });
        
        // Add a system message about the new participant
        const adderName = conversation.participantsInfo[this.currentUserId]?.firstName || 'Quelqu\'un';
        const addedName = userDoc.firstName || 'Un utilisateur';
        
        const systemMessage: Omit<Message, 'id'> = {
          senderId: 'system',
          text: `${adderName} a ajouté ${addedName} au groupe`,
          timestamp: serverTimestamp(),
          read: false
        };
        
        const messagesRef = collection(this.firestore, 'conversations', conversationId, 'messages');
        await addDoc(messagesRef, systemMessage);
      }
    } catch (error) {
      console.error('Error adding participant to group:', error);
      throw error;
    }
  }
  
  // Remove a participant from a group
  async removeParticipantFromGroup(conversationId: string, userId: string): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      const conversationRef = doc(this.firestore, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const conversation = conversationSnap.data() as Conversation;
        
        // Check if this is a group and if the user is in it
        if (!conversation.isGroup) {
          throw new Error('This is not a group conversation');
        }
        
        if (!conversation.participants.includes(userId)) {
          throw new Error('User is not in this group');
        }
        
        // Only the group creator or the user themselves can remove a participant
        if (this.currentUserId !== conversation.groupCreator && this.currentUserId !== userId) {
          throw new Error('You do not have permission to remove this participant');
        }
        
        // Remove the participant
        const updatedParticipants = conversation.participants.filter(id => id !== userId);
        
        // Create a copy of participants info without the removed user
        const updatedParticipantsInfo = { ...conversation.participantsInfo };
        delete updatedParticipantsInfo[userId];
        
        // Create a copy of unread counts without the removed user
        const updatedUnreadCount = { ...conversation.unreadCount };
        delete updatedUnreadCount[userId];
        
        await updateDoc(conversationRef, {
          participants: updatedParticipants,
          participantsInfo: updatedParticipantsInfo,
          unreadCount: updatedUnreadCount
        });
        
        // Add a system message about the removed participant
        const removerName = this.currentUserId === userId 
          ? conversation.participantsInfo[userId]?.firstName || 'Un utilisateur'
          : conversation.participantsInfo[this.currentUserId]?.firstName || 'Quelqu\'un';
        
        const removedName = conversation.participantsInfo[userId]?.firstName || 'Un utilisateur';
        
        const systemMessage: Omit<Message, 'id'> = {
          senderId: 'system',
          text: this.currentUserId === userId
            ? `${removerName} a quitté le groupe`
            : `${removerName} a retiré ${removedName} du groupe`,
          timestamp: serverTimestamp(),
          read: false
        };
        
        const messagesRef = collection(this.firestore, 'conversations', conversationId, 'messages');
        await addDoc(messagesRef, systemMessage);
      }
    } catch (error) {
      console.error('Error removing participant from group:', error);
      throw error;
    }
  }
  
  // Update group information
  async updateGroupInfo(conversationId: string, updates: { groupName?: string, groupPhoto?: string }): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      const conversationRef = doc(this.firestore, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const conversation = conversationSnap.data() as Conversation;
        
        // Check if this is a group and if the current user is the creator
        if (!conversation.isGroup) {
          throw new Error('This is not a group conversation');
        }
        
        if (conversation.groupCreator !== this.currentUserId) {
          throw new Error('Only the group creator can update group information');
        }
        
        // Update only provided fields
        const updateData: any = {};
        if (updates.groupName !== undefined) {
          updateData.groupName = updates.groupName.trim();
        }
        if (updates.groupPhoto !== undefined) {
          updateData.groupPhoto = updates.groupPhoto;
        }
        
        await updateDoc(conversationRef, updateData);
        
        // Add a system message about the update
        const updaterName = conversation.participantsInfo[this.currentUserId]?.firstName || 'Quelqu\'un';
        let updateText = `${updaterName} a mis à jour les informations du groupe`;
        
        if (updates.groupName !== undefined) {
          updateText = `${updaterName} a renommé le groupe en "${updates.groupName.trim()}"`;
        } else if (updates.groupPhoto !== undefined) {
          updateText = `${updaterName} a changé la photo du groupe`;
        }
        
        const systemMessage: Omit<Message, 'id'> = {
          senderId: 'system',
          text: updateText,
          timestamp: serverTimestamp(),
          read: false
        };
        
        const messagesRef = collection(this.firestore, 'conversations', conversationId, 'messages');
        await addDoc(messagesRef, systemMessage);
      }
    } catch (error) {
      console.error('Error updating group info:', error);
      throw error;
    }
  }

  // Find existing conversation between current user and another user
  private async findExistingConversation(otherUserId: string): Promise<Conversation | null> {
    if (!this.currentUserId) return null;
    
    const conversations = this.conversationsSubject.getValue();
    
    // Check in-memory first
    for (const conv of conversations) {
      if (conv.participants.includes(otherUserId) && conv.participants.length === 2) {
        return conv;
      }
    }
    
    // If not found in memory, check in Firestore
    try {
      const conversationsRef = collection(this.firestore, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', this.currentUserId)
      );
      
      const querySnapshot = await getDocs(q);
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as Conversation;
        if (data.participants.includes(otherUserId) && data.participants.length === 2) {
          return { id: doc.id, ...data };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding existing conversation:', error);
      return null;
    }
  }

  // Get total unread message count for badge
  getTotalUnreadCount(): number {
    if (!this.currentUserId) return 0;
    
    const conversations = this.conversationsSubject.getValue();
    let totalUnread = 0;
    
    conversations.forEach(conv => {
      if (conv.unreadCount && this.currentUserId && conv.unreadCount[this.currentUserId]) {
        totalUnread += conv.unreadCount[this.currentUserId];
      }
    });
    
    return totalUnread;
  }

  // Clean up listeners
  cleanup() {
    if (this.conversationsUnsubscribe) {
      this.conversationsUnsubscribe();
    }
    
    if (this.messagesUnsubscribe) {
      this.messagesUnsubscribe();
    }
    
    this.conversationsSubject.next([]);
    this.messagesSubject.next([]);
    this.activeConversationSubject.next(null);
  }
}
