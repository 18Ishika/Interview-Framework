import React from 'react';
import './IQCard.css';

const IQCard = ({ profileData }) => {
  if (!profileData || !profileData.user) return null;

  const { user, skills, projects, scores } = profileData;
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'iq-score-good';
    if (score >= 60) return 'iq-score-avg';
    return 'iq-score-poor';
  };

  const projectCount = projects?.length || 0;
  const readyScore = scores?.overall || 0; // Using overall score as proxy for ready score

  return (
    <div className="iq-card-container">
      <div className="iq-card-inner">
        {/* Front of Card: Profile */}
        <div className="iq-card-front">
          <div className="iq-profile-header-bg">
            <div className="iq-profile-id">{user.platform_id || 'ID: PENDING'}</div>
            <div className="iq-brand-tag">Interview IQ</div>
            <div className="iq-profile-img-wrapper">
              <img 
                src={user.profile_img_url || 'https://via.placeholder.com/150/3b3b3b/FFFFFF?text=User'} 
                alt="Profile" 
                className="iq-profile-img" 
              />
            </div>
          </div>
          
          <div className="iq-profile-info">
            <h2>{user.first_name} {user.last_name}</h2>
            <p className="iq-profile-role">{user.role === 'candidate' ? 'Candidate' : user.role}</p>
            <p className="iq-profile-date">Since {joinDate}</p>
          </div>

          <div className="iq-stats-overview">
            <div className="iq-stat-item">
              <div className="iq-stat-item-label">Projects</div>
              <div className="iq-stat-item-val">{projectCount}</div>
            </div>
            <div className="iq-stat-item">
              <div className="iq-stat-item-label">Ready Score</div>
              <div className="iq-stat-item-val">{Math.round(readyScore)}</div>
            </div>
          </div>

          <div className="iq-profile-body">
            <div className="iq-skills-list">
              {skills && skills.length > 0 ? (
                skills.slice(0, 8).map((skill, idx) => (
                  <span key={idx} className="iq-skill-chip">#{skill}</span>
                ))
              ) : (
                <span className="iq-skill-chip" style={{ opacity: 0.5 }}>No skills added</span>
              )}
            </div>
          </div>
        </div>

        {/* Back of Card: Performance */}
        <div className="iq-card-back">
          <div className="iq-perf-header">
            <div className="iq-overall-label">Overall Score</div>
            <div className="iq-overall-score">{scores?.overall || 0}%</div>
          </div>

          <div className="iq-stats-grid">
            <div className="iq-stat-box">
              <div className={`iq-stat-value ${getScoreColor(scores?.tech || 0)}`}>{scores?.tech || 0}%</div>
              <div className="iq-stat-label">Tech</div>
            </div>
            <div className="iq-stat-box">
              <div className={`iq-stat-value ${getScoreColor(scores?.coding || 0)}`}>{scores?.coding || 0}%</div>
              <div className="iq-stat-label">Coding</div>
            </div>
            <div className="iq-stat-box">
              <div className={`iq-stat-value ${getScoreColor(scores?.hr || 0)}`}>{scores?.hr || 0}%</div>
              <div className="iq-stat-label">HR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IQCard;
