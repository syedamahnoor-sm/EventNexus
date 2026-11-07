import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import useStudentProfile from '../hooks/useStudentProfile';
import { profileCompleteness } from '../lib/studentProfile';
import StudentProfileEditor from '../components/StudentProfileEditor';
import ProfilePhotoManager from '../components/ProfilePhotoManager';
import BrandMark from '../components/BrandMark';
import Arrow from '../components/Arrow';
import './StudentProfile.css';

function ProfileContent() {
  const { user } = useAuth();
  const profile = useStudentProfile();
  const saved = profile.user;
  const progress = saved && profileCompleteness(saved);
  useEffect(() => { const previous = document.title; document.title = 'Your student profile | EventNexus'; return () => { document.title = previous; }; }, []);
  const date = saved?.createdAt ? new Date(saved.createdAt) : null;
  return <main id="main" tabIndex={-1} className="student-profile wrap">
    <nav className="profile-breadcrumb" aria-label="Breadcrumb"><Link to="/student/dashboard">← My campus</Link><span>YOUR EVENTNEXUS / STUDENT PROFILE</span></nav>
    <header className="profile-page-heading entrance"><div><p className="eyebrow">A PLACE FOR THE PERSON BEHIND THE PLANS</p><h1>A little more<br /><em>you.</em></h1></div><p>Your campus identity, kept simple.<br />Useful details for the experiences ahead.</p></header>
    {profile.error && <div className="profile-load-error" role="alert"><p>We couldn’t refresh your saved profile. {saved ? 'Your draft and the last loaded details are kept.' : 'Please reconnect and try again.'}</p><button className="text-link" onClick={profile.load} disabled={profile.loading}>Try again <Arrow /></button></div>}
    {!saved ? profile.loading && <div className="profile-skeleton" role="status"><span>Loading your student profile…</span><div /><div /></div> : <div className="profile-page-layout">
      <aside className="profile-identity" aria-labelledby="profile-identity-name"><ProfilePhotoManager user={saved} settings={profile.photoUpload} accept={profile.accept} reload={profile.load} disabled={profile.loading || profile.error} /><p className="eyebrow">STUDENT / EVENTNEXUS</p><h2 id="profile-identity-name">{saved.name}</h2><p className="profile-identity-email">{saved.email}</p><div className="profile-account-date"><span>ACCOUNT CREATED</span><strong>{date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date) : 'Not available'}</strong></div>
        <div className="profile-completeness"><div><span>PROFILE ESSENTIALS</span><strong>{progress.percent}%</strong></div><div className="profile-progress" role="progressbar" aria-label="Profile essentials added" aria-valuenow={progress.complete} aria-valuemin={0} aria-valuemax={progress.total} aria-valuetext={`${progress.complete} of ${progress.total} essentials added`}><span style={{ width: `${progress.percent}%` }} /></div><p>{progress.complete} of {progress.total} essentials added. Name, email, student ID, program and semester/year. Phone is optional.</p></div>
        <div className="profile-identity-footnote"><BrandMark /><p>Saved once.<br />Ready for your next chapter.</p></div>
      </aside>
      <StudentProfileEditor profile={saved} loading={profile.loading || profile.error} accept={profile.accept} reload={profile.load} />
    </div>}
    <footer className="profile-footer"><p>More campus.<br /><em>Less paperwork.</em></p><Link className="text-link" to="/events">Find your next experience <Arrow diagonal /></Link></footer>
    <span className="sr-only">Signed in as {user.name}.</span>
  </main>;
}
export default function StudentProfile() { const { user } = useAuth(); return <ProfileContent key={user.id} />; }
