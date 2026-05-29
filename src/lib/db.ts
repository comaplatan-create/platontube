import { doc, getDoc, setDoc, getDocs, collection, query, where, updateDoc, increment, deleteDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { handleFirestoreError, OperationType } from './errors';

export interface User {
  handle: string; // @handle (Primary Key)
  name: string;
  subscriberCount: number;
  subscriptions?: string[];
  likedVideos?: string[];
  likedComments?: string[];
  uid?: string;
  avatarUrl?: string;
}

export interface Video {
  id?: string;
  handle: string; // Author's handle
  title: string;
  description: string;
  videoUrl?: string; // URL from Firebase Storage
  thumbnailUrl?: string; // URL from Firebase Storage
  videoBlob?: Blob; // For backwards compatibility during upload
  thumbnailBlob?: Blob; // For backwards compatibility during upload
  type: 'video' | 'short';
  createdAt: number;
  views: number;
  likes?: number;
}

export interface Comment {
  id?: string;
  videoId: string;
  userHandle: string;
  text: string;
  createdAt: number;
  likes?: number;
}

export async function getUser(handle: string): Promise<User | undefined> {
  try {
    const docRef = doc(db, 'users', handle);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return undefined;
    
    // Fetch likes from private subcollection
    let likedVideos: string[] = [];
    let likedComments: string[] = [];
    if (auth.currentUser) {
      try { // try fetching private info, may fail if not authorized
        const likesSnap = await getDoc(doc(db, `users/${handle}/private/likes`));
        if (likesSnap.exists()) {
          const data = likesSnap.data();
          likedVideos = data.likedVideos || [];
          likedComments = data.likedComments || [];
        }
      } catch (e) {
        // Safe to ignore if not authorized
      }
    }

    return { ...(snap.data() as User), likedVideos, likedComments };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${handle}`, auth);
    return undefined;
  }
}

export async function getUserByUid(uid: string): Promise<User | undefined> {
  try {
    const q = query(collection(db, 'users'), where('uid', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return getUser(snap.docs[0].id);
    }
    return undefined;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users`, auth);
    return undefined;
  }
}

export async function updateUserSettings(handle: string, updates: Partial<User>): Promise<void> {
  try {
    const docRef = doc(db, 'users', handle);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${handle}`, auth);
  }
}

import { writeBatch } from 'firebase/firestore';

export async function changeUserHandle(oldHandle: string, newHandle: string, name: string, avatarBlob: Blob | null, subscriptions: string[], subscriberCount: number): Promise<boolean> {
  // check unique newHandle
  const u = await getUser(newHandle);
  if (u) {
    throw new Error('Этот псевдоним уже занят');
  }

  const batch = writeBatch(db);

  // 1. Get old user & private/likes
  const oldUserDoc = await getDoc(doc(db, 'users', oldHandle));
  if (!oldUserDoc.exists()) throw new Error('User not found');
  const oldUser = oldUserDoc.data() as User;

  let likesData = { likedVideos: [] as string[], likedComments: [] as string[] };
  if (auth.currentUser) {
    try {
      const likesDoc = await getDoc(doc(db, `users/${oldHandle}/private/likes`));
      if (likesDoc.exists()) {
        likesData = {
          likedVideos: likesDoc.data().likedVideos || [],
          likedComments: likesDoc.data().likedComments || []
        };
      }
    } catch(e) {}
  }

  let avatarUrl = oldUser.avatarUrl;
  if (avatarBlob) {
    avatarUrl = await uploadAvatar(newHandle, avatarBlob);
  }

  // 2. set new user
  batch.set(doc(db, 'users', newHandle), {
    ...oldUser,
    handle: newHandle,
    name: name,
    avatarUrl: avatarUrl || ''
  });
  
  if (likesData.likedVideos.length > 0 || likesData.likedComments.length > 0) {
    batch.set(doc(db, `users/${newHandle}/private/likes`), likesData);
  }

  // 3. update all videos by oldHandle
  const qVid = query(collection(db, 'videos'), where('handle', '==', oldHandle));
  const vids = await getDocs(qVid);
  vids.forEach(v => {
    batch.update(v.ref, { handle: newHandle });
  });

  // 4. update all comments by oldHandle
  const qCom = query(collection(db, 'comments'), where('userHandle', '==', oldHandle));
  const coms = await getDocs(qCom);
  coms.forEach(c => {
    batch.update(c.ref, { userHandle: newHandle });
  });

  // 5. update subscribers
  const qSubs = query(collection(db, 'users'), where('subscriptions', 'array-contains', oldHandle));
  const subs = await getDocs(qSubs);
  subs.forEach(s => {
    const subData = s.data();
    const newSubs = subData.subscriptions.filter((h: string) => h !== oldHandle).concat(newHandle);
    batch.update(s.ref, { subscriptions: newSubs });
  });

  // 6. delete old user
  try {
    batch.delete(doc(db, `users/${oldHandle}/private/likes`));
  } catch(e) {}
  batch.delete(doc(db, 'users', oldHandle));

  await batch.commit();
  return true;
}

export async function uploadAvatar(handle: string, file: Blob): Promise<string> {
  try {
    const tRef = ref(storage, `users/${handle}/avatar`);
    await uploadBytes(tRef, file);
    return await getDownloadURL(tRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${handle}/avatar`, auth);
    return '';
  }
}

