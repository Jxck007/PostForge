import { ArrowRight, FolderGit2, Lightbulb, Newspaper, PenLine, Sparkles, Image, CheckCircle2 } from 'lucide-react'

type DashboardDraft = {
  id: string
  title: string
  cardSubtitle: string
  updatedAt: string
  status: 'draft' | 'posted' | 'archived'
}

type DashboardTopic = {
  id: string
  title: string
  source: string
}

type DashboardViewProps = {
  drafts: DashboardDraft[]
  topics: DashboardTopic[]
  onDiscover: () => void
  onStartIdea: () => void
  onStartProject: () => void
  onOpenDraft: (draftId: string) => void
}

const workflow = [
  { label: 'Choose source', icon: Newspaper },
  { label: 'Generate draft', icon: Sparkles },
  { label: 'Design visual', icon: Image },
  { label: 'Review and publish', icon: CheckCircle2 },
]

function shortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ActionLabel({ children }: { children: string }) {
  return <span className="launcher-action">{children}<ArrowRight size={16} /></span>
}

export function DashboardView({ drafts, topics, onDiscover, onStartIdea, onStartProject, onOpenDraft }: DashboardViewProps) {
  const unfinishedDrafts = drafts.filter((draft) => draft.status === 'draft')
  const continueDraft = unfinishedDrafts[0]
  const recentDrafts = drafts.slice(0, 3)
  const suggestedTopics = topics.slice(0, 3)
  const isFirstVisit = drafts.length === 0

  return <div className="dashboard-page">
    <header className="dashboard-intro">
      <div><h2>Create a relevant LinkedIn post</h2><p>Create from a fresh topic, your own idea, or a project update.</p></div>
      <div className="dashboard-intro-actions"><button type="button" className="primary-button" onClick={onStartIdea}>Create a post</button><button type="button" className="secondary-button" onClick={onDiscover}>Discover topics</button></div>
    </header>

    <section className="creation-launcher" aria-labelledby="creation-heading">
      <div className="dashboard-section-heading"><h2 id="creation-heading">What do you want to create?</h2><p>Choose a starting point. You can edit everything before publishing.</p></div>
      <div className="launcher-grid">
        <button type="button" className="launcher-choice topic-choice" onClick={onDiscover}><span className="launcher-icon"><Newspaper size={23} /></span><span className="launcher-copy"><strong>Find a fresh topic</strong><small>Fetch relevant news and articles from RSS.</small><ActionLabel>Discover topics</ActionLabel></span></button>
        <button type="button" className="launcher-choice idea-choice" onClick={onStartIdea}><span className="launcher-icon"><Lightbulb size={23} /></span><span className="launcher-copy"><strong>Write from an idea</strong><small>Start from a thought, lesson, or opinion.</small><ActionLabel>Start writing</ActionLabel></span></button>
        <button type="button" className="launcher-choice project-choice" onClick={onStartProject}><span className="launcher-icon"><FolderGit2 size={23} /></span><span className="launcher-copy"><strong>Share a project update</strong><small>Explain what you built, changed, learned, or fixed.</small><ActionLabel>Create project post</ActionLabel></span></button>
      </div>
    </section>

    <section className="workflow-guide" aria-label="Post creation workflow">
      <div className="workflow-progress" />
      {workflow.map((step, index) => { const Icon = step.icon; return <div className="workflow-step" key={step.label}><span>{index + 1}</span><Icon size={18} /><strong>{step.label}</strong>{index < workflow.length - 1 && <ArrowRight size={16} className="workflow-arrow" />}</div> })}
    </section>

    {isFirstVisit ? <section className="guided-empty"><PenLine size={24} /><div><h2>Your first post starts with a source</h2><p>Pick a topic, idea, or project update above. PostForge will help you draft, design, review, and export it.</p></div><button type="button" className="secondary-button" onClick={onDiscover}>Find a topic</button></section> : <section className="dashboard-followup">
      <div className="continue-column"><div className="dashboard-section-heading"><h2>Continue working</h2></div>{continueDraft ? <button type="button" className="continue-draft" onClick={() => onOpenDraft(continueDraft.id)}><span><small>Unfinished draft · {shortDate(continueDraft.updatedAt)}</small><strong>{continueDraft.title}</strong><p>{continueDraft.cardSubtitle}</p></span><ArrowRight size={20} /></button> : <p className="inline-empty">No unfinished drafts.</p>}</div>
      <div><div className="dashboard-section-heading"><h2>Recent drafts</h2></div><div className="compact-list">{recentDrafts.map((draft) => <button type="button" key={draft.id} onClick={() => onOpenDraft(draft.id)}><span><strong>{draft.title}</strong><small>{draft.status} · {shortDate(draft.updatedAt)}</small></span><ArrowRight size={16} /></button>)}</div></div>
      <div><div className="dashboard-section-heading"><h2>Topics for you</h2></div><div className="compact-list">{suggestedTopics.map((topic) => <button type="button" key={topic.id} onClick={onDiscover}><span><strong>{topic.title}</strong><small>{topic.source}</small></span><ArrowRight size={16} /></button>)}</div></div>
    </section>}
  </div>
}
