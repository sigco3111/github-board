import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';

export type TabType = 'overview' | 'repositories' | 'projects';

interface UseTabNavigationResult {
  activeTab: TabType;
  navigateToTab: (tab: TabType) => void;
}

export const useTabNavigation = (username: string): UseTabNavigationResult => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  // Determine active tab from URL parameter, default to 'overview'
  const activeTab: TabType = (() => {
    if (tab === 'repositories' || tab === 'projects') {
      return tab;
    }
    return 'overview';
  })();

  const navigateToTab = useCallback((newTab: TabType) => {
    if (newTab === 'overview') {
      // For overview tab, navigate to /:username (without tab parameter)
      navigate(`/${username}`);
    } else {
      // For other tabs, navigate to /:username/:tab
      navigate(`/${username}/${newTab}`);
    }
  }, [navigate, username]);

  return {
    activeTab,
    navigateToTab
  };
};