import { useEffect, useState } from 'react';
import * as tus from 'tus-js-client';
import { supabase, supabaseConfigured } from './lib/supabase';
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Film,
  FolderOpen,
  HardDrive,
  House,
  LockKeyhole,
  LogOut,
  Menu,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';

type Section =
  | 'home'
  | 'categories'
  | 'recent'
  | 'admin'
  | 'uploads'
  | 'library'
  | 'settings';
const navItems: { id: Section; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Discover', icon: House },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'recent', label: 'Recently added', icon: Activity },
];

function App() {
  const [section, setSection] = useState<Section>('home');
  const [ageConfirmed, setAgeConfirmed] = useState(
    () => localStorage.getItem('nightstream-age-confirmed') === 'yes'
  );
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPreview, setAdminPreview] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState('');
  const [showAgeInfo, setShowAgeInfo] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authBusy, setAuthBusy] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isRealAdmin, setIsRealAdmin] = useState(false);
  const [videoRecords, setVideoRecords] = useState<any[]>([]);
  const [categoryRecords, setCategoryRecords] = useState<any[]>([]);
  const [playingVideo, setPlayingVideo] = useState<any>(null);

  useEffect(() => {
    document.title =
      section === 'admin' ||
      section === 'uploads' ||
      section === 'library' ||
      section === 'settings'
        ? 'Admin Console | Nightstream'
        : 'Nightstream | Private Video Library';
  }, [section]);

  const loadUserAccess = async (user: any) => {
    setSessionUser(user);
    const { data, error } = await supabase.from('nightstream_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    const allowed = !error && Boolean(data?.user_id);
    setIsRealAdmin(allowed);
    if (!allowed) setAdminPreview(false);
  };

  const loadCatalog = async () => {
    if (!supabaseConfigured) return;
    const [{ data: videos }, { data: categories }] = await Promise.all([
      supabase.from('nightstream_videos').select('id,title,slug,description,thumbnail_url,status,created_at,published_at,category_id,bunny_video_id').eq('status', 'published').order('published_at', { ascending: false }),
      supabase.from('nightstream_categories').select('id,name,slug,description').order('sort_order'),
    ]);
    setVideoRecords(videos || []);
    setCategoryRecords(categories || []);
  };

  useEffect(() => {
    if (!supabaseConfigured) return;
    void loadCatalog();
    supabase.auth.getSession().then(({ data }) => { if (data.session?.user) void loadUserAccess(data.session.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (session?.user) void loadUserAccess(session.user);
        else { setSessionUser(null); setIsRealAdmin(false); setAdminPreview(false); }
      }, 0);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const confirmAge = () => {
    localStorage.setItem('nightstream-age-confirmed', 'yes');
    setAgeConfirmed(true);
  };

  const openAdmin = () => {
    setMobileMenu(false);
    if (isRealAdmin) { setSection('admin'); setNotice(''); return; }
    setShowAdminLogin(true);
  };

  const authenticateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) { setNotice('Supabase is not configured for this deployment. Check Vercel environment variables and redeploy.'); return; }
    if (authEmail.trim().toLowerCase() !== 'supportfapreski@gmail.com') { setNotice("This email isn't authorized for Nightstream access."); return; }
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim().toLowerCase(), password: authPassword });
        if (error) throw error;
        if (data.session?.user) {
          await loadUserAccess(data.session.user);
          setShowAdminLogin(false); setSection('admin');
          setNotice('Account created. Checking your access…');
        } else { setNotice('Account created. Check your email for the Supabase confirmation link, then return here to sign in.'); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail.trim().toLowerCase(), password: authPassword });
        if (error) throw error;
        if (!data.user) throw new Error('Sign-in did not return a user.');
        const { data: adminRow, error: adminError } = await supabase.from('nightstream_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
        if (adminError || !adminRow) { await supabase.auth.signOut(); throw new Error("This account isn't authorized to access Nightstream controls."); }
        setSessionUser(data.user); setIsRealAdmin(true); setAdminPreview(false); setShowAdminLogin(false); setSection('admin');
        setNotice('Signed in successfully.');
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not authenticate. Please try again.'); }
    finally { setAuthBusy(false); }
  };

  const chooseSection = (next: Section) => {
    if (['admin', 'uploads', 'library', 'settings'].includes(next) && !isRealAdmin) { setShowAdminLogin(true); setMobileMenu(false); return; }
    setSection(next); setMobileMenu(false); setNotice('');
  };

  const isAdminSection = ['admin', 'uploads', 'library', 'settings'].includes(
    section
  );

  if (!ageConfirmed) {
    return (
      <main className="age-screen">
        <div className="age-glow age-glow-one" />
        <div className="age-glow age-glow-two" />
        <section className="age-card">
          <div className="brand-mark">
            <Play size={20} fill="currentColor" />
          </div>
          <p className="eyebrow">PRIVATE VIDEO LIBRARY</p>
          <h1>
            Welcome to <span>Nightstream</span>
          </h1>
          <p className="age-copy">
            A private space for lawful adult content featuring consenting
            adults. Please confirm that you are legally old enough to access
            adult material in your location.
          </p>
          <div className="age-rule">
            <ShieldCheck size={19} />
            <span>Adults only · Respect · Consent · Privacy</span>
          </div>
          <button className="primary-button age-confirm" onClick={confirmAge}>
            I am of legal age <span>Continue</span>
            <Play size={15} fill="currentColor" />
          </button>
          <button
            className="text-button"
            onClick={() => setShowAgeInfo(v => !v)}
          >
            {showAgeInfo ? 'Hide access information' : 'Why am I seeing this?'}
          </button>
          {showAgeInfo && (
            <p className="age-fineprint">
              This declaration gate is a basic access reminder, not identity
              verification. Additional age-assurance controls may be required by
              law or by service providers before launch.
            </p>
          )}
          <p className="age-fineprint">
            By continuing, you confirm you meet the legal age requirement where
            you live. If you do not, please leave this website.
          </p>
        </section>
        <div className="age-footer">
          PRIVATE BY DESIGN <span>•</span> BUILT FOR RESPONSIBLE ACCESS
        </div>
      </main>
    );
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <button
          className="mobile-menu-button icon-button"
          aria-label="Open menu"
          onClick={() => setMobileMenu(v => !v)}
        >
          <Menu size={21} />
        </button>
        <button
          className="brand"
          onClick={() => chooseSection('home')}
          aria-label="Nightstream home"
        >
          <span className="brand-mark small">
            <Play size={15} fill="currentColor" />
          </span>
          <span className="brand-name">
            nightstream<span className="brand-dot">.</span>
            <small>PRIVATE VIDEO</small>
          </span>
        </button>
        <div className="top-search">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search your library"
            aria-label="Search library"
          />
          {searchTerm && (
            <button
              className="bare-icon"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <kbd>⌘ K</kbd>
        </div>
        <div className="top-actions">
          <button
            className="icon-button notification-button"
            aria-label="Notifications"
            onClick={() =>
              setNotice('You’re all caught up. No notifications yet.')
            }
          >
            <Bell size={19} />
            <i />
          </button>
          <button className="profile-chip" onClick={openAdmin}>
            <span className="avatar">NS</span>
            <span className="profile-label">{isRealAdmin ? (sessionUser?.email || "Administrator") : "Admin access"}</span>
            <ChevronDown size={15} />
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
          <div className="sidebar-caption">YOUR SPACE</div>
          <nav className="side-nav">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${section === item.id ? 'active' : ''}`}
                  onClick={() => chooseSection(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-caption categories-caption">LIBRARY</div>
          <nav className="side-nav">
            <button
              className={`nav-item ${section === 'library' ? 'active' : ''}`}
              onClick={() => chooseSection('library')}
            >
              <Film size={18} />
              <span>Video library</span>
              <span className="nav-count">{videoRecords.length}</span>
            </button>
            <button
              className={`nav-item ${section === 'uploads' ? 'active' : ''}`}
              onClick={() => chooseSection('uploads')}
            >
              <CloudUpload size={18} />
              <span>Uploads</span>
            </button>
          </nav>
          <div className="sidebar-spacer" />
          <div className="storage-card">
            <div className="storage-heading">
              <HardDrive size={16} />
              <span>Storage status</span>
            </div>
            <strong>Connection test pending</strong>
            <div className="storage-track">
              <span />
            </div>
            <p>Run a test upload to verify the video provider connection.</p>
            <button onClick={() => chooseSection('settings')}>
              Configure storage <span>→</span>
            </button>
          </div>
          <button className="nav-item admin-nav" onClick={openAdmin}>
            <LockKeyhole size={18} />
            <span>Admin dashboard</span>
          </button>
          <button
            className="nav-item help-nav"
            onClick={() =>
              setNotice(
                'Setup help: connect Supabase Auth and database, then configure Bunny Stream credentials server-side.'
              )
            }
          >
            <CircleHelp size={18} />
            <span>Help & setup</span>
          </button>
          <div className="sidebar-bottom">
            <span className="status-dot" /> Setup required{' '}
            <span className="version-label">v0.1</span>
          </div>
        </aside>

        {mobileMenu && (
          <button
            className="mobile-scrim"
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
          />
        )}

        <main className="main-content">
          {notice && (
            <div className="notice-banner">
              <span>{notice}</span>
              <button
                onClick={() => setNotice('')}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {isAdminSection ? (
            <AdminContent
              section={section}
              chooseSection={chooseSection}
              adminPreview={adminPreview}
              setNotice={setNotice}
              categories={categoryRecords}
              videos={videoRecords}
              onUploadComplete={loadCatalog}
              onSignOut={async () => { await supabase.auth.signOut(); setNotice('Signed out.'); setSection('home'); }}
            />
          ) : (
            <>
              <div className="catalog-topline">
                <div className="catalog-heading">
                  <p className="eyebrow">NIGHTSTREAM VIDEO COLLECTION</p>
                  <h1>
                    {section === 'home'
                      ? 'Explore videos'
                      : section === 'categories'
                        ? 'Browse categories'
                        : 'Recently added'}
                  </h1>
                  <p className="subtitle">
                    A clean, easy-to-browse library. Videos appear here only after you upload and publish them.
                  </p>
                </div>
                <button className="outline-button" onClick={openAdmin}>
                  <LockKeyhole size={16} /> Admin access
                </button>
              </div>

              <nav className="catalog-tabs" aria-label="Video library sections">
                <button
                  className={section === 'home' ? 'catalog-tab active' : 'catalog-tab'}
                  onClick={() => chooseSection('home')}
                >
                  <Film size={16} /> Videos
                </button>
                <button
                  className={section === 'recent' ? 'catalog-tab active' : 'catalog-tab'}
                  onClick={() => chooseSection('recent')}
                >
                  <Activity size={16} /> Recently added
                </button>
                <button
                  className={section === 'categories' ? 'catalog-tab active' : 'catalog-tab'}
                  onClick={() => chooseSection('categories')}
                >
                  <FolderOpen size={16} /> Categories
                </button>
                <span className="catalog-tab-spacer" />
                <span className="catalog-count"><Video size={14} /> {videoRecords.length} videos</span>
              </nav>

              {section === 'categories' && (
                <section className="category-list" aria-label="Video categories">
                  {categoryRecords.map(category => (
                    <div className="category-pill" key={category.id}>
                      <FolderOpen size={16} />
                      <span>{category.name}</span>
                    </div>
                  ))}
                </section>
              )}
              <div className="catalog-toolbar">
                <div>
                  <h2>
                    {section === 'categories'
                      ? 'All categories'
                      : section === 'recent'
                        ? 'Recently added videos'
                        : 'Latest videos'}
                  </h2>
                  <p>{videoRecords.length ? `${videoRecords.length} published ${videoRecords.length === 1 ? 'video' : 'videos'} in your library.` : "Nothing has been published yet."}</p>
                </div>
                <button className="sort-control" onClick={() => setNotice('Sorting options will become available when your first videos are published.')}>
                  Newest first <ChevronDown size={15} />
                </button>
              </div>

              {videoRecords.length === 0 ? (
                <section className="catalog-empty">
                  <div className="catalog-empty-art"><div className="catalog-empty-ring ring-a" /><div className="catalog-empty-ring ring-b" /><div className="catalog-empty-play"><Play size={27} fill="currentColor" /></div></div>
                  <div className="catalog-empty-copy"><span className="empty-kicker">YOUR LIBRARY STARTS HERE</span><h3>No videos to show yet</h3><p>This collection is intentionally empty. Once you upload and publish your own videos, their thumbnails and details will appear here.</p><button className="primary-button" onClick={openAdmin}><LockKeyhole size={16} /> Open admin dashboard</button></div>
                </section>
              ) : (
                <section className="published-video-grid" aria-label="Published videos">
                  {videoRecords.map(video => <article className="published-video-card" key={video.id} role="button" tabIndex={0} onClick={() => setPlayingVideo(video)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setPlayingVideo(video); }}><div className="published-video-thumb">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" /> : <Play size={26} fill="currentColor" />}</div><div className="published-video-copy"><h3>{video.title}</h3>{video.description && <p>{video.description}</p>}<span>Play video ▶</span></div></article>)}
                </section>
              )}

              <div className="catalog-bottom-grid">
                <section className="catalog-info-card">
                  <span className="catalog-info-icon"><ShieldCheck size={19} /></span>
                  <div>
                    <strong>Adults-only access</strong>
                    <p>A declaration gate is active. Add any legally required age-assurance controls before public launch.</p>
                  </div>
                </section>
                <section className="catalog-info-card">
                  <span className="catalog-info-icon green"><CloudUpload size={19} /></span>
                  <div>
                    <strong>Only your uploads</strong>
                    <p>No demo videos or sample thumbnails are included. Your library stays empty until you publish content.</p>
                  </div>
                </section>
              </div>
            </>
          )}
          {playingVideo && <div className="video-player-overlay" role="dialog" aria-modal="true" aria-label={playingVideo.title}><div className="video-player-panel"><div className="video-player-heading"><strong>{playingVideo.title}</strong><button className="icon-button" onClick={() => setPlayingVideo(null)} aria-label="Close video player"><X size={20} /></button></div>{playingVideo.bunny_video_id ? <iframe src={`https://player.mediadelivery.net/embed/781442/${playingVideo.bunny_video_id}`} title={playingVideo.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /> : <p>Playback is not available for this video record.</p>}</div></div>}
          <footer className="footer">
            <span>© 2026 Nightstream</span>
            <span>
              Private video library <i /> Built for responsible access
            </span>
            <button onClick={() => setShowAgeInfo(v => !v)}>
              Access policy
            </button>
          </footer>
          {showAgeInfo && (
            <div className="policy-note">
              This site is a starter build. A simple age declaration is not
              robust age verification. Add any legally required age-assurance
              and compliance controls before public launch.
            </div>
          )}
        </main>
      </div>

      {showAdminLogin && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowAdminLogin(false)}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdminLogin(false)} aria-label="Close"><X size={19} /></button>
            <div className="modal-symbol"><LockKeyhole size={23} /></div>
            <p className="eyebrow">RESTRICTED AREA</p>
            <h2 id="admin-modal-title">Sign in or create an account</h2>
            <p className="modal-copy">Sign in to continue to Nightstream.</p>
            <form onSubmit={authenticateAdmin}>
              <div className="form-field"><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" autoComplete="username" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required /></div>
              <div className="form-field"><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} value={authPassword} onChange={e => setAuthPassword(e.target.value)} required /></div>
              {!supabaseConfigured && <div className="setup-warning"><ShieldAlert size={18} /><div><strong>Supabase not configured</strong><span>Check the Vercel environment variables and redeploy.</span></div></div>}
              <button className="primary-button full-button" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'} <span>→</span></button>
            </form>
            <button className="text-button" onClick={() => setAuthMode(v => v === 'signin' ? 'signup' : 'signin')}>{authMode === 'signin' ? 'First time? Create account' : 'Already have an account? Sign in'}</button>
            <p className="age-fineprint">Access is limited to authorized accounts. Never share your password.</p>
          </section>
        </div>
      )}
    </div>
  );
}

