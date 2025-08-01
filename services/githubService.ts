
import type { GitHubUser, GitHubRepo, GitHubProject, GitHubCommit, GitHubContributor, GitHubFollower, GitHubFollowing } from '../types';

// 프록시 서버를 통해 GitHub API 호출
const API_BASE_URL = '/api/github';

// GitHub 개인 액세스 토큰 (PAT)
// 실제 사용 시에는 환경 변수나 안전한 방법으로 관리해야 합니다
let GITHUB_TOKEN = '';

/**
 * GitHub 개인 액세스 토큰 설정
 * @param token 사용자의 GitHub 개인 액세스 토큰
 */
export const setGitHubToken = (token: string) => {
  if (!token || token.trim() === '') {
    console.error('유효하지 않은 토큰입니다. 토큰이 비어 있습니다.');
    return;
  }
  
  // 토큰 형식 검증 (간단한 검증)
  const tokenRegex = /^(ghp_|github_pat_)[a-zA-Z0-9_-]{10,}/;
  if (!tokenRegex.test(token)) {
    console.warn('토큰 형식이 일반적인 GitHub 토큰 형식과 다릅니다. (ghp_ 또는 github_pat_ 접두사 없음)');
  }
  
  console.log(`토큰 설정 (길이: ${token.length}, 접두사: ${token.substring(0, 4)}...)`);
  
  // 토큰 설정
  GITHUB_TOKEN = token;
  console.log('GitHub 토큰이 설정되었습니다.');
  
  // 모든 API 관련 변수 초기화
  forbiddenErrorCount = 0;
  lastForbiddenErrorTime = 0;
  remainingRequests = 5000; // 인증된 사용자는 5000개 요청 가능
  resetTime = Date.now() + 3600000;
  
  // 토큰 설정 후 캐시 초기화
  cache.clear();
  console.log('API 캐시가 초기화되었습니다.');
  
  // 테스트 요청으로 토큰 유효성 확인
  fetch(`${API_BASE_URL}/rate_limit`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'User-Agent': 'GitHub-Dashboard-App/1.0',
      'Accept': 'application/vnd.github.v3+json'
    }
  })
  .then(async response => {
    if (response.ok) {
      const data = await response.json();
      console.log('토큰 유효성 확인 성공:', data.resources.core);
      console.log(`시간당 최대 요청 수: ${data.resources.core.limit}`);
      console.log(`남은 요청 수: ${data.resources.core.remaining}`);
      
      remainingRequests = data.resources.core.remaining;
      resetTime = data.resources.core.reset * 1000;
      
      // 결과 알림 (로그로만 출력)
      if (data.resources.core.limit >= 5000) {
        console.log('✅ 토큰이 성공적으로 적용되었습니다. 이제 시간당 최대 5,000개의 요청을 할 수 있습니다.');
      } else {
        console.warn('⚠️ 토큰이 적용되었지만, 요청 한도가 예상보다 낮습니다:', data.resources.core.limit);
      }
    } else {
      const errorText = await response.text();
      console.error('토큰 유효성 확인 실패:', response.status, errorText);
    }
  })
  .catch(error => {
    console.error('토큰 유효성 확인 중 오류 발생:', error);
  });
};

// Simple in-memory cache for API promises
const cache = new Map<string, Promise<any>>();

// 캐시 만료 시간 (밀리초)
const CACHE_EXPIRY = 30 * 60 * 1000; // 30분

// 캐시 정리 함수 - 오래된 캐시 항목 제거
const cleanupCache = () => {
  const now = Date.now();
  const cacheEntries = Array.from(cache.entries());
  
  // 만료된 캐시 항목 제거
  for (const [key, promise] of cacheEntries) {
    // 프로미스가 이미 해결되었고 30분 이상 경과한 항목 제거
    promise.then(
      result => {
        if (result && result._timestamp && now - result._timestamp > CACHE_EXPIRY) {
          cache.delete(key);
        }
      },
      () => cache.delete(key) // 에러가 발생한 프로미스는 항상 제거
    ).catch(() => {});
  }
};

// 주기적으로 캐시 정리 (5분마다)
setInterval(cleanupCache, 5 * 60 * 1000);

// API 요청 대기열과 속도 제한 관리를 위한 변수들
let requestQueue: (() => void)[] = [];
let isProcessingQueue = false;
const REQUEST_DELAY = 1000; // GitHub API 요청 간 지연 시간 증가 (API 속도 제한 오류 방지)
let remainingRequests = 60; // GitHub API 기본 제한 값
let resetTime = Date.now() + 3600000; // 기본 리셋 시간 (1시간)

// 403 오류 관련 변수
let forbiddenErrorCount = 0;
const MAX_FORBIDDEN_ERRORS = 3; // 최대 허용 오류 횟수 감소
let lastForbiddenErrorTime = 0;
const FORBIDDEN_COOLDOWN = 60000; // 60초 동안 API 요청 중단 (오류 방지를 위해 증가)

