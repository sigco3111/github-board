import { useState, useEffect, useCallback } from 'react';
import type { GitHubUser, GitHubRepo, GitHubProject, GitHubFollower, GitHubFollowing } from '../types';
import { getUser, getRepos, getProjects, getFollowers, getFollowing } from '../services/githubService';

interface UseUserDataResult {
  user: GitHubUser | null;
  repos: GitHubRepo[];
  projects: GitHubProject[];
  followers: GitHubFollower[];
  following: GitHubFollowing[];
  loading: boolean;
  reposLoading: boolean; // 저장소 데이터 로딩 상태를 별도로 추적
  followersLoading: boolean; // 팔로워 데이터 로딩 상태
  followingLoading: boolean; // 팔로잉 데이터 로딩 상태
  error: string | null;
  refetch: () => void;
  fetchFollowers: (force?: boolean) => Promise<void>;
  fetchFollowing: (force?: boolean) => Promise<void>;
}

// Simple cache for user data to avoid unnecessary API calls
const userDataCache = new Map<string, {
  user: GitHubUser;
  repos: GitHubRepo[];
  projects: GitHubProject[];
  followers?: GitHubFollower[];
  following?: GitHubFollowing[];
  followersTimestamp?: number;
  followingTimestamp?: number;
  timestamp: number;
}>();

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (기존 5분에서 15분으로 증가)

export const useUserData = (username: string): UseUserDataResult => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [projects, setProjects] = useState<GitHubProject[]>([]);
  const [followers, setFollowers] = useState<GitHubFollower[]>([]);
  const [following, setFollowing] = useState<GitHubFollowing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [reposLoading, setReposLoading] = useState<boolean>(false); // 저장소 데이터 로딩 상태 추가
  const [followersLoading, setFollowersLoading] = useState<boolean>(false); // 팔로워 데이터 로딩 상태
  const [followingLoading, setFollowingLoading] = useState<boolean>(false); // 팔로잉 데이터 로딩 상태
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async (usernameToFetch: string, forceRefresh = false) => {
    if (!usernameToFetch.trim()) {
      setUser(null);
      setRepos([]);
      setProjects([]);
      setFollowers([]);
      setFollowing([]);
      setError(null);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = userDataCache.get(usernameToFetch.toLowerCase());
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setUser(cached.user);
        setRepos(cached.repos);
        setProjects(cached.projects);
        
        // 캐시된 팔로워/팔로잉 데이터가 있으면 설정 (선택적으로 로드)
        if (cached.followers) setFollowers(cached.followers);
        if (cached.following) setFollowing(cached.following);
        
        setError(null);
        setLoading(false);
        setReposLoading(false);
        return;
      }
    }

    setLoading(true);
    setReposLoading(true); // 저장소 데이터 로딩 상태 설정
    setError(null);

    try {
      // Fetch user data first to validate username exists
      const userData = await getUser(usernameToFetch);
      setUser(userData);

      // Fetch projects (projects API might fail for some users)
      try {
        const projectsData = await getProjects(usernameToFetch);
        setProjects(projectsData);
      } catch (projErr) {
        console.warn('Projects API error:', projErr);
        setProjects([]);
      }

      // 저장소 데이터를 별도로 가져옵니다 (페이징 처리 포함)
      try {
        const reposResult = await getRepos(usernameToFetch);
        setRepos(reposResult);
        
        // Cache the successful result
        userDataCache.set(usernameToFetch.toLowerCase(), {
          user: userData,
          repos: reposResult,
          projects: projects,
          timestamp: Date.now()
        });
      } catch (repoErr) {
        console.error('Repository fetch error:', repoErr);
        setRepos([]);
        
        if (repoErr instanceof Error) {
          if (repoErr.message.includes('rate limit') || repoErr.message.includes('403')) {
            setError('GitHub API 요청 한도에 도달했습니다. 저장소 목록이 일부만 표시될 수 있습니다.');
          }
        }
      } finally {
        setReposLoading(false); // 저장소 로딩 완료
      }

    } catch (err) {
      console.error('Error fetching user data:', err);
      
      if (err instanceof Error) {
        // Handle specific error cases
        if (err.message.includes('Not Found') || err.message.includes('404')) {
          setError(`사용자 '${usernameToFetch}'를 찾을 수 없습니다. 올바른 사용자명을 입력했는지 확인해주세요.`);
        } else if (err.message.includes('rate limit') || err.message.includes('403')) {
          setError('GitHub API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
        } else if (err.message.includes('Network Error') || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
          setError('네트워크 연결을 확인하고 다시 시도해주세요.');
        } else if (err.message.includes('timeout')) {
          setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
        } else if (err.message.includes('500') || err.message.includes('502') || err.message.includes('503')) {
          setError('GitHub 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError(`사용자 데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`);
        }
      } else {
        setError('알 수 없는 오류가 발생했습니다. 다시 시도해주세요.');
      }

      // Clear data on error
      setUser(null);
      setRepos([]);
      setProjects([]);
      setFollowers([]);
      setFollowing([]);
    } finally {
      setLoading(false);
      setReposLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (username) {
      fetchUserData(username, true); // Force refresh
    }
  }, [username]);

  // Effect to fetch data when username changes
  useEffect(() => {
    fetchUserData(username);
  }, [username]);

  // 팔로워 데이터를 가져오는 함수
  const fetchFollowers = useCallback(async (force = false): Promise<void> => {
    if (!username.trim()) return;

    // 캐시 확인
    if (!force) {
      const cached = userDataCache.get(username.toLowerCase());
      if (cached?.followers && cached?.followersTimestamp && 
          Date.now() - cached.followersTimestamp < CACHE_DURATION) {
        setFollowers(cached.followers);
        return;
      }
    }

    try {
      setFollowersLoading(true);
      const followersData = await getFollowers(username);
      setFollowers(followersData);

      // 캐시 업데이트
      const cached = userDataCache.get(username.toLowerCase());
      if (cached) {
        userDataCache.set(username.toLowerCase(), {
          ...cached,
          followers: followersData,
          followersTimestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('팔로워 데이터 가져오기 오류:', err);
      if (err instanceof Error && err.message.includes('rate limit')) {
        setError('GitHub API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setFollowersLoading(false);
    }
  }, [username]);

  // 팔로잉 데이터를 가져오는 함수
  const fetchFollowing = useCallback(async (force = false): Promise<void> => {
    if (!username.trim()) return;

    // 캐시 확인
    if (!force) {
      const cached = userDataCache.get(username.toLowerCase());
      if (cached?.following && cached?.followingTimestamp && 
          Date.now() - cached.followingTimestamp < CACHE_DURATION) {
        setFollowing(cached.following);
        return;
      }
    }

    try {
      setFollowingLoading(true);
      const followingData = await getFollowing(username);
      setFollowing(followingData);

      // 캐시 업데이트
      const cached = userDataCache.get(username.toLowerCase());
      if (cached) {
        userDataCache.set(username.toLowerCase(), {
          ...cached,
          following: followingData,
          followingTimestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('팔로잉 데이터 가져오기 오류:', err);
      if (err instanceof Error && err.message.includes('rate limit')) {
        setError('GitHub API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setFollowingLoading(false);
    }
  }, [username]);

  return {
    user,
    repos,
    projects,
    followers,
    following,
    loading,
    reposLoading,
    followersLoading,
    followingLoading,
    error,
    refetch,
    fetchFollowers,
    fetchFollowing
  };
};