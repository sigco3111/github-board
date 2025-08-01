
import type { GitHubUser, GitHubRepo, GitHubProject, GitHubCommit, GitHubContributor, GitHubFollower, GitHubFollowing } from '../types';

const API_BASE_URL = 'https://api.github.com';

// Simple in-memory cache for API promises
const cache = new Map<string, Promise<any>>();

const cachedRequest = (url: string, options?: RequestInit): Promise<any> => {
  const cacheKey = JSON.stringify({ url, options });

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!.catch(error => {
      // 캐시된 요청이 실패하면 캐시에서 제거하고 새로운 요청 시도
      console.warn('Cached request failed, retrying:', error);
      cache.delete(cacheKey);
      // 재귀적으로 다시 시도하되 무한 루프를 방지하기 위한 지연 추가
      return new Promise(resolve => setTimeout(() => resolve(cachedRequest(url, options)), 500));
    });
  }

  const promise = fetch(url, options)
    .then(async (response) => {
      if (response.status === 204) { // No Content
        return [];
      }
      if (!response.ok) {
        // On failure, remove from cache to allow retries
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP Error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      // 오류 발생 시 캐시에서 제거
      cache.delete(cacheKey);
      console.error(`API Request failed for ${url}:`, error);
      throw new Error(`요청 실패: ${error.message || '네트워크 오류'}`);
    });

  cache.set(cacheKey, promise);
  return promise;
};


export const getUser = async (username: string): Promise<GitHubUser> => {
  return cachedRequest(`${API_BASE_URL}/users/${username}`);
};

// 사용자의 모든 저장소를 페이징 처리하여 가져오는 함수
export const getRepos = async (username: string): Promise<GitHubRepo[]> => {
  // 페이지 번호와 한 페이지당 항목 수 설정
  let page = 1;
  const per_page = 100;  // GitHub API 최대 제한
  let allRepos: GitHubRepo[] = [];
  let hasNextPage = true;

  try {
    // 모든 페이지를 가져올 때까지 반복
    while (hasNextPage) {
      // 캐시키를 페이지별로 구분하기 위해 직접 URL 생성
      const url = `${API_BASE_URL}/users/${username}/repos?per_page=${per_page}&page=${page}&sort=pushed`;
      const repos = await cachedRequest(url);
      
      if (repos.length > 0) {
        allRepos = [...allRepos, ...repos];
        // 가져온 항목이 per_page보다 적으면 마지막 페이지
        hasNextPage = repos.length === per_page;
        page++;
      } else {
        hasNextPage = false;
      }
    }
    
    return allRepos;
  } catch (error) {
    console.error('저장소 가져오기 오류:', error);
    throw error;
  }
};

export const getProjects = async (username:string): Promise<GitHubProject[]> => {
    return cachedRequest(`${API_BASE_URL}/users/${username}/projects`, {
        headers: {
            'Accept': 'application/vnd.github.inertia-preview+json',
        },
    });
};

export const getCommits = async (fullName: string): Promise<GitHubCommit[]> => {
  return cachedRequest(`${API_BASE_URL}/repos/${fullName}/commits?per_page=5`);
};

export const getContributors = async (fullName: string): Promise<GitHubContributor[]> => {
  return cachedRequest(`${API_BASE_URL}/repos/${fullName}/contributors`);
};

// 사용자의 팔로워 목록을 페이징 처리하여 가져오는 함수
export const getFollowers = async (username: string, limit: number = 100): Promise<GitHubFollower[]> => {
  let page = 1;
  const per_page = 100;  // GitHub API 최대 제한
  let allFollowers: GitHubFollower[] = [];
  let hasNextPage = true;
  
  try {
    // 지정한 제한까지 또는 모든 페이지를 가져올 때까지 반복
    while (hasNextPage && (allFollowers.length < limit || limit === 0)) {
      const url = `${API_BASE_URL}/users/${username}/followers?per_page=${per_page}&page=${page}`;
      const followers = await cachedRequest(url);
      
      if (followers.length > 0) {
        // 제한이 있으면 필요한 만큼만 추가
        if (limit > 0 && allFollowers.length + followers.length > limit) {
          const neededCount = limit - allFollowers.length;
          allFollowers = [...allFollowers, ...followers.slice(0, neededCount)];
          hasNextPage = false; // 제한에 도달했으므로 중단
        } else {
          allFollowers = [...allFollowers, ...followers];
          // 가져온 항목이 per_page보다 적으면 마지막 페이지
          hasNextPage = followers.length === per_page;
          page++;
        }
      } else {
        hasNextPage = false;
      }
    }
    
    return allFollowers;
  } catch (error) {
    console.error('팔로워 가져오기 오류:', error);
    throw error;
  }
};

// 사용자가 팔로우하는 사용자 목록을 페이징 처리하여 가져오는 함수
export const getFollowing = async (username: string, limit: number = 100): Promise<GitHubFollowing[]> => {
  let page = 1;
  const per_page = 100;  // GitHub API 최대 제한
  let allFollowing: GitHubFollowing[] = [];
  let hasNextPage = true;
  
  try {
    // 지정한 제한까지 또는 모든 페이지를 가져올 때까지 반복
    while (hasNextPage && (allFollowing.length < limit || limit === 0)) {
      const url = `${API_BASE_URL}/users/${username}/following?per_page=${per_page}&page=${page}`;
      const following = await cachedRequest(url);
      
      if (following.length > 0) {
        // 제한이 있으면 필요한 만큼만 추가
        if (limit > 0 && allFollowing.length + following.length > limit) {
          const neededCount = limit - allFollowing.length;
          allFollowing = [...allFollowing, ...following.slice(0, neededCount)];
          hasNextPage = false; // 제한에 도달했으므로 중단
        } else {
          allFollowing = [...allFollowing, ...following];
          // 가져온 항목이 per_page보다 적으면 마지막 페이지
          hasNextPage = following.length === per_page;
          page++;
        }
      } else {
        hasNextPage = false;
      }
    }
    
    return allFollowing;
  } catch (error) {
    console.error('팔로잉 가져오기 오류:', error);
    throw error;
  }
};
