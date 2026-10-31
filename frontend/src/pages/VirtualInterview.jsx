import { useEffect, useState } from 'react'
import InterviewRoom from '../components/interview-room/InterviewRoom'
import '../styles/virtual-interview.css'

const QUESTIONS = [
  'Tell me about yourself and what led you to this role.',
  'Describe a project you are proud of and the hardest problem you solved in it.',
  'How do you handle disagreement with a teammate on a technical decision?',
]

const STATUS_LABEL = { ready: 'Ready', live: 'Live', paused: 'Paused' }

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function VirtualInterview({ onExit }) {
  const [status, setStatus] = useState('ready') // ready | live | paused
  const [elapsed, setElapsed] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [motion, setMotion] = useState(
    () => !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  )

  useEffect(() => {
    if (status !== 'live') return undefined
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const handleExit = () => {
    window.speechSynthesis?.cancel()
    onExit ? onExit() : window.history.back()
  }

  return (
    <div className="ivq-page">
      <header className="ivq-header">
        <div className="ivq-brand">
          Interview<span>IQ</span>
        </div>
        <div className="ivq-header__right">
          <span className={`ivq-status ivq-status--${status}`}>
            <i /> {STATUS_LABEL[status]}
          </span>
          <span className="ivq-chip" title="Microphone (coming soon)">
            🎙 Mic off
          </span>
          <span className="ivq-chip ivq-chip--mono">{fmt(elapsed)}</span>
        </div>
      </header>

      <main className="ivq-stage">
        <InterviewRoom motionEnabled={motion} />

        <section className="ivq-question" aria-live="polite">
          <p className="ivq-question__label">
            Question {qIndex + 1} of {QUESTIONS.length}
          </p>
          <p className="ivq-question__text">{QUESTIONS[qIndex]}</p>
        </section>

        <div className="ivq-controls">
          {status === 'ready' && (
            <button className="ivq-btn ivq-btn--primary" onClick={() => setStatus('live')}>
              Start interview
            </button>
          )}
          {status === 'live' && (
            <button className="ivq-btn" onClick={() => setStatus('paused')}>
              Pause
            </button>
          )}
          {status === 'paused' && (
            <button className="ivq-btn ivq-btn--primary" onClick={() => setStatus('live')}>
              Resume
            </button>
          )}
          <button
            className="ivq-btn"
            onClick={() => setQIndex((i) => (i + 1) % QUESTIONS.length)}
            disabled={status === 'ready'}
          >
            Next question
          </button>
          <button className="ivq-btn" onClick={() => setMotion((m) => !m)} aria-pressed={motion}>
            Camera motion: {motion ? 'On' : 'Off'}
          </button>
          <button className="ivq-btn ivq-btn--ghost" onClick={handleExit}>
            Exit
          </button>
        </div>
      </main>
    </div>
  )
}