function AdminContent({
  section,
  chooseSection,
  adminPreview,
  setNotice,
  onSignOut,
  categories,
  videos,
  onUploadComplete,
}: {
  section: Section;
  chooseSection: (s: Section) => void;
  adminPreview: boolean;
  setNotice: (s: string) => void;
  onSignOut: () => void;
  categories: any[];
  videos: any[];
  onUploadComplete: () => Promise<void>;
}) {
  const title =
    section === 'uploads'
      ? 'Upload videos'
      : section === 'library'
        ? 'Manage video library'
        : section === 'settings'
          ? 'Platform settings'
          : 'Dashboard overview';
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [fileSize, setFileSize] = useState('');

  const handleFile = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setSelectedFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
  };

  const uploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      if (!selectedFile) { setNotice('Choose a video file first.'); return; }
      if (!videoTitle.trim() || !videoCategory) { setNotice('Enter a title and choose a category.'); return; }
      setUploadBusy(true); setUploadProgress(0);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Your admin session has expired. Sign in again.');
        const response = await fetch('/api/bunny/create-upload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: videoTitle.trim(), description: videoDescription.trim(), categoryId: videoCategory }) });
        const credentials = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(credentials.error || 'Could not prepare the upload.');
        const upload = new tus.Upload(selectedFile, {
          endpoint: credentials.tusEndpoint,
          // Keep each PATCH request modest for mobile networks and avoid large-request connection drops.
          chunkSize: 5 * 1024 * 1024,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: { AuthorizationSignature: credentials.signature, AuthorizationExpire: String(credentials.expires), LibraryId: String(credentials.libraryId), VideoId: credentials.videoId },
          metadata: { filetype: selectedFile.type || 'application/octet-stream', title: videoTitle.trim() },
          onError(error) { setNotice(`Upload failed: ${error.message}`); setUploadBusy(false); },
          onProgress(bytesUploaded, bytesTotal) { setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100)); },
          onSuccess() {
            void (async () => {
              let thumbnailUrl: string | null = null;
              let thumbnailFailed = false;
              if (thumbnailBlob) {
                const { error: thumbError } = await supabase.storage
                  .from('nightstream-thumbnails')
                  .upload(`${credentials.videoId}.jpg`, thumbnailBlob, { contentType: 'image/jpeg', upsert: true });
                if (thumbError) thumbnailFailed = true;
                else thumbnailUrl = supabase.storage.from('nightstream-thumbnails').getPublicUrl(`${credentials.videoId}.jpg`).data.publicUrl;
              }
              const update: Record<string, unknown> = { status: 'published', published_at: new Date().toISOString() };
              if (thumbnailUrl) update.thumbnail_url = thumbnailUrl;
              const { error } = await supabase.from('nightstream_videos').update(update).eq('bunny_video_id', credentials.videoId);
              const message = error
                ? 'Video uploaded, but its catalogue status could not be updated. Refresh the library or contact support.'
                : thumbnailFailed
                  ? 'Video uploaded. Its cover image could not be saved, but playback becomes available after encoding.'
                  : thumbnailUrl
                    ? 'Video uploaded with its cover image. Bunny Stream is processing it; playback starts when encoding finishes.'
                    : 'Video uploaded. Bunny Stream is processing it; playback starts when encoding finishes.';
              setNotice(message);
              setUploadBusy(false); setSelectedFile(null); setSelectedFileName(''); setFileSize(''); setVideoTitle(''); setVideoDescription(''); setVideoCategory(''); setThumbnailBlob(null);
              if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
              setThumbnailPreview('');
              await onUploadComplete();
            })();
          },
        });
        upload.start();
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not start the upload.'); setUploadBusy(false); }
    })();
  };

  return (
    <div className="admin-page">
      <div className="admin-title-row">
        <div>
          <p className="eyebrow">CONTROL CENTER</p>
          <h1>{title}</h1>
          <p className="subtitle">
            Manage your content and platform configuration.
          </p>
        </div>
        <div className="admin-title-actions"><span className="preview-badge"><span /> Administrator verified</span><button className="text-button" onClick={onSignOut}><LogOut size={14} /> Sign out</button></div>
      </div>
      <div className="admin-warning">
        <ShieldAlert size={20} />
        <div>
          <strong>Upload connection test pending</strong>
          <p>
            {adminPreview
              ? 'You are viewing the dashboard preview. Real sign-in, uploads, and persistent video records are not active until the services are connected.'
              : 'Supabase and the Bunny upload endpoint are deployed. Upload a short test video to verify the library API key and playback.'}
          </p>
        </div>
        <button onClick={() => chooseSection('settings')}>
          Finish setup <span>→</span>
        </button>
      </div>
      <div className="admin-nav-tabs">
        <button
          className={section === 'admin' ? 'selected' : ''}
          onClick={() => chooseSection('admin')}
        >
          <BarChart3 size={16} /> Overview
        </button>
        <button
          className={section === 'uploads' ? 'selected' : ''}
          onClick={() => chooseSection('uploads')}
        >
          <CloudUpload size={16} /> Upload videos
        </button>
        <button
          className={section === 'library' ? 'selected' : ''}
          onClick={() => chooseSection('library')}
        >
          <Film size={16} /> Video library
        </button>
        <button
          className={section === 'settings' ? 'selected' : ''}
          onClick={() => chooseSection('settings')}
        >
          <Settings size={16} /> Settings
        </button>
      </div>
      {section === 'admin' && (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat">
              <span>Total videos</span>
              <strong>{videos.length}</strong>
              <small>
                <Video size={14} /> {videos.length ? 'In your library' : 'No uploads yet'}
              </small>
            </div>
            <div className="admin-stat">
              <span>Storage used</span>
              <strong>0 GB</strong>
              <small>
                <HardDrive size={14} /> Provider not connected
              </small>
            </div>
            <div className="admin-stat">
              <span>Published</span>
              <strong>{videos.length}</strong>
              <small>
                <CheckCircle2 size={14} /> {videos.length ? 'Published videos' : 'Nothing published'}
              </small>
            </div>
            <div className="admin-stat">
              <span>Registered users</span>
              <strong>0</strong>
              <small>
                <Users size={14} /> Optional accounts
              </small>
            </div>
          </div>
          <div className="admin-grid-two">
            <section className="panel-card">
              <div className="panel-title">
                <div>
                  <h2>Quick actions</h2>
                  <p>Manage your video library</p>
                </div>
                <span className="panel-title-icon">
                  <Activity size={18} />
                </span>
              </div>
              <button
                className="quick-action"
                onClick={() => chooseSection('uploads')}
              >
                <span className="quick-icon">
                  <Upload size={18} />
                </span>
                <span>
                  <strong>Upload a video</strong>
                  <small>Add a title, category, and file</small>
                </span>
                <span className="quick-arrow">→</span>
              </button>
              <button
                className="quick-action"
                onClick={() => chooseSection('library')}
              >
                <span className="quick-icon lilac">
                  <Film size={18} />
                </span>
                <span>
                  <strong>Manage library</strong>
                  <small>Edit or remove published content</small>
                </span>
                <span className="quick-arrow">→</span>
              </button>
              <button
                className="quick-action"
                onClick={() => chooseSection('settings')}
              >
                <span className="quick-icon mint">
                  <Settings size={18} />
                </span>
                <span>
                  <strong>Connect services</strong>
                  <small>Configure storage and database</small>
                </span>
                <span className="quick-arrow">→</span>
              </button>
            </section>
            <section className="panel-card">
              <div className="panel-title">
                <div>
                  <h2>Service connections</h2>
                  <p>Required before launch</p>
                </div>
                <span className="connection-state">1 needed</span>
              </div>
              <div className="service-row">
                <span className="service-logo supabase-logo">S</span>
                <div>
                  <strong>Supabase</strong>
                  <small>Authentication & video metadata</small>
                </div>
                <span className="status-label connected">Connected</span>
              </div>
              <div className="service-row">
                <span className="service-logo bunny-logo">b</span>
                <div>
                  <strong>Bunny Stream</strong>
                  <small>Video storage & delivery</small>
                </div>
                <span className="status-label pending">Test upload pending</span>
              </div>
              <div className="service-row">
                <span className="service-logo vercel-logo">▲</span>
                <div>
                  <strong>Hosting</strong>
                  <small>AppDeploy preview deployment</small>
                </div>
                <span className="status-label connected">Running preview</span>
              </div>
            </section>
          </div>
          <section className="panel-card table-panel">
            <div className="panel-title">
              <div>
                <h2>Recent uploads</h2>
                <p>Your latest video activity will appear here</p>
              </div>
              <button
                className="outline-button small-outline"
                onClick={() => chooseSection('library')}
              >
                View library <span>→</span>
              </button>
            </div>
            {videos.length ? <div className="admin-video-list">{videos.slice(0, 5).map(video => <div className="admin-video-row" key={video.id}><div className="mini-empty-icon"><Film size={20} /></div><div><strong>{video.title}</strong><p>{video.description || 'No description'}</p></div><span className="status-label connected">Published</span></div>)}</div> : <div className="admin-empty"><div className="mini-empty-icon"><Film size={22} /></div><strong>No videos uploaded</strong><p>After your first successful upload, video activity will appear here.</p><button className="primary-button" onClick={() => chooseSection('uploads')}><Plus size={16} /> Prepare upload</button></div>}
          </section>
        </>
      )}
      {section === 'uploads' && (
        <div className="upload-layout">
          <section className="panel-card upload-form-panel">
            <div className="panel-title">
              <div>
                <h2>New video</h2>
                <p>Choose a file and enter its details</p>
              </div>
              <span className="required-tag">
                All fields saved after connection
              </span>
            </div>
            <form onSubmit={uploadSubmit}>
              <label className="upload-drop">
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => handleFile(e.target.files?.[0])}
                />
                <span className="upload-cloud">
                  <CloudUpload size={26} />
                </span>
                <strong>
                  {selectedFileName || 'Choose a video from your device'}
                </strong>
                <span>
                  {selectedFileName
                    ? 'Ready for secure upload to Bunny Stream'
                    : 'MP4, MOV, WebM and other browser-supported formats'}
                </span>
                <span className="browse-file">Browse files</span>
                {fileSize && <small>Selected file size: {fileSize}</small>}
              </label>
              <div className="form-field">
                <label htmlFor="video-title">
                  Video title <b>*</b>
                </label>
                <input
                  id="video-title"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Enter a clear title"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="video-category">
                  Category <b>*</b>
                </label>
                <select
                  id="video-category"
                  value={videoCategory}
                  onChange={e => setVideoCategory(e.target.value)}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <small>
                  Categories can be created in settings after database setup.
                </small>
              </div>
              <div className="form-field">
                <label htmlFor="video-description">Description</label>
                <textarea
                  id="video-description"
                  value={videoDescription}
                  onChange={e => setVideoDescription(e.target.value)}
                  placeholder="Add details about this video"
                  rows={4}
                />
              </div>
              <div className="upload-submit-row">
                <span>
                  <LockKeyhole size={15} /> {uploadBusy ? `Uploading… ${uploadProgress}%` : 'Secure, resumable upload'}
                </span>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    !selectedFileName || !videoTitle.trim() || !videoCategory || uploadBusy
                  }
                >
                  {uploadBusy ? `Uploading ${uploadProgress}%` : 'Upload video'} <ArrowDownToLine size={16} />
                </button>
              </div>
            </form>
          </section>
          <aside className="upload-side">
            <section className="panel-card">
              <div className="panel-title">
                <div>
                  <h2>Before you upload</h2>
                  <p>Required connections</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-empty" />
                <div>
                  <strong>Supabase</strong>
                  <small>Database and admin permissions</small>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-empty" />
                <div>
                  <strong>Bunny Stream</strong>
                  <small>Video library and upload API</small>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-empty" />
                <div>
                  <strong>Server-side credentials</strong>
                  <small>Keep API keys out of browser code</small>
                </div>
              </div>
              <button
                className="outline-button full-button"
                onClick={() => chooseSection('settings')}
              >
                Configure connections
              </button>
            </section>
            <div className="upload-tip">
              <ShieldCheck size={19} />
              <div>
                <strong>Private by design</strong>
                <p>
                  Video API credentials must be stored server-side. Never commit
                  secret keys to GitHub.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
      {section === 'library' && (
        <section className="panel-card table-panel">
          <div className="panel-title">
            <div>
              <h2>All videos</h2>
              <p>Manage your uploaded content</p>
            </div>
            <button
              className="primary-button"
              onClick={() => chooseSection('uploads')}
            >
              <Plus size={16} /> Upload video
            </button>
          </div>
          {videos.length ? <div className="admin-video-list">{videos.map(video => <div className="admin-video-row" key={video.id}><div className="mini-empty-icon"><Film size={20} /></div><div><strong>{video.title}</strong><p>{video.description || 'No description'}</p><small>{video.bunny_video_id ? 'Bunny Stream video' : 'Video record'}</small></div><span className="status-label connected">Published</span></div>)}</div> : <div className="admin-empty"><div className="mini-empty-icon"><Film size={22} /></div><strong>Your library is empty</strong><p>No demo videos are included. Your own uploads will appear here after a successful upload.</p></div>}
        </section>
      )}
      {section === 'settings' && (
        <div className="settings-stack">
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <h2>Connect your services</h2>
                <p>Setup checklist for your production website</p>
              </div>
              <span className="connection-state">Setup required</span>
            </div>
            <div className="settings-connection">
              <div className="settings-service-icon supabase-logo">S</div>
              <div className="settings-service-body">
                <h3>Supabase</h3>
                <p>
                  Supabase database and administrator authentication are connected. Row Level Security limits video management to the allowlisted administrator.
                </p>
                <span className="status-label connected">Connected</span>
              </div>
              <div className="settings-step">01</div>
            </div>
            <div className="settings-connection">
              <div className="settings-service-icon bunny-logo">b</div>
              <div className="settings-service-body">
                <h3>Bunny Stream</h3>
                <p>
                  The upload endpoint is deployed with server-side credentials. A test upload will confirm that the library ID and API key are valid.
                </p>
                <span className="status-label pending">Test upload pending</span>
              </div>
              <div className="settings-step">02</div>
            </div>
            <div className="settings-connection">
              <div className="settings-service-icon vercel-logo">▲</div>
              <div className="settings-service-body">
                <h3>Production deployment</h3>
                <p>
                  The GitHub repository is connected to Vercel. The latest Nightstream changes are being deployed to the production project.
                </p>
                <span className="status-label pending">Next step</span>
              </div>
              <div className="settings-step">03</div>
            </div>
          </section>
          <section className="panel-card policy-panel">
            <div className="panel-title">
              <div>
                <h2>Safety and access</h2>
                <p>Required checks before public launch</p>
              </div>
              <ShieldAlert size={19} />
            </div>
            <ul>
              <li>
                Use robust age assurance where required; a click-through
                declaration may not be sufficient.
              </li>
              <li>
                Publish clear consent, rights, and content-removal policies.
              </li>
              <li>
                Only upload lawful content featuring consenting adults, and
                remove content reported as non-consensual or unlawful.
              </li>
              <li>
                Confirm your storage and streaming providers permit your
                intended content before uploading.
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
