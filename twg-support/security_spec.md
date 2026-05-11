# Security Specification for Support Chat System

## Data Invariants
1. A message must belong to a valid conversation.
2. A conversation must have a valid user ID.
3. An agent can only access conversations assigned to them.
4. Users can only access their own conversations.
5. Critical fields like `role` and `assignment` are immutable by the user.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **User Spoofing**: Attempt to create a conversation with someone else's `userId`.
2. **Role Escalation**: Attempt to update own user profile to `role: 'admin'`.
3. **Privilege Escalation**: Agent attempting to read a conversation assigned to ANOTHER agent.
4. **Unauthorized Deletion**: User attempting to delete a conversation or message (should be forbidden or restricted).
5. **Junk Data Injection**: Sending a message with a 1MB string or invalid characters.
6. **Assignee Hijacking**: Agent attempting to assign a conversation to themselves when they aren't the intended recipient or authorized.
7. **Terminal State Bypass**: Attempting to update a "solved" or "closed" conversation without admin rights.
8. **Shadow Field Injection**: Adding `isVerified: true` to a message payload.
9. **Timestamp Manipulation**: Sending a `createdAt` in the future or past on a message.
10. **PII Leak**: Authenticated user attempting to list ALL user profiles.
11. **Relational Orphan**: Creating a message for a non-existent conversation ID.
12. **Status Spoofing**: User attempting to mark a conversation as "solved" without actually being the requester (or if rules should restrict this to agents).

## Firebase Security Rules Strategy
I will use a split-collection pattern where necessary and rigorous `isValid[Entity]` helpers.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global Safety Net
    match /{document=**} {
      allow read, write: if false;
    }

    // --- Helpers ---
    function isSignedIn() { return request.auth != null; }
    function isVerified() { return isSignedIn() && request.auth.token.email_verified == true; }
    function getUserData() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function isAdmin() { return isVerified() && getUserData().role == 'admin'; }
    function isAgent() { return isVerified() && (getUserData().role == 'agent' || getUserData().role == 'admin'); }
    
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }

    // --- User Profile Rules ---
    match /users/{userId} {
      allow get: if isVerified() && (request.auth.uid == userId || isAgent());
      allow list: if isAgent(); // Agents need to list users
      allow create: if isVerified() && request.auth.uid == userId && 
                       incoming().role == 'user' && // Self-registered as 'user'
                       incoming().keys().hasAll(['uid', 'email', 'role', 'createdAt']) &&
                       incoming().uid == request.auth.uid;
      allow update: if isVerified() && request.auth.uid == userId &&
                       incoming().role == existing().role && // Cannot change role
                       incoming().diff(existing()).affectedKeys().hasOnly(['status', 'lastSeen', 'displayName', 'photoURL']);
    }

    // --- Conversation Rules ---
    function isOwner(conversationData) { return conversationData.userId == request.auth.uid; }
    function isAssigned(conversationData) { return conversationData.assignedTo == request.auth.uid; }

    match /conversations/{conversationId} {
      allow get: if isVerified() && (isOwner(existing()) || isAgent() && (isAssigned(existing()) || isAdmin()));
      allow list: if isVerified() && (
        (incoming() == null && isAgent()) || // Admin/Agent listing
        (resource.data.userId == request.auth.uid) // User listing their own
      );
      
      allow create: if isVerified() && 
                       incoming().userId == request.auth.uid &&
                       incoming().status == 'waiting' &&
                       isValidId(conversationId);
      
      allow update: if isVerified() && (
        isAdmin() ||
        (isOwner(existing()) && incoming().diff(existing()).affectedKeys().hasOnly(['status', 'rating']) && incoming().status in ['solved', 'closed']) ||
        (isAgent() && isAssigned(existing()) && incoming().diff(existing()).affectedKeys().hasOnly(['status', 'assignedTo', 'internalNotes', 'lastMessage', 'lastMessageAt']))
      );
    }

    // --- Message Rules ---
    match /conversations/{conversationId}/messages/{messageId} {
      function getConversation() { return get(/databases/$(database)/documents/conversations/$(conversationId)).data; }

      allow read: if isVerified() && (
        isOwner(getConversation()) || 
        isAgent() && (isAssigned(getConversation()) || isAdmin())
      );

      allow create: if isVerified() && (
        (isOwner(getConversation()) && incoming().senderId == request.auth.uid) ||
        (isAgent() && (isAssigned(getConversation()) || isAdmin()) && incoming().senderId == request.auth.uid)
      ) && incoming().createdAt == request.time;
    }
  }
}
```
