import { useEffect, useState } from 'react';
import axios from 'axios';
import { AuthModal } from './components/AuthModal.js';
import { ApplicationForm } from './components/ApplicationForm.js';
import { ReviewerDashboard } from './components/ReviewerDashboard.js';
import { MinisterDashboard } from './components/MinisterDashboard.js';
import { AdminPanel } from './components/AdminPanel.js';
import { UserApplications } from './components/UserApplications.js';
import { NavigationTabs } from './components/NavigationTabs.js';
import { PasswordChangeModal } from './components/PasswordChangeModal.js';
import { SetupWizard } from './components/SetupWizard.js';
import { ForgotPassword } from './components/ForgotPassword.js';
import { ResetPassword } from './components/ResetPassword.js';
import type { AppUser, TravelApplication } from './types.js';
import { api } from './lib/api.js';

type Tab = 'application' | 'my-applications' | 'reviewer' | 'minister' | 'admin';

const upsertById = (list: TravelApplication[], next: TravelApplication) => {
  const remaining = list.filter((item) => item.id !== next.id);
  return [next, ...remaining];
};

const App = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [active, setActive] = useState<Tab>('application');
  const [applications, setApplications] = useState<TravelApplication[]>([]);
  const [reviewQueue, setReviewQueue] = useState<TravelApplication[]>([]);
  const [ministerQueue, setMinisterQueue] = useState<TravelApplication[]>([]);
  const [archivedApplications, setArchivedApplications] = useState<TravelApplication[]>([]);
  const [tokens, setTokens] = useState<{ accessToken: string; refreshToken: string } | null>(() => {
    try {
      const stored = localStorage.getItem('authTokens');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [sessionRestoring, setSessionRestoring] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [view, setView] = useState<'main' | 'setup' | 'forgot-password' | 'reset-password'>('main');
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Check for reset token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setView('reset-password');
    }
  }, []);

  // Check system setup status
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { data } = await api.get('/setup/status');
        if (data.isSetupRequired) {
          setIsSetupRequired(true);
          setView('setup');
        }
      } catch (error) {
        console.error('Failed to check setup status:', error);
      }
    };
    checkSetup();
  }, []);

  // Restore user session from localStorage on mount (only once)
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const stored = localStorage.getItem('authTokens');
        if (!stored) {
          return;
        }

        const storedTokens = JSON.parse(stored);
        if (!storedTokens?.accessToken && !storedTokens?.refreshToken) {
          return;
        }

        const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
        const apiBase = baseURL === '/' ? '/api' : `${baseURL}/api`;

        if (storedTokens.accessToken) {
          try {
            const { data } = await api.get('/auth/me');

            if (isMounted) {
              setUser(data.user);
              setTokens(storedTokens);
              api.defaults.headers.common.Authorization = `Bearer ${storedTokens.accessToken}`;
            }
            return;
          } catch (error: any) {
            // Access token expired, will try refresh below
          }
        }

        if (storedTokens.refreshToken) {
          try {
            const refreshResponse = await axios.post(`${apiBase}/auth/refresh`, {
              refreshToken: storedTokens.refreshToken,
            }, {
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!refreshResponse.data?.tokens?.accessToken) {
              throw new Error('Invalid refresh response: missing access token');
            }

            const newTokens = {
              accessToken: refreshResponse.data.tokens.accessToken,
              refreshToken: refreshResponse.data.tokens.refreshToken,
            };

            localStorage.setItem('authTokens', JSON.stringify(newTokens));

            api.defaults.headers.common.Authorization = `Bearer ${newTokens.accessToken}`;
            const userResponse = await api.get('/auth/me');

            if (isMounted) {
              setTokens(newTokens);
              setUser(userResponse.data.user);
            }
          } catch (refreshError: any) {
            if (isMounted) {
              localStorage.removeItem('authTokens');
              setTokens(null);
            }
          }
        } else {
          if (isMounted) {
            localStorage.removeItem('authTokens');
            setTokens(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          localStorage.removeItem('authTokens');
          setTokens(null);
        }
      }
    };

    restoreSession().finally(() => {
      if (isMounted) {
        setSessionRestoring(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !tokens) return;
    api.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;

    // Default to Minister dashboard if user is a Minister
    if (user.roles.includes('MINISTER') && !user.roles.includes('ADMIN') && active === 'application') {
      setActive('minister');
    }

    const load = async () => {
      try {
        const { data } = await api.get('/applications');
        if (data.applications && data.applications.length > 0) {
          setApplications(data.applications);
        } else {
          setApplications([]);
        }
      } catch (error) {
        setApplications([]);
      }
    };
    load();
  }, [user, tokens]);

  const loadReviewerQueue = async () => {
    try {
      const { data } = await api.get('/reviewer/queue');
      setReviewQueue(data.queue);
    } catch (error) {
      console.warn('Unable to load reviewer queue');
    }
  };

  const loadArchivedApplications = async () => {
    try {
      const { data } = await api.get('/reviewer/archived');
      setArchivedApplications(data.applications);
    } catch (error) {
      console.warn('Unable to load archived applications');
    }
  };

  const loadMinisterQueue = async () => {
    try {
      const { data } = await api.get('/minister/queue');
      setMinisterQueue(data.queue);
    } catch (error) {
      console.warn('Unable to load minister queue');
    }
  };

  const handleCreateApplication = async (payload: Partial<TravelApplication>) => {
    if (!user) throw new Error('unauthenticated');
    try {
      const { data } = await api.post('/applications', payload);
      setApplications((prev) => upsertById(prev, data.application));
    } catch (error) {
      // Fallback for offline/demo mode if needed, but mainly we want real backend now
      console.error("Failed to create application", error);
    }
  };

  const handleSubmitApplication = async (payload: Partial<TravelApplication>) => {
    if (!user) throw new Error('unauthenticated');
    try {
      const { data } = await api.post('/applications', payload);
      const submittedApp = data.application;

      setApplications((prev) => upsertById(prev, submittedApp));

      const refreshApplications = async () => {
        try {
          const { data: refreshData } = await api.get('/applications');
          if (refreshData.applications && refreshData.applications.length > 0) {
            setApplications(refreshData.applications);
          }
        } catch (error) {
          console.error('[App] Failed to refresh applications:', error);
        }
      };

      refreshApplications();
      setTimeout(refreshApplications, 500);

      return { application: submittedApp };
    } catch (error) {
      console.error('Failed to submit application:', error);
      throw error;
    }
  };

  const showReviewer = user?.roles.includes('REVIEWER') || user?.roles.includes('ADMIN');
  const showMinister = user?.roles.includes('MINISTER') || user?.roles.includes('ADMIN');
  const showAdmin = user?.roles.includes('ADMIN');

  useEffect(() => {
    if (!showReviewer || !tokens) return;
    loadReviewerQueue();
    loadArchivedApplications();
  }, [showReviewer, tokens]);

  useEffect(() => {
    if (!showMinister || !tokens) return;
    loadMinisterQueue();
  }, [showMinister, tokens]);

  if (view === 'setup') {
    return <SetupWizard onComplete={() => {
      setIsSetupRequired(false);
      setView('main');
      window.location.reload(); // Reload to clear any stale state and show login
    }} />;
  }

  if (view === 'reset-password' && resetToken) {
    return <ResetPassword token={resetToken} onComplete={() => {
      setView('main');
      setResetToken(null);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }} />;
  }

  if (view === 'forgot-password') {
    return <ForgotPassword onBack={() => setView('main')} />;
  }

  return (
    <div className="relative p-4 md:p-8 min-h-screen">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
      </div>
      {sessionRestoring && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Restoring session...</p>
          </div>
        </div>
      )}
      {!sessionRestoring && !user && (
        <AuthModal
          onAuthenticated={(authenticatedUser, authTokens) => {
            localStorage.setItem('authTokens', JSON.stringify(authTokens));
            api.defaults.headers.common.Authorization = `Bearer ${authTokens.accessToken}`;
            setTokens(authTokens);
            setUser(authenticatedUser);
            setSessionRestoring(false);
          }}
          onForgotPassword={() => setView('forgot-password')}
        />
      )}
      {user?.mustChangePassword && (
        <PasswordChangeModal
          onPasswordChanged={async () => {
            try {
              const { data } = await api.get('/auth/me');
              setUser(data.user);
            } catch (error) {
              console.error('Failed to reload user data');
            }
          }}
        />
      )}
      {!sessionRestoring && user && (
        <div className="relative max-w-7xl mx-auto app-shell rounded-2xl overflow-hidden reveal">
          <header className="app-header p-6 sm:p-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200 font-semibold">Nauru Government</p>
              <h1 className="text-3xl sm:text-4xl font-display text-white">Nauru Travel Application</h1>
              <p className="text-sm text-emerald-100/90 mt-2">Review, approve, and track travel in one workspace.</p>
            </div>
            {user && (
              <div className="flex items-center gap-4 text-white">
                <span>
                  {user.firstName} {user.lastName}
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    localStorage.removeItem('authTokens');
                    setTokens(null);
                    setUser(null);
                    setApplications([]);
                    delete api.defaults.headers.common.Authorization;
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </header>
          <NavigationTabs
            active={active}
            reviewerQueueCount={reviewQueue.length}
            ministerQueueCount={ministerQueue.length}
            showReviewer={showReviewer}
            showMinister={showMinister}
            showAdmin={showAdmin}
            hideApplicationTabs={showMinister && !showAdmin}
            onChange={(tab) => {
              setActive(tab);
              if (tab === 'my-applications' && user) {
                setTimeout(async () => {
                  try {
                    const { data } = await api.get('/applications');
                    setApplications(data.applications || []);
                  } catch (error) {
                    console.error('Failed to refresh applications:', error);
                  }
                }, 100);
              }
            }} />
          <main className="p-6 md:p-10 bg-white/70">
            {active === 'application' && (
              <ApplicationForm
                applications={applications}
                user={user}
                onCreate={handleCreateApplication}
                onSubmit={handleSubmitApplication}
                onNavigateToApplications={() => setActive('my-applications')}
              />
            )}
            {active === 'my-applications' && user && (
              <UserApplications
                key={`${user.id}-${active}`}
                user={user}
              />
            )}
            {active === 'reviewer' && showReviewer && (
              <ReviewerDashboard
                queue={reviewQueue}
                archived={archivedApplications}
                onRefresh={() => {
                  loadReviewerQueue();
                  loadArchivedApplications();
                }}
              />
            )}
            {active === 'reviewer' && !showReviewer && (
              <p className="text-sm text-slate-500">Reviewer access required for this tab.</p>
            )}
            {active === 'minister' && showMinister && (
              <MinisterDashboard
                onRefresh={() => {
                  loadMinisterQueue();
                }}
              />
            )}
            {active === 'minister' && !showMinister && (
              <p className="text-sm text-slate-500">Minister access required for this tab.</p>
            )}
            {active === 'admin' && showAdmin && <AdminPanel />}
            {active === 'admin' && !showAdmin && (
              <p className="text-sm text-slate-500">Admin privileges required for this tab.</p>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
