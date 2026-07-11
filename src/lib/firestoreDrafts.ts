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

function isFirestoreDraft(value: unknown): value is FirestoreDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Record<string, unknown>
  return (
    typeof draft.id === 'string' &&
    typeof draft.caption === 'string' &&
    Array.isArray(draft.hashtags) &&
    draft.hashtags.every((tag) => typeof tag === 'string') &&
    typeof draft.imageTitle === 'string' &&
    typeof draft.imageSubtitle === 'string' &&
    typeof draft.sourceTitle === 'string' &&
    typeof draft.sourceUrl === 'string' &&
    typeof draft.sourceName === 'string' &&
    typeof draft.postType === 'string' &&
    typeof draft.tone === 'string' &&
    (draft.status === 'draft' || draft.status === 'posted' || draft.status === 'archived') &&
    typeof draft.createdAt === 'string' &&
    typeof draft.updatedAt === 'string'
  )
}

export async function loadUserDrafts(firestore: Firestore, uid: string) {
  const snapshot = await getDocs(query(draftsCollection(firestore, uid), orderBy('updatedAt', 'desc')))
  return snapshot.docs
    .map((entry) => ({ ...entry.data(), id: entry.id }))
    .filter(isFirestoreDraft)
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