export async function checkUnique(handle: string, name: string): Promise<{ isUnique: boolean, error?: string }> {
  try {
    const u = await getUser(handle);
    if (u) return { isUnique: false, error: 'Этот псевдоним уже занят' };
    
    // Note: checking by name is hard without a specific query, let's just allow it for now
    // A more thorough solution would use a query against 'users' collection where 'name' == name
    const q = query(collection(db, 'users'), where('name', '==', name));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { isUnique: false, error: 'Это имя канала уже занято' };
    }

    return { isUnique: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users`, auth);
    return { isUnique: false, error: 'Error checking uniqueness' };
  }
}

export async function createUser(user: User): Promise<void> {
  const { likedVideos, likedComments, ...publicUser } = user;
  try {
    await setDoc(doc(db, 'users', user.handle), publicUser);
    
    // Also init private subcollection if there are likes
    if (likedVideos || likedComments) {
      await setDoc(doc(db, `users/${user.handle}/private/likes`), {
        likedVideos: likedVideos || [],
        likedComments: likedComments || []
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${user.handle}`, auth);
  }
}

export interface UploadProgressEvent {
  progress: number;
  timeRemaining: number;
}

export async function addVideo(video: Video, onProgress?: (event: UploadProgressEvent) => void): Promise<string> {
  let videoUrl = video.videoUrl;
  let thumbnailUrl = video.thumbnailUrl;
  const videoId = Math.random().toString(36).substring(2, 11);

  try {
    if (video.videoBlob) {
      const vRef = ref(storage, `videos/${videoId}/video`);
      const metadata = {
        contentType: video.videoBlob.type || 'video/mp4'
      };
      
      const uploadTask = uploadBytesResumable(vRef, video.videoBlob, metadata);
      
      const startTime = Date.now();
      
      const uploadPromise = new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const currentProgress = (snapshot.totalBytes > 0) ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
            const elapsed = Math.max(1, (Date.now() - startTime) / 1000);
            const speed = snapshot.bytesTransferred / elapsed;
            const remainingBytes = snapshot.totalBytes - snapshot.bytesTransferred;
            const timeRemaining = speed > 0 ? remainingBytes / speed : Infinity;
            
            if (onProgress) {
              onProgress({ progress: currentProgress, timeRemaining });
            }
          },
          (error) => {
            console.error('Firebase storage uploadTask error:', error);
            reject(error);
          },
          () => resolve()
        );
      });
      
      await uploadPromise;
      
      videoUrl = await getDownloadURL(vRef);
    }
    if (video.thumbnailBlob) {
      const tRef = ref(storage, `videos/${videoId}/thumbnail`);
      await uploadBytes(tRef, video.thumbnailBlob);
      thumbnailUrl = await getDownloadURL(tRef);
    }

    const videoData: any = {
      id: videoId,
      handle: video.handle,
      title: video.title,
      description: video.description,
      type: video.type,
      createdAt: video.createdAt,
      views: video.views,
      likes: video.likes || 0,
    };
    if (videoUrl) videoData.videoUrl = videoUrl;
    if (thumbnailUrl) videoData.thumbnailUrl = thumbnailUrl;

    await setDoc(doc(db, 'videos', videoId), videoData);
    return videoId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `videos/${videoId}`, auth);
    throw error;
  }
}

export async function getAllVideos(): Promise<Video[]> {
  try {
    const q = query(collection(db, 'videos'), where('type', '==', 'video'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Video);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `videos`, auth);
    return [];
  }
}

export async function getAllShorts(): Promise<Video[]> {
  try {
    const q = query(collection(db, 'videos'), where('type', '==', 'short'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Video);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `videos`, auth);
    return [];
  }
}

export async function getVideosByHandle(handle: string): Promise<Video[]> {
  try {
    const q = query(collection(db, 'videos'), where('handle', '==', handle), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Video);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `videos`, auth);
    return [];
  }
}

export async function getVideo(id: string | number): Promise<Video | undefined> {
  try {
    const docRef = doc(db, 'videos', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return undefined;
    return snap.data() as Video;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `videos/${id}`, auth);
    return undefined;
  }
}

