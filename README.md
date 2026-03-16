# 🎸 Hellfest RO Planner

> **Version 2.0 (Vite + React)**

Guide interactif pour préparer votre Running Order du Hellfest Open Air Festival.

## 🚀 Démarrage rapide

```bash
# Installation des dépendances
npm install

# Lancement en mode développement
npm run dev

# Construction pour la production
npm run build

# Déploiement sur GitHub Pages
npm run deploy
```

## 🛠️ Stack Technique

- **React 18**
- **Vite** (Build Tool)
- **Context API** (State Management)
- **Firebase** (Auth Google + Firestore sync)
- **Local Storage** (Persistence hors-ligne)
- **PWA Support** (Offline mode)

## 📋 Fonctionnalités

- Visualisation dynamique du planning (vue jour / vue semaine)
- Système de tags personnalisés (Intérêt + Contexte)
- Gestion des créneaux personnels
- Statistiques de festivalier ("Hellfest DNA")
- Export de playlists
- Synchronisation cloud via Google (Firebase)
- Cercles d'amis : créez un cercle, invitez vos potes, et voyez leurs sélections en temps réel

## 🔥 Configurer son propre Firebase

Si vous forkez ce projet et souhaitez utiliser votre propre backend Firebase :

### 1. Créer un projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com/)
2. Cliquer **Ajouter un projet**, lui donner un nom, et terminer la création
3. Dans la page d'accueil du projet, cliquer **Ajouter une application** > **Web** (icone `</>`)
4. Donner un nom à l'app, puis copier l'objet `firebaseConfig` affiché

### 2. Activer l'authentification Google

1. Dans le menu latéral, aller dans **Authentication** > **Sign-in method**
2. Activer le fournisseur **Google**
3. Renseigner l'email d'assistance et sauvegarder

### 3. Créer la base Firestore

1. Dans le menu latéral, aller dans **Firestore Database** > **Créer une base de données**
2. Choisir le mode **Production**
3. Sélectionner la région la plus proche (ex: `europe-west1`)

### 4. Appliquer les règles de sécurité

Dans **Firestore Database** > **Règles**, remplacer le contenu par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /circles/{circleId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null
        && (request.auth.uid in resource.data.members
            || request.auth.uid in request.resource.data.members);
      allow delete: if false;
      match /members/{memberId} {
        allow read: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/circles/$(circleId)).data.members;
        allow write: if request.auth != null
          && request.auth.uid == memberId;
      }
    }
  }
}

```

Cliquer **Publier**.

### 5. Mettre à jour la config dans le code

Ouvrir `src/firebase.js` et remplacer l'objet `firebaseConfig` par celui copié à l'étape 1 :

```js
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJET.firebaseapp.com",
  projectId: "VOTRE_PROJET",
  storageBucket: "VOTRE_PROJET.firebasestorage.app",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
```

### 6. Autoriser votre domaine

Dans **Authentication** > **Settings** > **Authorized domains**, ajouter le domaine sur lequel l'app est hébergée (ex: `votre-user.github.io`).

## 🙏 Crédits

- Projet original par [DevinFafara](https://github.com/DevinFafara)
- Sync Firebase et cercles d'amis par [machintrucbidule](https://github.com/machintrucbidule)

---
*Développé pour les Hellbangers.* 🤘
