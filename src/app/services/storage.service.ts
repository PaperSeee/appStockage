import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbName = 'appFightDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  
  constructor() {
    this.initDB();
  }
  
  /**
   * Initialise la base de données IndexedDB
   */
  private initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return Promise.resolve(this.db);
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject('Error opening IndexedDB');
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Créer les object stores si ils n'existent pas
        if (!db.objectStoreNames.contains('trainings')) {
          db.createObjectStore('trainings', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('competitions')) {
          db.createObjectStore('competitions', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }
  
  /**
   * Stocke des données dans un objectStore spécifique
   */
  setItem<T>(storeName: string, data: T[]): Observable<boolean> {
    return from(this.initDB().then(db => {
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Effacer toutes les données existantes
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          // Ajouter les nouvelles données
          data.forEach(item => {
            store.add(item);
          });
        };
        
        transaction.oncomplete = () => {
          resolve(true);
        };
        
        transaction.onerror = (event) => {
          console.error(`Error storing data in ${storeName}`, event);
          reject(false);
        };
      });
    })).pipe(
      catchError(err => {
        console.error('Error in setItem:', err);
        // Fallback to localStorage if IndexedDB fails
        try {
          localStorage.setItem(storeName, JSON.stringify(data));
          return of(true);
        } catch (e) {
          console.error('localStorage fallback failed:', e);
          return of(false);
        }
      })
    );
  }
  
  /**
   * Récupère toutes les données d'un objectStore
   */
  getItems<T>(storeName: string): Observable<T[]> {
    return from(this.initDB().then(db => {
      return new Promise<T[]>((resolve, reject) => {
        try {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          
          request.onsuccess = () => {
            resolve(request.result);
          };
          
          request.onerror = (event) => {
            console.error(`Error getting data from ${storeName}`, event);
            reject([]);
          };
        } catch (e) {
          reject([]);
        }
      });
    })).pipe(
      catchError(err => {
        console.error('Error in getItems:', err);
        // Fallback to localStorage
        try {
          const data = localStorage.getItem(storeName);
          return of(data ? JSON.parse(data) : []);
        } catch (e) {
          console.error('localStorage fallback failed:', e);
          return of([]);
        }
      })
    );
  }
  
  /**
   * Stocke une valeur unique (pour les settings)
   */
  setSetting(key: string, value: any): Observable<boolean> {
    return from(this.initDB().then(db => {
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction('settings', 'readwrite');
        const store = transaction.objectStore('settings');
        
        const request = store.put({ key, value });
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = () => {
          reject(false);
        };
      });
    })).pipe(
      catchError(err => {
        console.error('Error in setSetting:', err);
        try {
          localStorage.setItem(`setting_${key}`, JSON.stringify(value));
          return of(true);
        } catch (e) {
          return of(false);
        }
      })
    );
  }
  
  /**
   * Récupère une valeur unique (pour les settings)
   */
  getSetting<T>(key: string, defaultValue: T): Observable<T> {
    return from(this.initDB().then(db => {
      return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction('settings', 'readonly');
        const store = transaction.objectStore('settings');
        
        const request = store.get(key);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.value);
          } else {
            resolve(defaultValue);
          }
        };
        
        request.onerror = () => {
          reject(defaultValue);
        };
      });
    })).pipe(
      catchError(err => {
        console.error('Error in getSetting:', err);
        try {
          const value = localStorage.getItem(`setting_${key}`);
          return of(value ? JSON.parse(value) : defaultValue);
        } catch (e) {
          return of(defaultValue);
        }
      })
    );
  }
  
  /**
   * Efface toutes les données d'un store
   */
  clearStore(storeName: string): Observable<boolean> {
    return from(this.initDB().then(db => {
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = () => {
          reject(false);
        };
      });
    })).pipe(
      catchError(err => {
        console.error(`Error clearing store ${storeName}:`, err);
        try {
          localStorage.removeItem(storeName);
          return of(true);
        } catch (e) {
          return of(false);
        }
      })
    );
  }
}