/**
 * API 요청 대기열을 처리하는 함수
 * 요청을 순차적으로 처리하여 속도 제한 오류를 방지
 */
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  // 403 Forbidden 에러가 MAX_FORBIDDEN_ERRORS 이상 발생했고 
  // 마지막 에러 발생 후 FORBIDDEN_COOLDOWN 시간이 지나지 않았으면 요청 처리 중단
  if (forbiddenErrorCount >= MAX_FORBIDDEN_ERRORS && 
      Date.now() - lastForbiddenErrorTime < FORBIDDEN_COOLDOWN) {
    console.warn(`403 Forbidden 에러가 너무 많이 발생했습니다. ${Math.ceil((FORBIDDEN_COOLDOWN - (Date.now() - lastForbiddenErrorTime)) / 1000)}초 후 재시도합니다.`);
    
    // 일정 시간 후 큐 처리 재개
    setTimeout(() => {
      isProcessingQueue = false;
      processQueue();
    }, FORBIDDEN_COOLDOWN - (Date.now() - lastForbiddenErrorTime));
    
    return;
  }
  
  // 현재 시간이 리셋 시간을 지났으면 제한 카운터 초기화
  if (Date.now() > resetTime) {
    remainingRequests = 60;
    resetTime = Date.now() + 3600000;
    // 리셋 시간이 지나면 Forbidden 에러 카운트도 초기화
    forbiddenErrorCount = 0;
  }
  
  // 남은 요청 수나 Forbidden 에러 횟수에 따라 지연 시간 동적 조정 (안정성 강화)
  let delay = REQUEST_DELAY;
  
  if (remainingRequests <= 5) {
    delay = REQUEST_DELAY * 4; // 매우 적은 요청 남음 (API 속도 제한 방지를 위해 증가)
  } else if (remainingRequests <= 15) {
    delay = REQUEST_DELAY * 2; // 적은 요청 남음 (API 속도 제한 방지를 위해 증가)
  }
  
  if (forbiddenErrorCount > 0) {
    delay += forbiddenErrorCount * 2000; // Forbidden 에러 횟수에 따라 지연 시간 증가 (안정성 강화)
  }

  // 디버그 로그 제거로 성능 향상
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      await new Promise(resolve => setTimeout(resolve, delay));
      request();
    }
  }
  
  isProcessingQueue = false;
};

/**
 * API 요청을 캐시하고 속도 제한을 관리하는 함수
 * 요청 실패 시 자동 재시도 및 오류 처리 기능 포함
 */
/**
 * API 요청을 캐시하고 속도 제한을 관리하는 함수
 * 요청 실패 시 자동 재시도 및 오류 처리 기능 포함
 */
