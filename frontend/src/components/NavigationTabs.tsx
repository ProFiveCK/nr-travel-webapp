import clsx from 'clsx';

type Tab = 'application' | 'my-applications' | 'reviewer' | 'minister' | 'admin';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  reviewerQueueCount?: number;
  ministerQueueCount?: number;
  showReviewer?: boolean;
  showMinister?: boolean;
  showAdmin?: boolean;
  hideApplicationTabs?: boolean;
}

const labels: Record<Tab, string> = {
  application: '✈️ Application Form',
  'my-applications': '📋 My Applications',
  reviewer: '✅ Reviewer Dashboard',
  minister: '👔 Minister Dashboard',
  admin: '⚙️ Admin Panel',
};

export const NavigationTabs = ({
  active,
  onChange,
  reviewerQueueCount = 0,
  ministerQueueCount = 0,
  showReviewer = false,
  showMinister = false,
  showAdmin = false,
  hideApplicationTabs = false,
}: Props) => {
  // Filter tabs based on user roles
  const availableTabs = (Object.keys(labels) as Tab[]).filter((tab) => {
    if (hideApplicationTabs && (tab === 'application' || tab === 'my-applications')) return false;
    if (tab === 'reviewer') return showReviewer;
    if (tab === 'minister') return showMinister;
    if (tab === 'admin') return showAdmin;
    return true; // 'application' and 'my-applications' always available (unless hidden)
  });

  return (
    <nav className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl">
      {availableTabs.map((tab) => (
        <button
          key={tab}
          className={clsx('tab-button flex-1 text-center', {
            'tab-active bg-white text-orange-600 border-b-4 border-orange-500': active === tab,
            'tab-inactive text-slate-500 hover:text-orange-500': active !== tab,
          })}
          onClick={() => onChange(tab)}
        >
          <span className="flex items-center justify-center gap-2">
            {labels[tab]}
            {tab === 'reviewer' && reviewerQueueCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold rounded-full h-5 px-2 flex items-center justify-center shadow-md">
                {reviewerQueueCount}
              </span>
            )}
            {tab === 'minister' && ministerQueueCount > 0 && (
              <span className="bg-purple-500 text-white text-xs font-bold rounded-full h-5 px-2 flex items-center justify-center shadow-md">
                {ministerQueueCount}
              </span>
            )}
          </span>
        </button>
      ))}
    </nav>
  );
};
