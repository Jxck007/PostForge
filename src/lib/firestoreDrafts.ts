import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

export type DraftStatus = 'draft' | 'posted' | 'archived'

export type FirestoreDraft = {
  id: string
  caption: string
  hashtags: string[]
  imageTitle: string
  imageSubtitle: string
  sourceTitle: string
  sourceUrl: string
  sourceName: string
  postType: string
  tone: string
  status: DraftStatus
  createdAt: string
  updatedAt: string
}

export type ProfileSettings = {
  displayName: string
  email: string
  updatedAt: string
}

const draftsCollection = (firestore: Firestore, uid: string) =>
  collection(firestore, 'users', uid, 'drafts')

export async function loadUserDrafts(firestore: Firestore, uid: string) {
  const snapshot = await getDocs(query(draftsCollection(firestore, uid), orderBy('updatedAt', 'desc')))
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as FirestoreDraft)
}

export async function saveUserDraft(firestore: Firestore, uid: string, draft: FirestoreDraft) {
  await setDoc(doc(firestore, 'users', uid, 'drafts', draft.id), draft)
}

export async function importUserDrafts(firestore: Firestore, uid: string, drafts: FirestoreDraft[]) {
  const batch = writeBatch(firestore)
  for (const draft of drafts) {
    batch.set(doc(firestore, 'users', uid, 'drafts', draft.id), draft)
  }
  await batch.commit()
}

export async function saveProfileSettings(firestore: Firestore, uid: string, profile: ProfileSettings) {
  await setDoc(doc(firestore, 'users', uid, 'settings', 'profile'), profile, { merge: true })
}