export async function deleteVideo(id: string | number): Promise<void> {
  const strId = String(id);
  try {
    await deleteDoc(doc(db, 'videos', strId));
    // Optional: Delete from storage
    try {
      await deleteObject(ref(storage, `videos/${strId}/video`));
      await deleteObject(ref(storage, `videos/${strId}/thumbnail`));
    } catch(e) { /* ignore storage errors */ }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `videos/${id}`, auth);
  }
}

export async function toggleLike(videoId: string | number, userHandle: string): Promise<boolean> {
  const strId = String(videoId);
  try {
    const likesRef = doc(db, `users/${userHandle}/private/likes`);
    const videoRef = doc(db, 'videos', strId);
    
    // Check if likes doc exists
    let likesDoc = await getDoc(likesRef);
    let likedVideos: string[] = [];
    if (likesDoc.exists()) {
      likedVideos = likesDoc.data().likedVideos || [];
    }
    
    const likedIndex = likedVideos.indexOf(strId);
    let isLiked = false;
    
    if (likedIndex > -1) {
      likedVideos.splice(likedIndex, 1);
      await updateDoc(videoRef, { likes: increment(-1) });
    } else {
      likedVideos.push(strId);
      await updateDoc(videoRef, { likes: increment(1) });
      isLiked = true;
    }
    
    await setDoc(likesRef, { likedVideos }, { merge: true });
    return isLiked;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `videos/${strId}`, auth);
    return false;
  }
}

export async function toggleSubscribe(subscriberHandle: string, channelHandle: string): Promise<boolean> {
  try {
    const subRef = doc(db, 'users', subscriberHandle);
    const channelRef = doc(db, 'users', channelHandle);
    
    const subDoc = await getDoc(subRef);
    if (!subDoc.exists()) return false;
    
    let subs = subDoc.data().subscriptions || [];
    const subIndex = subs.indexOf(channelHandle);
    let isSubscribed = false;
    
    if (subIndex > -1) {
      subs.splice(subIndex, 1);
      await updateDoc(channelRef, { subscriberCount: increment(-1) });
    } else {
      subs.push(channelHandle);
      await updateDoc(channelRef, { subscriberCount: increment(1) });
      isSubscribed = true;
    }
    
    await updateDoc(subRef, { subscriptions: subs });
    return isSubscribed;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${subscriberHandle}`, auth);
    return false;
  }
}

export async function incrementViews(id: string | number): Promise<void> {
  try {
    await updateDoc(doc(db, 'videos', String(id)), { views: increment(1) });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `videos/${id}`, auth);
  }
}

export async function searchVideos(queryText: string): Promise<Video[]> {
  try {
    // Basic client-side filtering since Firestore doesnt support full text search natively easily without an extension
    const snap = await getDocs(collection(db, 'videos'));
    const videos = snap.docs.map(d => d.data() as Video);
    const lowerQuery = queryText.toLowerCase();
    return videos.filter(v => v.title.toLowerCase().includes(lowerQuery) || (v.description && v.description.toLowerCase().includes(lowerQuery)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `videos`, auth);
    return [];
  }
}

export async function searchUsers(queryText: string): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = snap.docs.map(d => d.data() as User);
    const lowerQuery = queryText.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(lowerQuery) || u.handle.toLowerCase().includes(lowerQuery));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users`, auth);
    return [];
  }
}

export async function addComment(comment: Comment): Promise<string> {
  const commentId = Math.random().toString(36).substring(2, 11);
  try {
    const data = { ...comment, id: commentId, likes: comment.likes || 0 };
    await setDoc(doc(db, 'comments', commentId), data);
    return commentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `comments/${commentId}`, auth);
    return commentId;
  }
}

export async function getCommentsByVideoId(videoId: string | number): Promise<Comment[]> {
  try {
    const q = query(collection(db, 'comments'), where('videoId', '==', String(videoId)), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Comment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `comments`, auth);
    return [];
  }
}

export async function toggleCommentLike(commentId: string, userHandle: string): Promise<boolean> {
  const strId = String(commentId);
  try {
    const likesRef = doc(db, `users/${userHandle}/private/likes`);
    const commentRef = doc(db, 'comments', strId);
    
    let likesDoc = await getDoc(likesRef);
    let likedComments: string[] = [];
    if (likesDoc.exists()) {
      likedComments = likesDoc.data().likedComments || [];
    }
    
    const likedIndex = likedComments.indexOf(strId);
    let isLiked = false;
    
    if (likedIndex > -1) {
      likedComments.splice(likedIndex, 1);
      await updateDoc(commentRef, { likes: increment(-1) });
    } else {
      likedComments.push(strId);
      await updateDoc(commentRef, { likes: increment(1) });
      isLiked = true;
    }
    
    await setDoc(likesRef, { likedComments }, { merge: true });
    return isLiked;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `comments/${strId}`, auth);
    return false;
  }
}
