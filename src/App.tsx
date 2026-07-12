import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Compass,
  Copy,
  Download,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  PenSquare,
  RefreshCw,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { AppShell, type AppRoute, type NavigationItem } from './components/AppShell'
import { DashboardView } from './components/DashboardView'
import { DiscoverView, LibraryView, SettingsView, StudioView } from './components/views'
import { db, isFirebaseConfigured } from './lib/firebase'
import {
  importUserDrafts,
  loadUserDrafts,
  saveProfileSettings,
  saveUserDraft,
  type FirestoreDraft,
} from './lib/firestoreDrafts'
import { useAuth } from './hooks/useAuth'

type Topic = {
  id: string
  title: string
  summary: string
  source: string
  url: string
  matchedKeywords: string[]
  score: number
  publishedAt: string
  interest?: string
  format?: string
}

type GeneratedPost = {
  title: string
  caption: string
  hashtags: string[]
  cardTitle: string
  cardSubtitle: string
  topicId: string
  topicTitle: string
  sourceCredit: string
  sourceUrl: string
  sourceName: string
  postType: string
  tone: string
}

type Draft = GeneratedPost & {
  id: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'posted' | 'archived'
}

type GenerateResponse = {
  postType: string
  caption: string
  hashtags: string[]
  imageTitle: string
  imageSubtitle: string
  sourceCredit: string
}

const INTERESTS_KEY = 'postforge.interests'
const DRAFTS_KEY = 'postforge.drafts'
const LINKEDIN_URL = 'https://www.linkedin.com/feed/'

const defaultInterests = ['AI', 'Python', 'Linux', 'Cloud', 'React', 'Hackathons']

const baseTopics: Topic[] = [
  {
    id: 'agent-workflows',
    title: 'What shipping an AI workflow taught me about real product constraints',
    summary: 'Share practical lessons from building with AI under strict guardrails.',
    source: 'PostForge starter topic',
    url: '',
    matchedKeywords: ['AI'],
    score: 10,
    publishedAt: '',
    interest: 'AI',
    format: 'Story post',
  },
  {
    id: 'linux-focus',
    title: '3 Linux habits that made my student projects more reliable',
    summary: 'Turn daily command-line routines into a concise learning post.',
    source: 'PostForge starter topic',
    url: '',
    matchedKeywords: ['Linux'],
    score: 10,
    publishedAt: '',
    interest: 'Linux',
    format: 'List post',
  },
  {
    id: 'react-preview',
    title: 'Why preview-driven UI building saves time in frontend projects',
    summary: 'Connect component previews to shipping confidence and iteration speed.',
    source: 'PostForge starter topic',
    url: '',
    matchedKeywords: ['React'],
    score: 10,
    publishedAt: '',
    interest: 'React',
    format: 'Insight post',
  },
  {
    id: 'hackathon-retro',
    title: 'A hackathon retrospective: what I would keep and what I would cut',
    summary: 'Frame a candid post around tradeoffs, speed, and learning.',
    source: 'PostForge starter topic',
    url: '',
    matchedKeywords: ['Hackathons'],
    score: 10,
    publishedAt: '',
    interest: 'Hackathons',
    format: 'Retrospective',
  },
]

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function buildStarterPost(topic: Topic): GeneratedPost {
  const interest = topic.matchedKeywords[0] || topic.interest || 'Technology'
  return {
    title: topic.title,
    topicId: topic.id,
    topicTitle: topic.title,
    caption: `I have been thinking about ${topic.title.toLowerCase()}.\n\n${topic.summary}\n\nThe takeaway I want to keep testing: useful work becomes easier to share when the lesson is specific, honest, and actionable.\n\nWhat is one lesson from your recent build that is worth sharing?`,
    hashtags: [`#${interest.replace(/\s+/g, '')}`, '#BuildInPublic', '#StudentDeveloper'],
    cardTitle: topic.title,
    cardSubtitle: `${interest} perspective for student builders`,
    sourceCredit: topic.url ? `Source: ${topic.source}` : '',
    sourceUrl: topic.url,
    sourceName: topic.source,
    postType: topic.format || 'Insight',
    tone: 'Conversational',
  }
}

