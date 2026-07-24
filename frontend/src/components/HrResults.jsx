    function ScoreBar({ label, score, hint }) {
    const pct = Math.max(0, Math.min(100, score ?? 0));
    const color = pct >= 75 ? "#2A7A52" : pct >= 50 ? "#C9A227" : "var(--color-danger)";
    return (
        <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <span>{label}</span>
            <span>{score != null ? pct : "No data"}</span>
        </div>
        <div style={{ height: 8, background: "var(--color-bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
        </div>
        {hint && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{hint}</div>}
        </div>
    );
    }

    function FeedbackList({ items }) {
    if (!items || items.length === 0) return null;
    return (
        <ul style={{ fontSize: 13, color: "var(--color-text-secondary)", paddingLeft: 18, marginTop: 8 }}>
        {items.map((note, i) => <li key={i} style={{ marginBottom: 4 }}>{note}</li>)}
        </ul>
    );
    }

    export default function HrResults({ metrics }) {
    const posture = metrics.posture_metric || {};
    const gaze = metrics.eye_contact_metrics || {};
    const blink = gaze.blink || {};
    const headPose = posture.head_pose || {};
    const overallScore = metrics.qna_metrics?.overall_visual_confidence_score;

    return (
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "left" }}>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>Behavior Analysis</h2>
        {overallScore != null && (
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 20 }}>
            Overall visual confidence score: <strong>{overallScore}</strong>
            </p>
        )}

        <ScoreBar label="Posture" score={posture.score} />
        <FeedbackList items={posture.feedback} />

        <ScoreBar
            label="Eye Contact"
            score={gaze.score}
            hint={blink.blink_rate_per_min != null ? `${blink.blink_rate_per_min} blinks/min · ${blink.assessment}` : null}
        />
        <FeedbackList items={gaze.feedback} />

        {headPose.facing_camera_pct != null && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8 }}>
            Facing camera {headPose.facing_camera_pct}% of the time
            </p>
        )}
        </div>
    );
    }