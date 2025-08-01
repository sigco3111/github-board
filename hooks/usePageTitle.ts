import { useEffect } from 'react';

interface UsePageTitleOptions {
  username?: string;
  displayName?: string;
  tab?: string;
  loading?: boolean;
}

const TAB_NAMES: Record<string, string> = {
  'overview': '개요',
  'repositories': '저장소', 
  'projects': '프로젝트'
};

export const usePageTitle = ({ username, displayName, tab, loading }: UsePageTitleOptions) => {
  useEffect(() => {
    if (loading) {
      document.title = username ? `${username} 로딩 중... | GitHub 대시보드` : 'GitHub 대시보드';
      return;
    }

    if (displayName && username) {
      const currentTab = tab && TAB_NAMES[tab] ? TAB_NAMES[tab] : '개요';
      document.title = `${displayName} - ${currentTab} | GitHub 대시보드`;
    } else if (username) {
      document.title = `${username} | GitHub 대시보드`;
    } else {
      document.title = 'GitHub 대시보드';
    }
  }, [username, displayName, tab, loading]);
};