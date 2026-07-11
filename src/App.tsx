import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  Compass,
  Copy,
  Download,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  PenSquare,
  RefreshCw,
  Sparkles,
  Tag,
} from 'lucide-react'
import './App.css'
import { auth, db, isFirebaseConfigured } from './lib/firebase'

type NavSection = 'dashboard' | 'interests' | 'topics' | 'create' | 'drafts'

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
}

type Draft = GeneratedPost & { id: string; updatedAt: string }

type GenerateResponse = {
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

function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard')
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
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(isFirebaseConfigured)
  const [isCloudDataReady, setIsCloudDataReady] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const imageCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const firebaseAuth = auth
    const firestore = db
    if (!firebaseAuth || !firestore) {
      return
    }

    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser)
      setIsAuthLoading(false)
      setIsCloudDataReady(false)

      if (!nextUser) {
        return
      }

      try {
        const profileRef = doc(firestore, 'users', nextUser.uid)
        const profile = await getDoc(profileRef)
        const data = profile.data()
        if (Array.isArray(data?.interests)) {
          setInterests(data.interests.filter((interest): interest is string => typeof interest === 'string'))
        }
        if (Array.isArray(data?.drafts)) {
          setDrafts(data.drafts.filter((draft): draft is Draft => Boolean(draft) && typeof draft === 'object' && typeof draft.id === 'string' && typeof draft.caption === 'string'))
        }
        setStatusMessage(`Cloud workspace ready for ${nextUser.displayName || 'your account'}.`)
      } catch {
        setStatusMessage('Could not load your cloud workspace. Local drafts are still available.')
      } finally {
        setIsCloudDataReady(true)
      }
    })
  }, [])

  useEffect(() => {
    if (user && db && isCloudDataReady) {
      void setDoc(
        doc(db, 'users', user.uid),
        { interests, drafts, updatedAt: serverTimestamp() },
        { merge: true },
      ).catch(() => setStatusMessage('Could not save to Firestore. Your current edits remain in this browser.'))
      return
    }

    if (!user) {
      window.localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests))
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
    }
  }, [drafts, interests, isCloudDataReady, user])

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

  const dashboardStats = [
    { label: 'Tracked interests', value: interests.length.toString().padStart(2, '0') },
    { label: 'Topics in view', value: topicPool.length.toString().padStart(2, '0') },
    { label: 'Saved drafts', value: drafts.length.toString().padStart(2, '0') },
  ]

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
    if (!auth) {
      setStatusMessage('Firebase is not configured. Add the VITE_FIREBASE values to enable sign-in.')
      return
    }

    setIsSigningIn(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch {
      setStatusMessage('Google sign-in could not be completed. Confirm the provider and domain are enabled in Firebase Auth.')
    } finally {
      setIsSigningIn(false)
    }
  }

  async function signOutUser() {
    if (!auth) return
    try {
      await signOut(auth)
      setStatusMessage('Signed out. New changes will stay in this browser until you sign in again.')
    } catch {
      setStatusMessage('Could not sign out. Please try again.')
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
    setActiveSection('create')
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
      })
      setActiveSection('create')
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

  function saveDraft() {
    if (!generatedPost) return
    const nextDraft: Draft = { ...generatedPost, id: `${generatedPost.topicId}-${Date.now()}`, updatedAt: new Date().toISOString() }
    setDrafts((current) => [nextDraft, ...current].slice(0, 12))
    setActiveSection('drafts')
    setStatusMessage(`Saved draft "${generatedPost.title}" locally.`)
  }

  function openDraft(draft: Draft) {
    const { id: _id, updatedAt: _updatedAt, ...post } = draft
    void _id
    void _updatedAt
    setGeneratedPost(post)
    setActiveSection('create')
    setStatusMessage(`Loaded draft "${draft.title}".`)
  }

  const navItems: Array<{ id: NavSection; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'interests', label: 'Interests', icon: Tag },
    { id: 'topics', label: 'Topic Finder', icon: Compass },
    { id: 'create', label: 'Create Post', icon: PenSquare },
    { id: 'drafts', label: 'Drafts', icon: Sparkles },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block"><div className="brand-mark">PF</div><div><p className="eyebrow">Personal V1</p><h1>PostForge</h1></div></div>
        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon
            return <button key={item.id} type="button" className={item.id === activeSection ? 'nav-item active' : 'nav-item'} onClick={() => setActiveSection(item.id)}><Icon size={18} /><span>{item.label}</span></button>
          })}
        </nav>
        <div className="sidebar-panel"><p className="panel-label">Manual workflow only</p><p className="panel-copy">Review the draft, copy the caption, download the card, then open LinkedIn yourself.</p></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div><p className="eyebrow">Student builder workflow</p><h2>Turn relevant topics into reviewed post drafts.</h2></div><div className="topbar-actions"><div className="status-pill" role="status">{statusMessage}</div>{user ? <div className="account-menu"><span className="account-name">{user.displayName || user.email || 'Signed in'}</span><button type="button" className="secondary-button compact-button" onClick={signOutUser}>Sign out</button></div> : <button type="button" className="secondary-button compact-button" onClick={signIn} disabled={isSigningIn || isAuthLoading}>{isSigningIn ? 'Signing in' : isAuthLoading ? 'Checking account' : isFirebaseConfigured ? 'Sign in with Google' : 'Cloud setup needed'}</button>}</div></header>
        <section className="dashboard-grid">
          <article className="hero-card"><p className="eyebrow">Dashboard</p><h3>Find a topic, shape the draft, then keep final control.</h3><p className="hero-copy">PostForge uses RSS discovery and Gemini only to prepare editable material. Nothing is posted or sent to LinkedIn automatically.</p><div className="stats-row">{dashboardStats.map((stat) => <div key={stat.label} className="stat-card"><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div></article>
          <article className="quick-panel"><p className="eyebrow">Workflow</p><ol className="workflow-list"><li>Choose interests and fetch relevant RSS topics.</li><li>Generate or start an editable LinkedIn draft.</li><li>Copy text, download the PNG, and post manually.</li></ol></article>
        </section>

        <section className="content-grid">
          <div className="column">
            <article className={activeSection === 'interests' ? 'panel focus' : 'panel'}><div className="panel-head"><div><p className="eyebrow">Interests manager</p><h3>{user ? 'Synced to your Firestore workspace' : 'Stored locally until you sign in'}</h3></div></div><div className="interest-form"><input value={interestInput} onChange={(event) => setInterestInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addInterest() }} placeholder="Add an interest, like Local LLMs" aria-label="Add interest" /><button type="button" className="primary-button" onClick={addInterest}>Add</button></div><div className="chip-list">{interests.map((interest) => <button key={interest} type="button" className="chip" onClick={() => setInterests((current) => current.filter((item) => item !== interest))}>{interest}<span aria-hidden="true">×</span></button>)}</div></article>

            <article className={activeSection === 'topics' ? 'panel focus' : 'panel'}><div className="panel-head"><div><p className="eyebrow">Topic finder</p><h3>Starter prompts or live RSS topics</h3></div><button type="button" className="secondary-button" onClick={fetchTopics} disabled={isFetchingTopics}>{isFetchingTopics ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{isFetchingTopics ? 'Fetching topics' : 'Fetch RSS topics'}</button></div>{topicError && <div className="topic-error" role="alert">{topicError} Starter topics are still available.</div>}<div className="topic-list">{topicPool.map((topic) => <button key={topic.id} type="button" className={topic.id === selectedTopicId ? 'topic-card selected' : 'topic-card'} onClick={() => setSelectedTopicId(topic.id)}><div className="topic-meta"><span>{topic.source}</span><span>{topic.matchedKeywords.join(', ') || topic.format}</span></div><strong>{topic.title}</strong><p>{topic.summary}</p>{topic.url && <span className="topic-source">{formatPublishedDate(topic.publishedAt)} · Source link preserved for the final draft.</span>}</button>)}</div></article>

            <article className={activeSection === 'drafts' ? 'panel focus' : 'panel'}><div className="panel-head"><div><p className="eyebrow">Drafts</p><h3>{user ? 'Saved to Firestore' : 'Saved in LocalStorage'}</h3></div></div><div className="draft-list">{drafts.length === 0 ? <div className="empty-state">No drafts yet. Save a generated post to see it here.</div> : drafts.map((draft) => <button key={draft.id} type="button" className="draft-card" onClick={() => openDraft(draft)}><div><strong>{draft.title}</strong><p>{draft.cardSubtitle}</p></div><span>{formatDate(draft.updatedAt)}</span></button>)}</div></article>
          </div>

          <div className="column">
            <article className={activeSection === 'create' ? 'panel focus' : 'panel'}><div className="panel-head"><div><p className="eyebrow">Post creator</p><h3>Generate, then edit every word</h3></div></div>{generatedPost ? <div className="editor-stack"><label><span>Caption</span><textarea rows={10} value={generatedPost.caption} onChange={(event) => setGeneratedPost((current) => current ? { ...current, caption: event.target.value } : current)} /></label><label><span>Hashtags</span><input value={generatedPost.hashtags.join(' ')} onChange={(event) => setGeneratedPost((current) => current ? { ...current, hashtags: event.target.value.split(' ').map((tag) => tag.trim()).filter(Boolean) } : current)} /></label><label><span>Card title</span><input value={generatedPost.cardTitle} onChange={(event) => setGeneratedPost((current) => current ? { ...current, cardTitle: event.target.value } : current)} /></label><label><span>Card subtitle</span><input value={generatedPost.cardSubtitle} onChange={(event) => setGeneratedPost((current) => current ? { ...current, cardSubtitle: event.target.value } : current)} /></label>{generatedPost.sourceCredit && <p className="source-credit">{generatedPost.sourceCredit}</p>}<div className="button-row">{safeExternalUrl(generatedPost.sourceUrl) && <a className="secondary-button" href={safeExternalUrl(generatedPost.sourceUrl)} target="_blank" rel="noreferrer">View source<ExternalLink size={16} /></a>}<button type="button" className="primary-button" onClick={copyCaption}><Copy size={16} />Copy caption</button><button type="button" className="secondary-button" onClick={downloadImage} disabled={isExporting}>{isExporting ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}{isExporting ? 'Exporting' : 'Download Image'}</button><button type="button" className="secondary-button" onClick={saveDraft}>Save draft</button><a className="secondary-button" href={LINKEDIN_URL} target="_blank" rel="noreferrer">Open LinkedIn<ExternalLink size={16} /></a></div></div> : <div className="empty-state"><p>Select a topic, then create a local starter draft or generate one with Gemini.</p><div className="button-row empty-actions"><button type="button" className="secondary-button" onClick={createStarterDraft}>Create starter draft</button><button type="button" className="primary-button" onClick={generateWithGemini} disabled={isGenerating}>{isGenerating ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{isGenerating ? 'Generating' : 'Generate with Gemini'}</button></div></div>}</article>

            {generatedPost && <article className="panel generation-actions"><div><p className="eyebrow">Current topic</p><h3>{generatedPost.topicTitle}</h3></div><div className="button-row"><button type="button" className="secondary-button" onClick={createStarterDraft}>Reset to starter</button><button type="button" className="primary-button" onClick={generateWithGemini} disabled={isGenerating}>{isGenerating ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{isGenerating ? 'Generating' : 'Regenerate with Gemini'}</button></div></article>}

            <div className="preview-grid"><article className="panel preview-panel"><div className="panel-head"><div><p className="eyebrow">LinkedIn-style preview</p><h3>Caption review</h3></div></div>{generatedPost ? <div className="linkedin-preview"><div className="profile-row"><div className="avatar">J</div><div><strong>Jack</strong><p>Student developer · Building in public</p></div></div><p className="preview-caption">{generatedPost.caption}</p><div className="hashtag-row">{generatedPost.hashtags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div></div> : <div className="empty-state">Preview appears here after generation.</div>}</article>
              <article className="panel preview-panel"><div className="panel-head"><div><p className="eyebrow">Image card preview</p><h3>Shareable visual</h3></div></div>{generatedPost ? <div className="image-card-preview" ref={imageCardRef}><div className="image-card-overlay" /><p className="image-card-kicker">PostForge · Student builder</p><strong>{generatedPost.cardTitle}</strong><span>{generatedPost.cardSubtitle}</span></div> : <div className="empty-state">Card preview appears here after generation.</div>}</article>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