const cachedRequest = (url: string, options?: RequestInit): Promise<any> => {
  const cacheKey = JSON.stringify({ url, options });

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!.catch(error => {
      // 캐시된 요청이 실패하면 캐시에서 제거하고 새로운 요청 시도
      console.warn('캐시된 요청 실패, 재시도 중:', error);
      cache.delete(cacheKey);
      
      // API 속도 제한 오류인 경우 더 긴 지연 후 재시도
      if (error.message && error.message.includes('rate limit exceeded')) {
        return new Promise(resolve => {
          const retryRequest = () => resolve(cachedRequest(url, options));
          requestQueue.push(retryRequest);
          processQueue();
        });
      }
      
      // Forbidden 오류는 더 긴 지연 후 재시도 (API 속도 제한 오류 방지)
      if (error.message && error.message.includes('Forbidden')) {
        console.warn('Forbidden 오류 발생, 30초 후 재시도합니다.');
        return new Promise(resolve => setTimeout(() => resolve(cachedRequest(url, options)), 30000));
      }
      
      // 일반 오류는 적절한 지연 후 재시도 (안정성 강화)
      return new Promise(resolve => setTimeout(() => resolve(cachedRequest(url, options)), 5000));
    });
  }

  return new Promise((resolve, reject) => {
    const executeRequest = () => {
      // 요청 전에 사용자 에이전트 헤더와 캐시 방지 헤더 추가
      const timestamp = new Date().getTime();
                            const enhancedOptions = {
                        ...options,
                        headers: {
                          ...options?.headers,
                          'User-Agent': 'GitHub-Dashboard-App/1.0',
                          'Accept': 'application/vnd.github.v3+json',
                          'Cache-Control': 'no-cache',
                          'X-GitHub-Api-Version': '2022-11-28',
                          'X-Request-ID': `github-dashboard-${timestamp}-${Math.floor(Math.random() * 1000)}`,
                          // 토큰이 있는 경우에만 Authorization 헤더 추가
                          ...(GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {})
                        }
                      };
      
      // 403 에러가 너무 많이 발생하면 요청 지연
      if (forbiddenErrorCount >= MAX_FORBIDDEN_ERRORS) {
        const cooldownRemaining = FORBIDDEN_COOLDOWN - (Date.now() - lastForbiddenErrorTime);
        if (cooldownRemaining > 0) {
          console.warn(`403 에러 쿨다운 중: ${Math.ceil(cooldownRemaining / 1000)}초 남음`);
          setTimeout(() => {
            const retryPromise = cachedRequest(url, options);
            retryPromise.then(resolve).catch(reject);
          }, cooldownRemaining + 1000);
          return;
        }
      }
      
      fetch(url, enhancedOptions)
        .then(async (response) => {
          // GitHub API 속도 제한 정보 추출
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
          const rateLimitReset = response.headers.get('X-RateLimit-Reset');
          
          if (rateLimitRemaining) {
            remainingRequests = parseInt(rateLimitRemaining, 10);
            // 로그 제거로 성능 향상
          }
          
          if (rateLimitReset) {
            resetTime = parseInt(rateLimitReset, 10) * 1000;
            // 로그 제거로 성능 향상
          }
          
          if (response.status === 204) { // No Content
            return [];
          }
          
          if (response.status === 403) {
            // Forbidden 에러 카운트 증가 및 시간 기록
            forbiddenErrorCount++;
            lastForbiddenErrorTime = Date.now();
            
            if (remainingRequests === 0) {
              // 속도 제한에 도달한 경우
              const waitTime = Math.max(0, resetTime - Date.now());
              console.warn(`API 속도 제한 도달. ${Math.ceil(waitTime / 1000)}초 후 리셋됩니다.`);
              
              const error = new Error(`API rate limit exceeded. Resets in ${Math.ceil(waitTime / 1000)} seconds.`);
              cache.delete(cacheKey);
              throw error;
            } else {
              // 다른 이유로 인한 403 오류 (IP 차단, 인증 문제 등)
              console.warn(`403 Forbidden 오류 발생 (${forbiddenErrorCount}번째). 접근이 거부되었습니다.`);
              
              // 헤더 정보 로깅
              console.log('응답 헤더:', [...response.headers.entries()]);
              
              const retryAfter = response.headers.get('Retry-After');
              // 기본 지연 시간 증가 (API 속도 제한 오류 방지)
              let retryDelay = forbiddenErrorCount * 10000; 
              
              if (retryAfter) {
                // 서버 요청 지연 시간 그대로 사용 (안정성 강화)
                retryDelay = parseInt(retryAfter, 10) * 1000;
                console.log(`서버에서 요청한 재시도 지연 시간: ${retryDelay}ms`);
              }
              
              const error = new Error(`GitHub API 접근이 거부되었습니다 (403 Forbidden). ${Math.ceil(retryDelay / 1000)}초 후 자동 재시도합니다.`);
              cache.delete(cacheKey);
              
              // 에러 객체에 재시도 지연 시간 추가
              (error as any).retryDelay = retryDelay;
              throw error;
            }
          }
          
          if (!response.ok) {
            // 요청 실패 시 캐시에서 제거
            let errorMessage = response.statusText;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              // JSON 파싱 실패 시 기본 메시지 사용
            }
            
            cache.delete(cacheKey);
            throw new Error(`HTTP Error: ${response.status} - ${errorMessage}`);
          }
          
          // 성공적인 응답이면 Forbidden 에러 카운트 감소
          if (forbiddenErrorCount > 0) {
            forbiddenErrorCount = Math.max(0, forbiddenErrorCount - 1);
          }
          
          return response.json();
        })
        .then(data => {
          // 캐시 만료 시간 추가
          if (data && typeof data === 'object') {
            Object.defineProperty(data, '_timestamp', {
              value: Date.now(),
              enumerable: false
            });
          }
          resolve(data);
        })
        .catch(error => {
          // 오류 발생 시 캐시에서 제거
          cache.delete(cacheKey);
          console.error(`API 요청 실패 (${url}):`, error);
          
          // 속도 제한 오류인 경우 대기열에 다시 추가
          if (error.message && error.message.includes('rate limit exceeded')) {
            const retryRequest = () => {
              const retryPromise = cachedRequest(url, options);
              retryPromise.then(resolve).catch(reject);
            };
            
            requestQueue.push(retryRequest);
            processQueue();
            return;
          }
          
          // Forbidden 오류인 경우 더 긴 지연 후 재시도 (API 속도 제한 오류 방지)
          if (error.message && error.message.includes('Forbidden')) {
            const retryDelay = (error as any).retryDelay || 30000; // 안정성을 위해 30초로 설정
            console.warn(`Forbidden 오류, ${Math.ceil(retryDelay / 1000)}초 후 자동 재시도합니다.`);
            
            setTimeout(() => {
              const retryPromise = cachedRequest(url, options);
              retryPromise.then(resolve).catch(reject);
            }, retryDelay);
            return;
          }
          
          // 그 외 오류는 그대로 반환
          reject(new Error(`요청 실패: ${error.message || '네트워크 오류'}`));
        });
    };

    // 요청을 대기열에 추가
    requestQueue.push(executeRequest);
    processQueue();
  });
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

