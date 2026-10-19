import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Editor from '@monaco-editor/react';
import {
  startCodingRound,
  runCodingCode,
  submitCodingQuestion,
  finishCodingRound,
} from '../../api/codingApi';
import CodingRoundIntro from './CodingRoundIntro';
import ReactMarkdown from 'react-markdown';
import './CodingRoundPage.css';

// ONLY Supported Languages
const SUPPORTED_LANGUAGES = [
  { key: 'python', label: 'Python (3.8)', monacoLang: 'python' },
  { key: 'java', label: 'Java (OpenJDK 13)', monacoLang: 'java' },
  { key: 'cpp', label: 'C++ (GCC 9.2)', monacoLang: 'cpp' },
];

export default function CodingRoundPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // Lifecycle & Session State
  const [phase, setPhase] = useState('intro'); // 'intro' | 'workspace' | 'completed'
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState('');
  const [codingRoundData, setCodingRoundData] = useState(null);

  // Active Workspace State
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [codeMap, setCodeMap] = useState({}); // { [`${qId}_${lang}`]: code }
  const [remainingSeconds, setRemainingSeconds] = useState(45 * 60);

  // Execution & Output State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcases'); // 'testcases' | 'output'
  const [testResults, setTestResults] = useState(null);
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);

  // Security & Modal States
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showSecurityToast, setShowSecurityToast] = useState(false);
  const [securityToastMsg, setSecurityToastMsg] = useState('');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finalSummary, setFinalSummary] = useState(null);

  // Already Completed / Warning Popup State
  const [warningModal, setWarningModal] = useState(null);

  const timerRef = useRef(null);
  const editorRef = useRef(null);

  // Helper to safely exit fullscreen
  const exitFullscreenSafely = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => { });
    }
  };

  // --- 1. Start Assessment Flow ---
  const handleStartAssessment = async (forceNew = false) => {
    setLoading(true);
    setInitError('');
    setWarningModal(null);

    try {
      // 1. Fetch or create coding session with round flexibility logic
      const res = await startCodingRound(getToken, { force_new: forceNew });

      if (res.already_completed) {
        exitFullscreenSafely();
        setWarningModal({
          type: 'already_completed',
          title: 'Round Already Completed',
          message: res.message || 'You have already completed the Coding Round for this interview session.',
          details: res,
        });
        return;
      }

      if (res.entitlement_exceeded) {
        exitFullscreenSafely();
        setWarningModal({
          type: 'limit_reached',
          title: 'Session Limit Reached',
          message: res.error || res.message || 'You have reached your daily limit of sessions for today. Your limit will reset tomorrow.',
          details: res,
        });
        return;
      }

      if (!res.success) throw new Error(res.error || 'Failed to start coding round');

      // 2. Enter Fullscreen once confirmed starting
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => { });
      }

      setCodingRoundData(res);
      setRemainingSeconds(res.remaining_seconds || 45 * 60);

      // Initialize initial code map from question templates
      const initialMap = {};
      res.questions.forEach((q) => {
        SUPPORTED_LANGUAGES.forEach((lang) => {
          const tpl = q.templates?.[lang.key]?.boilerplate_code || '';
          initialMap[`${q.round_question_id}_${lang.key}`] = tpl;
        });
        // If question already has a submission, load that
        if (q.latest_submission) {
          const lLang = q.latest_submission.language;
          initialMap[`${q.round_question_id}_${lLang}`] = q.latest_submission.submitted_code;
        }
      });
      setCodeMap(initialMap);

      setPhase('workspace');
    } catch (err) {
      console.error('Error starting coding round:', err);
      const data = err.data || {};
      const isAlreadyCompleted = Boolean(
        data.already_completed ||
        err.message?.toLowerCase().includes('already completed')
      );
      const isLimitReached = Boolean(
        data.entitlement_exceeded ||
        err.message?.toLowerCase().includes('daily') ||
        err.message?.toLowerCase().includes('limit') ||
        err.message?.toLowerCase().includes('subscription') ||
        err.status === 403
      );

      if (isAlreadyCompleted || isLimitReached) {
        exitFullscreenSafely();
        setWarningModal({
          type: isAlreadyCompleted ? 'already_completed' : 'limit_reached',
          title: isAlreadyCompleted ? 'Round Already Completed' : 'Session Limit Reached',
          message: err.message || 'Unable to start coding assessment.',
          details: data,
        });
      } else {
        setInitError(err.message || 'Error connecting to coding server');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Security Enforcement: Fullscreen & Copy/Paste Restrictions ---
  useEffect(() => {
    if (phase !== 'workspace') return;

    // Fullscreen monitor
    const handleFullscreenChange = () => {
      const inFull = Boolean(document.fullscreenElement);
      setIsFullscreen(inFull);
    };

    // Clipboard blocker
    const handleClipboard = (e) => {
      e.preventDefault();
      setSecurityToastMsg('⚠️ Copying and pasting is disabled in this coding environment.');
      setShowSecurityToast(true);
      setTimeout(() => setShowSecurityToast(false), 3000);
    };

    // Shortcut blocker (Ctrl+C, Ctrl+V, Cmd+C, Cmd+V, etc.)
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        if (['c', 'v', 'x'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          setSecurityToastMsg('⚠️ Clipboard keyboard shortcuts are restricted.');
          setShowSecurityToast(true);
          setTimeout(() => setShowSecurityToast(false), 3000);
        }
      }
    };

    // Context menu (Right Click) blocker
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('copy', handleClipboard);
    window.addEventListener('paste', handleClipboard);
    window.addEventListener('cut', handleClipboard);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('copy', handleClipboard);
      window.removeEventListener('paste', handleClipboard);
      window.removeEventListener('cut', handleClipboard);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [phase]);

  // Ensure fullscreen exit when round is completed
  useEffect(() => {
    if (phase === 'completed') {
      exitFullscreenSafely();
    }
  }, [phase]);

  // --- 3. Countdown Timer ---
  const handleAutoSubmitOnExpire = useCallback(async () => {
    if (!codingRoundData?.coding_round_id) return;
    try {
      const res = await finishCodingRound({ coding_round_id: codingRoundData.coding_round_id }, getToken);
      setFinalSummary(res);
      setPhase('completed');
      exitFullscreenSafely();
    } catch (e) {
      console.error('Auto finish error:', e);
    }
  }, [codingRoundData, getToken]);

  useEffect(() => {
    if (phase !== 'workspace') return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmitOnExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, handleAutoSubmitOnExpire]);

  // Format time MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Re-enter Fullscreen Helper
  const handleReenterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
  };

  // --- 4. Monaco Editor Setup & Handlers ---
  const currentQuestion = codingRoundData?.questions?.[activeQuestionIdx];
  const currentKey = currentQuestion ? `${currentQuestion.round_question_id}_${selectedLanguage}` : '';
  const currentCode = codeMap[currentKey] || '';

  const handleEditorChange = (value) => {
    if (!currentKey) return;
    setCodeMap((prev) => ({ ...prev, [currentKey]: value || '' }));
  };

  const handleResetBoilerplate = () => {
    if (!currentQuestion) return;
    const defaultCode = currentQuestion.templates?.[selectedLanguage]?.boilerplate_code || '';
    setCodeMap((prev) => ({ ...prev, [currentKey]: defaultCode }));
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom high-contrast dark theme matching platform
    monaco.editor.defineTheme('interviewIQTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: '818cf8' },
        { token: 'function', foreground: '60a5fa' },
      ],
      colors: {
        'editor.background': '#090e17',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#131e2e',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#38bdf8',
        'editor.selectionBackground': '#1e3a5f',
        'editorCursor.foreground': '#38bdf8',
      },
    });

    monaco.editor.setTheme('interviewIQTheme');
  };

  // --- 5. Run Code (Judge0 Visible Test Cases) ---
  const handleRunCode = async () => {
    if (!currentQuestion || isRunning || isSubmitting) return;
    setIsRunning(true);
    setActiveConsoleTab('testcases');
    setTestResults(null);

    try {
      const payload = {
        round_question_id: currentQuestion.round_question_id,
        language: selectedLanguage,
        code: currentCode,
      };
      const res = await runCodingCode(payload, getToken);
      setTestResults({ type: 'run', ...res });
      setActiveCaseIdx(0);
    } catch (err) {
      setTestResults({
        type: 'run',
        success: false,
        all_passed: false,
        error: err.message || 'Execution error',
        results: [],
      });
    } finally {
      setIsRunning(false);
    }
  };

  // --- 6. Submit Code (Judge0 All Test Cases & Scoring) ---
  const handleSubmitCode = async () => {
    if (!currentQuestion || isRunning || isSubmitting) return;
    setIsSubmitting(true);
    setActiveConsoleTab('testcases');
    setTestResults(null);

    try {
      const payload = {
        round_question_id: currentQuestion.round_question_id,
        language: selectedLanguage,
        code: currentCode,
      };
      const res = await submitCodingQuestion(payload, getToken);
      setTestResults({ type: 'submit', ...res });
      setActiveCaseIdx(0);

      // Update question score in state
      if (res.score !== undefined) {
        setCodingRoundData((prev) => {
          const updatedQs = [...prev.questions];
          updatedQs[activeQuestionIdx].score_achieved = res.score;
          return { ...prev, questions: updatedQs };
        });
      }
    } catch (err) {
      setTestResults({
        type: 'submit',
        success: false,
        error: err.message || 'Submission error',
        test_cases: [],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 7. Finish Assessment Action ---
  const handleConfirmFinish = async () => {
    setShowFinishConfirm(false);
    setLoading(true);

    try {
      const res = await finishCodingRound({ coding_round_id: codingRoundData.coding_round_id }, getToken);
      setFinalSummary(res);
      setPhase('completed');
      exitFullscreenSafely();
    } catch (e) {
      alert('Error finalizing round: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= RENDER PHASE 1: INTRO =================
  if (phase === 'intro') {
    return (
      <>
        <CodingRoundIntro
          onStartAssessment={() => handleStartAssessment(false)}
          loading={loading}
          error={initError}
        />

        {/* Warning Modal (Same style as Tech and HR Preflight) */}
        {warningModal && (
          <div className="session-modal-overlay">
            <div className="session-modal-card">
              <div
                className="session-modal-icon"
                style={{
                  background: warningModal.type === 'already_completed' ? '#EAF6F0' : '#FEF3C7',
                  color: warningModal.type === 'already_completed' ? '#2A7A52' : '#D97706',
                }}
              >
                {warningModal.type === 'already_completed' ? (
                  <i className="ti ti-circle-check" />
                ) : (
                  <i className="ti ti-alert-triangle" />
                )}
              </div>
              <h2 className="session-modal-title">{warningModal.title}</h2>
              <p className="session-modal-text">{warningModal.message}</p>

              {/* Session Status Overview */}
              {warningModal.details?.already_completed && (
                <div className="session-status-list">
                  <div className="session-status-row">
                    <span className="session-status-label">Coding Round</span>
                    <span className={`session-status-pill session-status-pill--${warningModal.details.coding_status || 'completed'}`}>
                      {warningModal.details.coding_status || 'completed'}
                    </span>
                  </div>
                  <div className="session-status-row">
                    <span className="session-status-label">Technical Round</span>
                    <span className={`session-status-pill session-status-pill--${warningModal.details.tech_status || 'pending'}`}>
                      {warningModal.details.tech_status || 'pending'}
                    </span>
                  </div>
                  <div className="session-status-row">
                    <span className="session-status-label">HR Round</span>
                    <span className={`session-status-pill session-status-pill--${warningModal.details.hr_status || 'pending'}`}>
                      {warningModal.details.hr_status || 'pending'}
                    </span>
                  </div>
                </div>
              )}

              <div className="session-modal-actions">
                {warningModal.type === 'limit_reached' && (
                  <button
                    className="session-btn-primary"
                    onClick={() => navigate('/pricing')}
                  >
                    View Subscription Plans →
                  </button>
                )}
                {warningModal.type === 'already_completed' && (
                  <button
                    className="session-btn-primary"
                    onClick={() => navigate('/interview')}
                  >
                    Continue Remaining Rounds (Technical / HR)
                  </button>
                )}
                {warningModal.type === 'already_completed' && (
                  <button
                    className="session-btn-secondary"
                    onClick={() => navigate('/interview/history')}
                  >
                    View History
                  </button>
                )}
                <button
                  className="session-btn-close"
                  onClick={() => setWarningModal(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ================= RENDER PHASE 3: COMPLETED =================
  if (phase === 'completed') {
    return (
      <div className="coding-intro-container">
        <div className="coding-intro-card" style={{ textAlign: 'center', maxWidth: '640px' }}>
          <div style={{ fontSize: '52px', color: 'var(--color-success, #2A7A52)', marginBottom: '16px' }}>
            <i className="ti ti-circle-check" />
          </div>
          <h1 className="coding-intro-title">Assessment Submitted!</h1>
          <p className="coding-intro-subtitle" style={{ marginBottom: '28px' }}>
            Your coding assessment has been successfully evaluated.
          </p>

          <div
            style={{
              background: 'var(--color-bg-secondary, #FDFAF1)',
              border: '1px solid var(--color-border, #E7DDC8)',
              borderRadius: 'var(--radius-md, 14px)',
              padding: '28px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--color-text-secondary, #4A5D4F)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              Final Round Score
            </div>
            <div
              style={{
                fontSize: '46px',
                fontWeight: '800',
                color: 'var(--color-text-primary, #00200B)',
                fontFamily: 'var(--font-display, inherit)',
              }}
            >
              {finalSummary?.total_score || 0}%
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-start-coding"
              style={{ padding: '12px 28px' }}
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate('/interview/history')}
              className="session-btn-secondary"
              style={{ padding: '12px 24px' }}
            >
              View Interview History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER PHASE 2: WORKSPACE =================
  const visibleCases =
    testResults?.type === 'run'
      ? testResults.results
      : testResults?.type === 'submit'
        ? testResults.test_cases
        : currentQuestion?.sample_test_cases || [];

  const currentCase = visibleCases?.[activeCaseIdx] || visibleCases?.[0];

  return (
    <div className="coding-workspace">
      {/* Toast Warning */}
      {showSecurityToast && (
        <div className="security-toast">
          <i className="ti ti-alert-triangle" /> {securityToastMsg}
        </div>
      )}

      {/* Fullscreen Violation Modal */}
      {!isFullscreen && (
        <div className="security-warning-overlay">
          <div className="security-modal">
            <div className="security-modal__icon">
              <i className="ti ti-maximize" />
            </div>
            <h2 className="security-modal__title">Fullscreen Mode Required</h2>
            <p className="security-modal__text">
              This assessment is proctored. You must remain in fullscreen mode. Please return to fullscreen immediately to continue your test.
            </p>
            <button className="btn-reenter-fullscreen" onClick={handleReenterFullscreen}>
              Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="security-warning-overlay">
          <div className="security-modal">
            <div className="security-modal__icon" style={{ color: '#3b82f6' }}>
              <i className="ti ti-help-circle" />
            </div>
            <h2 className="security-modal__title">Finish Assessment?</h2>
            <p className="security-modal__text">
              Are you sure you want to finish the coding round? Your current solutions will be finalized and evaluated.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowFinishConfirm(false)}
                style={{
                  padding: '10px 20px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#e2e8f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinish}
                style={{
                  padding: '10px 24px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Yes, Submit All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Top Control Bar (Clean: Brand, Timer, Finish) --- */}
      <header className="coding-header">
        <div className="coding-header__left">
          <div className="coding-header__brand">
            <i className="ti ti-code" style={{ color: '#4F8AC0', fontSize: '20px' }} />
            <span>Interview<span style={{ color: '#7bb3e8' }}>IQ</span></span>
            <span className="coding-header__brand-tag">PROCTORED</span>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="coding-header__center">
          <div className={`timer-box ${remainingSeconds < 300 ? 'timer-box--warning' : ''}`}>
            <i className="ti ti-clock" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>
        </div>

        {/* Right: Security & Finish Trigger */}
        <div className="coding-header__right">
          <div className={`security-badge ${isFullscreen ? 'security-badge--active' : ''}`}>
            <i className="ti ti-shield-lock" />
            <span>Proctored</span>
          </div>
          <button className="btn-finish-round" onClick={() => setShowFinishConfirm(true)}>
            <i className="ti ti-send" /> Finish Round
          </button>
        </div>
      </header>

      {/* --- Main Body: Split Problem / Editor Workspace --- */}
      <div className="coding-body">
        {/* Left Column: Problem Statement with Question Selector (1, 2, 3) */}
        <section className="problem-pane">
          {/* Question Navigator on Left Side */}
          <div className="problem-pane__question-bar">
            <span className="problem-pane__question-label">Questions:</span>
            <div className="problem-pane__question-tabs">
              {codingRoundData?.questions?.map((q, idx) => {
                const isSolved = q.score_achieved > 0;
                return (
                  <button
                    key={q.round_question_id}
                    className={`q-num-tab ${activeQuestionIdx === idx ? 'q-num-tab--active' : ''} ${isSolved ? 'q-num-tab--solved' : ''
                      }`}
                    onClick={() => {
                      setActiveQuestionIdx(idx);
                      setTestResults(null);
                    }}
                    title={`Question ${idx + 1}: ${q.title} (${q.difficulty})`}
                  >
                    <span>{idx + 1}</span>
                    {isSolved && <i className="ti ti-check q-num-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="problem-pane__header">
            <h2 className="problem-pane__title">
              <span>{currentQuestion?.title}</span>
              <span className={`diff-badge diff-badge--${currentQuestion?.difficulty?.toLowerCase()}`}>
                {currentQuestion?.difficulty}
              </span>
            </h2>
            <div className="problem-pane__meta">
              <span><i className="ti ti-bolt" /> {currentQuestion?.time_limit_ms}ms</span>
              <span><i className="ti ti-cpu" /> {Math.round((currentQuestion?.memory_limit_kb || 262144) / 1024)}MB</span>
            </div>
          </div>

          <div className="problem-pane__content markdown-content">
            <ReactMarkdown>{currentQuestion?.description}</ReactMarkdown>
          </div>
        </section>

        {/* Right Column: Editor & Execution Console */}
        <section className="editor-pane">
          {/* Editor Header Toolbar */}
          <div className="editor-toolbar">
            <div className="editor-toolbar__left">
              <div className="language-selector">
                <label>Language:</label>
                <select
                  className="language-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.key} value={lang.key}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="editor-toolbar__right">
              <button
                className="editor-tool-btn"
                title="Reset to boilerplate code"
                onClick={handleResetBoilerplate}
              >
                <i className="ti ti-refresh" /> Reset Code
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="monaco-wrapper">
            <Editor
              height="100%"
              language={SUPPORTED_LANGUAGES.find((l) => l.key === selectedLanguage)?.monacoLang || 'python'}
              value={currentCode}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                cursorBlinking: 'smooth',
                contextmenu: false, // Security: Disable context menu inside editor
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Bottom Console Panel */}
          <div className="console-pane">
            <div className="console-toolbar">
              <div className="console-tabs">
                <button
                  className={`console-tab-btn ${activeConsoleTab === 'testcases' ? 'console-tab-btn--active' : ''}`}
                  onClick={() => setActiveConsoleTab('testcases')}
                >
                  <i className="ti ti-terminal-2" /> Test Cases & Results
                </button>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className="btn-run"
                  disabled={isRunning || isSubmitting}
                  onClick={handleRunCode}
                >
                  {isRunning ? (
                    <>
                      <span className="spinner-sm" /> Running...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-player-play" /> Run Code
                    </>
                  )}
                </button>

                <button
                  className="btn-submit"
                  disabled={isRunning || isSubmitting}
                  onClick={handleSubmitCode}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-sm" /> Evaluating...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check" /> Submit Code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Console Content Display */}
            <div className="console-content">
              {/* Overall Status Banner if run/submitted */}
              {testResults && (
                <div
                  className={`tc-status-banner ${testResults.all_passed || testResults.status === 'accepted'
                      ? 'tc-status-banner--success'
                      : 'tc-status-banner--error'
                    }`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i
                      className={`ti ${testResults.all_passed || testResults.status === 'accepted'
                          ? 'ti-circle-check'
                          : 'ti-alert-circle'
                        }`}
                    />
                    <span>
                      {testResults.type === 'submit'
                        ? `Submission Result: ${testResults.passed_count}/${testResults.total_test_cases} Passed (${testResults.score}%)`
                        : testResults.all_passed
                          ? 'All Sample Test Cases Passed!'
                          : 'Sample Test Cases Failed'}
                    </span>
                  </div>
                  {testResults.execution_time_ms !== undefined && (
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>
                      {testResults.execution_time_ms} ms | {Math.round((testResults.memory_used_kb || 0) / 1024)} MB
                    </span>
                  )}
                </div>
              )}

              {/* Test Case Selection Chips */}
              {visibleCases && visibleCases.length > 0 && (
                <div className="testcase-selector">
                  {visibleCases.map((tc, idx) => {
                    const isPassed = tc.passed;
                    const chipClass =
                      isPassed === true ? 'tc-chip--passed' : isPassed === false ? 'tc-chip--failed' : '';
                    return (
                      <button
                        key={tc.test_case_id || idx}
                        className={`tc-chip ${activeCaseIdx === idx ? 'tc-chip--active' : ''} ${chipClass}`}
                        onClick={() => setActiveCaseIdx(idx)}
                      >
                        {isPassed === true && <i className="ti ti-check" />}
                        {isPassed === false && <i className="ti ti-x" />}
                        <span>Case {idx + 1} {tc.is_hidden ? '(Hidden)' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active Case Details Grid */}
              {currentCase && (
                <div className="tc-detail-grid">
                  <div className="tc-field">
                    <span className="tc-field-label">Input</span>
                    <div className="tc-field-box">{currentCase.input_data || 'N/A'}</div>
                  </div>

                  <div className="tc-field">
                    <span className="tc-field-label">Expected Output</span>
                    <div className="tc-field-box">{currentCase.expected_output || 'N/A'}</div>
                  </div>

                  {currentCase.actual_output !== undefined && (
                    <div className="tc-field">
                      <span className="tc-field-label">Your Output</span>
                      <div
                        className="tc-field-box"
                        style={{
                          borderColor: currentCase.passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                          color: currentCase.passed ? '#34d399' : '#f87171',
                        }}
                      >
                        {currentCase.actual_output || '(Empty output)'}
                      </div>
                    </div>
                  )}

                  {currentCase.stderr && (
                    <div className="tc-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="tc-field-label" style={{ color: '#f87171' }}>Error Log</span>
                      <div className="tc-field-box" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                        {currentCase.stderr}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