async function apiRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'The request could not be completed.')
  }
  return payload
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatPublishedDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function exportDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toFirestoreDraft(draft: Draft): FirestoreDraft {
  const fallbackTimestamp = draft.updatedAt || new Date().toISOString()
  return {
    id: draft.id,
    caption: draft.caption || '',
    hashtags: Array.isArray(draft.hashtags) ? draft.hashtags.filter((tag): tag is string => typeof tag === 'string') : [],
    imageTitle: draft.cardTitle || '',
    imageSubtitle: draft.cardSubtitle || '',
    sourceTitle: draft.topicTitle || draft.title || '',
    sourceUrl: draft.sourceUrl || '',
    sourceName: draft.sourceName || '',
    postType: draft.postType || 'Insight',
    tone: draft.tone || 'Conversational',
    status: draft.status || 'draft',
    createdAt: draft.createdAt || fallbackTimestamp,
    updatedAt: fallbackTimestamp,
  }
}

function fromFirestoreDraft(draft: FirestoreDraft): Draft {
  return {
    id: draft.id,
    title: draft.sourceTitle,
    topicId: draft.id,
    topicTitle: draft.sourceTitle,
    caption: draft.caption,
    hashtags: draft.hashtags,
    cardTitle: draft.imageTitle,
    cardSubtitle: draft.imageSubtitle,
    sourceCredit: draft.sourceName ? `Source: ${draft.sourceName}` : '',
    sourceUrl: draft.sourceUrl,
    sourceName: draft.sourceName,
    postType: draft.postType,
    tone: draft.tone,
    status: draft.status,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  }
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [interests, setInterests] = useState<string[]>(() => readLocalStorage(INTERESTS_KEY, defaultInterests))
  const [drafts, setDrafts] = useState<Draft[]>(() => readLocalStorage(DRAFTS_KEY, []))
  const [interestInput, setInterestInput] = useState('')
  const [rssTopics, setRssTopics] = useState<Topic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState(baseTopics[0].id)
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ready for a reviewed, manual posting workflow.')
  const [isFetchingTopics, setIsFetchingTopics] = useState(false)
  const [topicError, setTopicError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { user, isLoading: isAuthLoading, error: authError, signInWithGoogle, signOutUser: signOutFromGoogle } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isDraftSyncLoading, setIsDraftSyncLoading] = useState(false)
  const [draftSyncError, setDraftSyncError] = useState('')
  const [isImportingDrafts, setIsImportingDrafts] = useState(false)
  const imageCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const firestore = db
    if (!user || !firestore) {
      setDrafts(readLocalStorage(DRAFTS_KEY, [] as Draft[]))
      setIsDraftSyncLoading(false)
      return
    }

    let isCurrent = true
    setIsDraftSyncLoading(true)
    setDraftSyncError('')
    void Promise.all([
      loadUserDrafts(firestore, user.uid),
      saveProfileSettings(firestore, user.uid, {
        displayName: user.displayName || '',
        email: user.email || '',
        updatedAt: new Date().toISOString(),
      }),
    ])
      .then(([cloudDrafts]) => {
        if (!isCurrent) return
        setDrafts(cloudDrafts.map(fromFirestoreDraft))
        setStatusMessage(`Cloud workspace ready for ${user.displayName || 'your account'}.`)
      })
      .catch(() => {
        if (!isCurrent) return
        setDraftSyncError('Could not load your Firestore drafts. Guest drafts remain on this device.')
        setStatusMessage('Could not load your Firestore drafts.')
      })
      .finally(() => {
        if (isCurrent) setIsDraftSyncLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [user])

  useEffect(() => {
    window.localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests))
  }, [interests])

  useEffect(() => {
    if (!user) window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
  }, [drafts, user])

  const starterTopics = useMemo(() => {
    const lowered = interests.map((interest) => interest.toLowerCase())
    const matching = baseTopics.filter((topic) =>
      topic.matchedKeywords.some((keyword) => lowered.includes(keyword.toLowerCase())),
    )
    return matching.length > 0 ? matching : baseTopics
  }, [interests])

  const topicPool = rssTopics.length > 0 ? rssTopics : starterTopics
  const selectedTopic = topicPool.find((topic) => topic.id === selectedTopicId) ?? topicPool[0]

  useEffect(() => {
    if (selectedTopic && selectedTopic.id !== selectedTopicId) {
      setSelectedTopicId(selectedTopic.id)
    }
  }, [selectedTopic, selectedTopicId])

  function addInterest() {
    const cleaned = interestInput.trim()
    if (!cleaned) return
    if (interests.some((interest) => interest.toLowerCase() === cleaned.toLowerCase())) {
      setStatusMessage(`Interest "${cleaned}" already exists.`)
      return
    }
    setInterests((current) => [...current, cleaned])
    setInterestInput('')
    setStatusMessage(`Added interest "${cleaned}".`)
  }

  async function signIn() {
    setIsSigningIn(true)
    try {
      const didSignIn = await signInWithGoogle()
      if (didSignIn) setStatusMessage('Signed in. Loading your Firestore workspace.')
    } finally {
      setIsSigningIn(false)
    }
  }

  async function signOutUser() {
    const didSignOut = await signOutFromGoogle()
    if (didSignOut) {
      setStatusMessage('Signed out. New changes will stay in this browser until you sign in again.')
    }
  }

  async function fetchTopics() {
    setIsFetchingTopics(true)
    setTopicError('')
    try {
      const result = await apiRequest<{ topics: Topic[] }>('/api/fetch-topics', { interests, limit: 10 })
      setRssTopics(result.topics)
      if (result.topics[0]) setSelectedTopicId(result.topics[0].id)
      setStatusMessage(result.topics.length ? `Found ${result.topics.length} RSS topics matched to your interests.` : 'No RSS topics matched yet. Starter topics remain available.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not fetch topics.'
      setTopicError(message)
      setStatusMessage(message)
    } finally {
      setIsFetchingTopics(false)
    }
  }

  function createStarterDraft() {
    if (!selectedTopic) return
    setGeneratedPost(buildStarterPost(selectedTopic))
    navigate('/create')
    setStatusMessage('Created an editable starter draft. Use Gemini when the server is configured.')
  }

  async function generateWithGemini() {
    if (!selectedTopic) return
    setIsGenerating(true)
    try {
      const result = await apiRequest<GenerateResponse>('/api/generate-post', {
        title: selectedTopic.title,
        summary: selectedTopic.summary,
        source: selectedTopic.source,
        sourceUrl: selectedTopic.url,
        interests,
      })
      setGeneratedPost({
        title: selectedTopic.title,
        topicId: selectedTopic.id,
        topicTitle: selectedTopic.title,
        caption: result.caption,
        hashtags: result.hashtags,
        cardTitle: result.imageTitle,
        cardSubtitle: result.imageSubtitle,
        sourceCredit: result.sourceCredit,
        sourceUrl: selectedTopic.url,
        sourceName: selectedTopic.source,
        postType: result.postType,
        tone: 'Conversational',
      })
      navigate('/create')
      setStatusMessage('Generated a draft with Gemini. Review every line before posting.')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not generate a draft.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function copyCaption() {
    if (!generatedPost) return
    try {
      await navigator.clipboard.writeText(`${generatedPost.caption}\n\n${generatedPost.hashtags.join(' ')}`)
      setStatusMessage('Caption copied to clipboard.')
    } catch {
      setStatusMessage('Clipboard access failed. Copy manually from the editor.')
    }
  }

  async function downloadImage() {
    if (!imageCardRef.current || !generatedPost) return
    setIsExporting(true)
    try {
      const dataUrl = await toPng(imageCardRef.current, {
        cacheBust: true,
        canvasWidth: 1200,
        canvasHeight: 630,
        pixelRatio: 1,
      })
      const link = document.createElement('a')
      link.download = `postforge-card-${exportDate()}.png`
      link.href = dataUrl
      link.click()
      setStatusMessage('Downloaded a 1200 × 630 PNG card.')
    } catch {
      setStatusMessage('Could not export the image card. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  async function saveDraft() {
    if (!generatedPost) return
    const timestamp = new Date().toISOString()
    const nextDraft: Draft = {
      ...generatedPost,
      id: `${generatedPost.topicId}-${Date.now()}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'draft',
    }

    if (user && db) {
      setIsDraftSyncLoading(true)
      try {
        await saveUserDraft(db, user.uid, toFirestoreDraft(nextDraft))
        setDrafts((current) => [nextDraft, ...current.filter((draft) => draft.id !== nextDraft.id)])
        setStatusMessage(`Saved draft "${nextDraft.title}" to Firestore.`)
      } catch {
        setDraftSyncError('Could not save this draft to Firestore. It has not been uploaded.')
        setStatusMessage('Could not save the draft to Firestore.')
      } finally {
        setIsDraftSyncLoading(false)
      }
    } else {
      setDrafts((current) => [nextDraft, ...current].slice(0, 12))
      setStatusMessage(`Saved draft "${nextDraft.title}" locally.`)
    }

    navigate('/drafts')
  }

  async function importLocalDrafts() {
    if (!user || !db) return
    const localDrafts = readLocalStorage(DRAFTS_KEY, [] as Draft[])
    if (localDrafts.length === 0) {
      setStatusMessage('There are no local drafts to import.')
      return
    }

    setIsImportingDrafts(true)
    setDraftSyncError('')
    try {
      await importUserDrafts(db, user.uid, localDrafts.map(toFirestoreDraft))
      const cloudDrafts = await loadUserDrafts(db, user.uid)
      setDrafts(cloudDrafts.map(fromFirestoreDraft))
      setStatusMessage(`Imported ${localDrafts.length} local draft${localDrafts.length === 1 ? '' : 's'} to Firestore.`)
    } catch {
      setDraftSyncError('Could not import local drafts. Please try again.')
      setStatusMessage('Could not import local drafts.')
    } finally {
      setIsImportingDrafts(false)
    }
  }

  function openDraft(draft: Draft) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, status: _status, ...post } = draft
    void _id
    void _createdAt
    void _updatedAt
    void _status
    setGeneratedPost(post)
    navigate('/create')
    setStatusMessage(`Loaded draft "${draft.title}".`)
  }

  function openDraftById(draftId: string) {
    const draft = drafts.find((item) => item.id === draftId)
    if (draft) openDraft(draft)
  }

  function startCreation(mode: 'topic' | 'idea' | 'project') {
    if (mode === 'topic') {
      navigate('/discover?mode=topic')
      return
    }
    navigate(`/create?mode=${mode}`)
  }

  const navItems: NavigationItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
    { path: '/discover', label: 'Discover Topics', icon: Compass, mobile: true },
    { path: '/create', label: 'Create Post', icon: PenSquare, mobile: true },
    { path: '/drafts', label: 'Drafts', icon: Sparkles, mobile: true },
    { path: '/settings', label: 'Settings', icon: Settings, secondary: true },
  ]

  const route = (location.pathname as AppRoute)
  const creationMode = new URLSearchParams(location.search).get('mode')
  const createPageTitle = creationMode === 'project' ? 'Create Project Post' : creationMode === 'idea' ? 'Write From an Idea' : 'Create Post'
  const topbar = {
    '/dashboard': { title: 'Dashboard', breadcrumb: 'Workspace overview', actionLabel: 'Create Post', onAction: () => startCreation('idea'), disabled: false },
    '/discover': { title: 'Discover Topics', breadcrumb: 'Step 1 of 2 · Choose a topic', actionLabel: 'Create Post', onAction: createStarterDraft, disabled: !selectedTopic },
    '/create': { title: createPageTitle, breadcrumb: 'Step 2 of 2 · Write and review', actionLabel: generatedPost ? 'Regenerate' : 'Generate Post', onAction: generateWithGemini, disabled: isGenerating },
    '/drafts': { title: 'Drafts', breadcrumb: 'Saved writing', actionLabel: user ? 'Import Local Drafts' : 'Discover Topics', onAction: user ? importLocalDrafts : () => navigate('/discover'), disabled: Boolean(user && (isImportingDrafts || isDraftSyncLoading)) },
    '/settings': { title: 'Settings', breadcrumb: 'Account and workspace', actionLabel: user ? 'Sign Out' : 'Sign In', onAction: user ? signOutUser : signIn, disabled: isSigningIn || isAuthLoading },
  }[route] ?? { title: 'Dashboard', breadcrumb: 'Workspace overview', actionLabel: 'Create Post', onAction: createStarterDraft, disabled: false }

  const account = user ? <button type="button" className="account-control" onClick={signOutUser}>{user.displayName || user.email || 'Sign out'}</button> : <button type="button" className="account-control" onClick={signIn} disabled={isSigningIn || isAuthLoading}>{isSigningIn ? 'Signing in' : isAuthLoading ? 'Checking account' : isFirebaseConfigured ? 'Sign in' : 'Guest mode'}</button>

  return <AppShell navigation={navItems} isSidebarExpanded={isSidebarExpanded} onSidebarToggle={() => setIsSidebarExpanded((current) => !current)} title={topbar.title} breadcrumb={topbar.breadcrumb} actionLabel={topbar.actionLabel} onAction={topbar.onAction} actionDisabled={topbar.disabled} isCloudWorkspace={Boolean(user)} statusMessage={statusMessage} account={account}>
    {authError && <div className="sync-error" role="alert">{authError}</div>}
    <Routes>
      <Route path="/dashboard" element={<DashboardView drafts={drafts} topics={topicPool} onDiscover={() => startCreation('topic')} onStartIdea={() => startCreation('idea')} onStartProject={() => startCreation('project')} onOpenDraft={openDraftById} />} />
      <Route path="/discover" element={<DiscoverView><section className="discover-layout"><article className="workspace-section"><div className="section-heading"><div><p>Topic preferences</p><h2>Your interests</h2></div></div><div className="interest-form"><input value={interestInput} onChange={(event) => setInterestInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addInterest() }} placeholder="Add an interest, like Local LLMs" aria-label="Add interest" /><button type="button" className="primary-button" onClick={addInterest}>Add</button></div><div className="chip-list">{interests.map((interest) => <button key={interest} type="button" className="chip" onClick={() => setInterests((current) => current.filter((item) => item !== interest))}>{interest}<span aria-hidden="true">×</span></button>)}</div></article><article className="workspace-section topic-workspace"><div className="section-heading"><div><p>Available sources</p><h2>Topics for your next post</h2></div><button type="button" className="secondary-button" onClick={fetchTopics} disabled={isFetchingTopics}>{isFetchingTopics ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{isFetchingTopics ? 'Fetching' : 'Refresh'}</button></div>{topicError && <div className="topic-error" role="alert">{topicError} Starter topics are still available.</div>}<div className="topic-list">{topicPool.map((topic) => <button key={topic.id} type="button" className={topic.id === selectedTopicId ? 'topic-card selected' : 'topic-card'} onClick={() => setSelectedTopicId(topic.id)}><div className="topic-meta"><span>{topic.source}</span><span>{topic.matchedKeywords.join(', ') || topic.format}</span></div><strong>{topic.title}</strong><p>{topic.summary}</p>{topic.url && <span className="topic-source">{formatPublishedDate(topic.publishedAt)} · Source preserved</span>}</button>)}</div></article></section></DiscoverView>} />
      <Route path="/create" element={<StudioView><section className="studio-layout"><article className="editor-pane"><div className="section-heading"><div><p>Post editor</p><h2>{generatedPost ? 'Edit your post' : 'Generate or start a draft'}</h2></div></div>{generatedPost ? <div className="editor-stack"><label><span>Caption</span><textarea rows={10} value={generatedPost.caption} onChange={(event) => setGeneratedPost((current) => current ? { ...current, caption: event.target.value } : current)} /></label><label><span>Hashtags</span><input value={generatedPost.hashtags.join(' ')} onChange={(event) => setGeneratedPost((current) => current ? { ...current, hashtags: event.target.value.split(' ').map((tag) => tag.trim()).filter(Boolean) } : current)} /></label><label><span>Card title</span><input value={generatedPost.cardTitle} onChange={(event) => setGeneratedPost((current) => current ? { ...current, cardTitle: event.target.value } : current)} /></label><label><span>Card subtitle</span><input value={generatedPost.cardSubtitle} onChange={(event) => setGeneratedPost((current) => current ? { ...current, cardSubtitle: event.target.value } : current)} /></label>{generatedPost.sourceCredit && <p className="source-credit">{generatedPost.sourceCredit}</p>}<div className="button-row">{safeExternalUrl(generatedPost.sourceUrl) && <a className="secondary-button" href={safeExternalUrl(generatedPost.sourceUrl)} target="_blank" rel="noreferrer">View source<ExternalLink size={16} /></a>}<button type="button" className="primary-button" onClick={copyCaption}><Copy size={16} />Copy caption</button><button type="button" className="secondary-button" onClick={downloadImage} disabled={isExporting}>{isExporting ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}{isExporting ? 'Exporting' : 'Download image card'}</button><button type="button" className="secondary-button" onClick={saveDraft} disabled={Boolean(user && isDraftSyncLoading)}>Save draft</button><a className="secondary-button" href={LINKEDIN_URL} target="_blank" rel="noreferrer">Open LinkedIn<ExternalLink size={16} /></a></div></div> : <div className="empty-state"><p>Select a topic in Discover, then generate with Gemini or create a local starter draft.</p><div className="button-row empty-actions"><button type="button" className="secondary-button" onClick={() => navigate('/discover')}>Discover topics</button><button type="button" className="primary-button" onClick={generateWithGemini} disabled={isGenerating}>{isGenerating ? 'Generating' : 'Generate with Gemini'}</button><button type="button" className="secondary-button" onClick={createStarterDraft}>Create starter draft</button></div></div>}</article><aside className="preview-pane"><div className="section-heading"><div><p>Live preview</p><h2>Post and image card</h2></div></div>{generatedPost ? <><div className="linkedin-preview"><div className="profile-row"><div className="avatar">J</div><div><strong>Jack</strong><p>Student developer · Building in public</p></div></div><p className="preview-caption">{generatedPost.caption}</p><div className="hashtag-row">{generatedPost.hashtags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div></div><div className="image-card-preview" ref={imageCardRef}><div className="image-card-overlay" /><p className="image-card-kicker">PostForge · Student builder</p><strong>{generatedPost.cardTitle}</strong><span>{generatedPost.cardSubtitle}</span></div></> : <div className="empty-state">Your post and downloadable image card will appear here.</div>}</aside></section></StudioView>} />
      <Route path="/drafts" element={<LibraryView><section className="library-header"><div><p>Saved content</p><h2>Your drafts</h2></div>{user && <button type="button" className="secondary-button" onClick={importLocalDrafts} disabled={isImportingDrafts || isDraftSyncLoading}>{isImportingDrafts ? 'Importing' : 'Import local drafts'}</button>}</section>{isDraftSyncLoading && <p className="sync-message">Syncing your Firestore drafts…</p>}{draftSyncError && <div className="sync-error" role="alert">{draftSyncError}</div>}<div className="draft-list library-list">{drafts.length === 0 ? <div className="empty-state">No drafts yet. Discover a topic, then create your first post.</div> : drafts.map((draft) => <button key={draft.id} type="button" className="draft-card" onClick={() => openDraft(draft)}><div><strong>{draft.title}</strong><p>{draft.cardSubtitle}</p></div><span>{formatDate(draft.updatedAt)}</span></button>)}</div></LibraryView>} />
      <Route path="/settings" element={<SettingsView><section className="settings-panel"><h2>Account and workspace</h2><p>{user ? `Signed in as ${user.email || user.displayName || 'your Google account'}. Drafts are saved to Firestore.` : 'You are using guest mode. Drafts are saved in this browser.'}</p><button type="button" className="primary-button" onClick={user ? signOutUser : signIn}>{user ? 'Sign out' : 'Sign in with Google'}</button></section></SettingsView>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </AppShell>
}

export default App