// 사용자의 팔로워 목록을 페이징 처리하여 가져오는 함수 (성능 최적화)
export const getFollowers = async (username: string, limit: number = 100): Promise<GitHubFollower[]> => {
  // 캐시 키 (사용자명과 제한으로 구성)
  const cacheKey = `followers_${username}_${limit}`;
  
  // 세션 스토리지에서 캐시된 데이터 확인
  const cachedData = sessionStorage.getItem(cacheKey);
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      // 캐시가 15분 이내라면 사용
      if (Date.now() - timestamp < 15 * 60 * 1000) {
        return data;
      }
    } catch (e) {
      // 캐시 파싱 오류 무시
    }
  }
  
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
    
    // 결과 세션 스토리지에 캐싱
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: allFollowers,
        timestamp: Date.now()
      }));
    } catch (e) {
      // 스토리지 오류 무시
    }
    
    return allFollowers;
  } catch (error) {
    console.error('팔로워 가져오기 오류:', error);
    throw error;
  }
};

// 사용자가 팔로우하는 사용자 목록을 페이징 처리하여 가져오는 함수 (성능 최적화)
export const getFollowing = async (username: string, limit: number = 100): Promise<GitHubFollowing[]> => {
  // 캐시 키 (사용자명과 제한으로 구성)
  const cacheKey = `following_${username}_${limit}`;
  
  // 세션 스토리지에서 캐시된 데이터 확인
  const cachedData = sessionStorage.getItem(cacheKey);
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      // 캐시가 15분 이내라면 사용
      if (Date.now() - timestamp < 15 * 60 * 1000) {
        return data;
      }
    } catch (e) {
      // 캐시 파싱 오류 무시
    }
  }
  
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
    
    // 결과 세션 스토리지에 캐싱
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: allFollowing,
        timestamp: Date.now()
      }));
    } catch (e) {
      // 스토리지 오류 무시
    }
    
    return allFollowing;
  } catch (error) {
    console.error('팔로잉 가져오기 오류:', error);
    throw error;
  }
};

/**
 * 사용자의 기여 활동 통계를 가져옵니다.
 * 현재는 GitHub API가 직접적으로 기여 데이터를 제공하지 않아 모의 데이터를 생성합니다.
 */
export const getContributionStats = async (username: string): Promise<ContributionStats> => {
  try {
    // 실제로는 GitHub API가 이 데이터를 직접 제공하지 않으므로 모의 데이터 생성
    // 실제 구현에서는 GitHub 프로필 페이지에서 SVG를 스크래핑하거나 다른 서비스를 사용해야 함
    
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const weeks = [];
    let currentDate = new Date(oneYearAgo);
    let totalContributions = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    
    // 지난 52주(1년) 데이터 생성
    while (currentDate <= today) {
      const weekStart = new Date(currentDate);
      const days = [];
      
      // 한 주의 7일 데이터 생성
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        
        // 특정 패턴으로 기여도 생성 (실제로는 GitHub 커밋 데이터 기반으로 해야 함)
        const isWeekend = [0, 6].includes(date.getDay());
        const isRecentMonth = date >= new Date(today.setMonth(today.getMonth() - 1));
        const randomFactor = Math.random();
        
        // 최근 데이터와 주중에 더 많은 기여가 있도록 설정
        let count = 0;
        if (isRecentMonth && !isWeekend && randomFactor > 0.3) {
          count = Math.floor(Math.random() * 10) + 1;
        } else if (!isWeekend && randomFactor > 0.5) {
          count = Math.floor(Math.random() * 5) + 1;
        } else if (randomFactor > 0.7) {
          count = Math.floor(Math.random() * 3);
        }
        
        // 기여 레벨 계산 (0-4)
        let level = 0;
        if (count > 0) {
          level = Math.min(4, Math.ceil(count / 2.5));
        }
        
        // 스트릭(연속 기여) 계산
        if (count > 0) {
          tempStreak++;
          currentStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
        
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        
        days.push({
          date: dateString,
          count,
          level
        });
        
        totalContributions += count;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push({
        startDate: weekStart.toISOString().split('T')[0],
        days
      });
    }
    
    return {
      totalContributions,
      weeks,
      longestStreak,
      currentStreak
    };
    
  } catch (error) {
    console.error('기여 통계 가져오기 오류:', error);
    throw error;
  }
};
