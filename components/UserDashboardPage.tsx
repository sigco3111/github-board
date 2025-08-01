import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUserData } from '../hooks/useUserData';
import { usePageTitle } from '../hooks/usePageTitle';
import type { GitHubRepo } from '../types';

// Utility function to validate GitHub username format
const isValidGitHubUsername = (username: string): boolean => {
  // GitHub username rules:
  // - May only contain alphanumeric characters or single hyphens
  // - Cannot begin or end with a hyphen
  // - Maximum 39 characters
  const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  return githubUsernameRegex.test(username);
};

// This is a demonstration component showing how useUserData would be used
// in the UserDashboardPage component as specified in the design
const UserDashboardPage: React.FC = () => {
  const { username, tab } = useParams<{ username: string; tab?: string }>();
  const navigate = useNavigate();
  
  // Validate username format before making API calls
  const isValidUsername = username ? isValidGitHubUsername(username) : false;
  
  // Validate tab parameter and redirect if invalid
  const validTabs = ['overview', 'repositories', 'projects'];
  const isValidTab = !tab || validTabs.includes(tab);
  
  useEffect(() => {
    // If tab is provided but invalid, redirect to overview
    if (username && isValidUsername && tab && !validTabs.includes(tab)) {
      navigate(`/${username}`, { replace: true });
    }
  }, [username, tab, isValidUsername, navigate]);
  
  const { 
    user, repos, projects, followers, following, 
    loading, reposLoading, followersLoading, followingLoading, 
    error, refetch, fetchFollowers, fetchFollowing 
  } = useUserData(
    isValidUsername ? username || '' : ''
  );

  // 저장소 검색 및 페이징 상태 관리
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const REPOS_PER_PAGE = 20; // 페이지당 표시할 저장소 수
  
  // 검색어에 따라 저장소 필터링
  const filteredRepos = useMemo(() => {
    if (!searchTerm.trim()) return repos;
    
    const lowercasedTerm = searchTerm.toLowerCase();
    return repos.filter(repo => 
      repo.name.toLowerCase().includes(lowercasedTerm) || 
      (repo.description && repo.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [repos, searchTerm]);
  
  // 현재 페이지에 표시할 저장소
  const currentRepos = useMemo(() => {
    const indexOfLastRepo = currentPage * REPOS_PER_PAGE;
    const indexOfFirstRepo = indexOfLastRepo - REPOS_PER_PAGE;
    return filteredRepos.slice(indexOfFirstRepo, indexOfLastRepo);
  }, [filteredRepos, currentPage, REPOS_PER_PAGE]);
  
  // 총 페이지 수 계산
  const totalPages = useMemo(() => {
    return Math.ceil(filteredRepos.length / REPOS_PER_PAGE);
  }, [filteredRepos.length, REPOS_PER_PAGE]);
  
  // 페이지 변경 핸들러
  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    // 페이지 변경 시 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // 검색어 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
  // 팔로워/팔로잉 모달 관련 상태
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersSearchTerm, setFollowersSearchTerm] = useState('');
  const [followingSearchTerm, setFollowingSearchTerm] = useState('');
  
  // 검색 필터링된 팔로워/팔로잉 목록
  const filteredFollowers = useMemo(() => {
    if (!followersSearchTerm.trim()) return followers;
    const term = followersSearchTerm.toLowerCase();
    return followers.filter(follower => follower.login.toLowerCase().includes(term));
  }, [followers, followersSearchTerm]);
  
  const filteredFollowing = useMemo(() => {
    if (!followingSearchTerm.trim()) return following;
    const term = followingSearchTerm.toLowerCase();
    return following.filter(follow => follow.login.toLowerCase().includes(term));
  }, [following, followingSearchTerm]);
  
  // 팔로워 모달 열기
  const openFollowersModal = useCallback(() => {
    // 모달을 열 때 데이터 로드
    if (followers.length === 0 && !followersLoading) {
      fetchFollowers();
    }
    setShowFollowersModal(true);
    setFollowersSearchTerm(''); // 검색어 초기화
  }, [fetchFollowers]);
  
  // 팔로잉 모달 열기
  const openFollowingModal = useCallback(() => {
    // 모달을 열 때 데이터 로드
    if (following.length === 0 && !followingLoading) {
      fetchFollowing();
    }
    setShowFollowingModal(true);
    setFollowingSearchTerm(''); // 검색어 초기화
  }, [fetchFollowing]);
  
  // 사용자 비교 페이지로 이동
  const navigateToCompare = useCallback((otherUsername: string) => {
    if (username) {
      navigate(`/compare/${username}/${otherUsername}`);
    }
  }, [username, navigate]);
  
  // 사용자 프로필로 이동
  const navigateToUserProfile = useCallback((login: string) => {
    window.open(`https://github.com/${login}`, '_blank', 'noopener,noreferrer');
  }, []);
  
  // 모달 닫기
  const closeFollowersModal = useCallback(() => {
    setShowFollowersModal(false);
  }, []);
  
  const closeFollowingModal = useCallback(() => {
    setShowFollowingModal(false);
  }, []);
  
  // 모달 닫고 비교 페이지로 이동
  const closeModalAndCompare = useCallback((otherUsername: string) => {
    setShowFollowersModal(false);
    setShowFollowingModal(false);
    navigateToCompare(otherUsername);
  }, [navigateToCompare]);

  // Handle page title updates
  usePageTitle({
    username: username || '',
    displayName: user?.name || user?.login,
    tab: tab || 'overview',
    loading
  });

  // 저장소 카드 클릭 시 GitHub 페이지로 이동하는 함수
  const handleRepoClick = useCallback((repo: GitHubRepo) => {
    if (repo.html_url) {
      window.open(repo.html_url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Handle invalid username format
  if (username && !isValidUsername) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">잘못된 사용자명 형식</h2>
          <p className="text-gray-400 mb-2">
            입력하신 사용자명 <code className="bg-gray-800 px-2 py-1 rounded text-sky-400">{username}</code>이 올바르지 않습니다.
          </p>
          
          <div className="bg-gray-800/50 p-4 rounded-lg mb-6 text-left">
            <p className="text-sm text-gray-300 mb-2">GitHub 사용자명 규칙:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 영문자, 숫자, 하이픈(-) 만 사용 가능</li>
              <li>• 하이픈으로 시작하거나 끝날 수 없음</li>
              <li>• 최대 39자까지 가능</li>
              <li>• 연속된 하이픈 사용 불가</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Link
              to="/"
              className="block w-full px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors text-center"
            >
              올바른 사용자명으로 검색하기
            </Link>
            <Link
              to="/"
              className="block w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors text-center"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto mb-4"></div>
          <p className="text-gray-400">사용자 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Check if it's a "user not found" error
    const isUserNotFound = error.includes('찾을 수 없습니다') || error.includes('Not Found');
    
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">
            {isUserNotFound ? '🔍' : '❌'}
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            {isUserNotFound ? '사용자를 찾을 수 없습니다' : '오류가 발생했습니다'}
          </h2>
          <p className="text-gray-400 mb-2">{error}</p>
          
          {isUserNotFound && (
            <div className="bg-gray-800/50 p-4 rounded-lg mb-6 text-left">
              <p className="text-sm text-gray-300 mb-2">다음을 확인해보세요:</p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 사용자명의 철자가 정확한지 확인</li>
                <li>• GitHub에서 해당 사용자가 존재하는지 확인</li>
                <li>• 대소문자를 정확히 입력했는지 확인</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={refetch}
              className="w-full px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              다시 시도
            </button>
            <Link
              to="/"
              className="block w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors text-center"
            >
              홈으로 돌아가기
            </Link>
            {isUserNotFound && (
              <Link
                to="/"
                className="block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-center"
              >
                다른 사용자 검색하기
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-300 mb-4">사용자를 찾을 수 없습니다</h2>
          <p className="text-gray-400 mb-6">올바른 GitHub 사용자명을 입력했는지 확인해주세요.</p>
          <a
            href="/"
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="flex justify-center border-b border-gray-700 mb-6" aria-label="Main navigation">
          <Link
            to="/"
            className="px-6 py-3 text-lg font-medium transition-colors duration-200 text-gray-400 hover:text-gray-200"
          >
            홈
          </Link>
          <Link
            to="/compare"
            className="px-6 py-3 text-lg font-medium transition-colors duration-200 flex items-center gap-2 text-gray-400 hover:text-gray-200"
          >
            <span role="img" aria-hidden="true">👥</span>
            <span>사용자 비교</span>
          </Link>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">
            {user.name || user.login}의 대시보드
          </h1>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
            title="데이터 새로고침"
          >
            <span>🔄</span>
            새로고침
          </button>
        </div>

        {/* User Profile Section */}
        <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left mb-8">
          <img 
            src={user.avatar_url} 
            alt={user.name || user.login} 
            className="w-32 h-32 rounded-full border-4 border-gray-700" 
          />
          <div className="md:ml-8 mt-4 md:mt-0">
            <h2 className="text-3xl font-bold">{user.name || user.login}</h2>
            <a 
              href={user.html_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xl text-gray-400 hover:text-sky-400"
            >
              @{user.login}
            </a>
            {user.bio && <p className="mt-2 text-gray-300 max-w-xl">{user.bio}</p>}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div 
            className="bg-gray-800 p-4 rounded-lg flex items-center cursor-pointer hover:bg-gray-700 transition-colors"
            onClick={openFollowersModal}
            title="팔로워 목록 보기"
          >
            <div className="p-3 bg-gray-700 rounded-full mr-4 text-sky-400">
              <span className="text-2xl" role="img" aria-label="Users">👥</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">팔로워</p>
              <p className="text-2xl font-bold">{user.followers.toLocaleString()}</p>
            </div>
            <div className="ml-auto text-gray-400">
              <span>👁️</span>
            </div>
          </div>
          <div 
            className="bg-gray-800 p-4 rounded-lg flex items-center cursor-pointer hover:bg-gray-700 transition-colors"
            onClick={openFollowingModal}
            title="팔로잉 목록 보기"
          >
            <div className="p-3 bg-gray-700 rounded-full mr-4 text-sky-400">
              <span className="text-2xl" role="img" aria-label="Users">👥</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">팔로잉</p>
              <p className="text-2xl font-bold">{user.following.toLocaleString()}</p>
            </div>
            <div className="ml-auto text-gray-400">
              <span>👁️</span>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg flex items-center">
            <div className="p-3 bg-gray-700 rounded-full mr-4 text-sky-400">
              <span className="text-2xl" role="img" aria-label="Repository">📚</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">공개 저장소</p>
              <p className="text-2xl font-bold">{user.public_repos.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <Link
              to={`/${user.login}`}
              className={`${
                (!tab || tab === 'overview')
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              개요
            </Link>
            <Link
              to={`/${user.login}/repositories`}
              className={`${
                tab === 'repositories'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              저장소 ({user.public_repos > 0 && repos.length < user.public_repos ? 
                `${repos.length}/${user.public_repos}` : repos.length})
            </Link>
            <Link
              to={`/${user.login}/projects`}
              className={`${
                tab === 'projects'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              프로젝트 ({projects.length})
            </Link>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {(!tab || tab === 'overview') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">인기 저장소</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {repos
                    .sort((a, b) => b.stargazers_count - a.stargazers_count)
                    .slice(0, 5)
                    .map(repo => (
                    <div 
                      key={repo.id} 
                      className="flex justify-between items-center p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => handleRepoClick(repo)}
                      title={`${repo.name} 저장소로 이동`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sky-400 truncate">{repo.name}</h4>
                        <p className="text-sm text-gray-400 truncate">{repo.description}</p>
                        {repo.language && (
                          <span className="inline-block mt-1 text-xs text-gray-500">
                            {repo.language}
                          </span>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-400 ml-4">
                        <div>⭐ {repo.stargazers_count}</div>
                        <div>🔀 {repo.forks_count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">최근 활동</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {repos
                    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
                    .slice(0, 5)
                    .map(repo => (
                    <div 
                      key={repo.id} 
                      className="p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => handleRepoClick(repo)}
                      title={`${repo.name} 저장소로 이동`}
                    >
                      <h4 className="font-medium text-sky-400">{repo.name}</h4>
                      <p className="text-sm text-gray-400">
                        업데이트: {new Date(repo.pushed_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'repositories' && (
            <div>
              {/* 검색 필드 */}
              <div className="mb-8">
                <div className="flex bg-gray-800 rounded-md shadow-md overflow-hidden">
                  <input
                    type="text"
                    placeholder="저장소 이름 또는 설명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => {
                      e.preventDefault();
                      const value = e.target.value;
                      setSearchTerm(value);
                    }}
                    className="flex-grow py-3 px-4 bg-gray-800 text-gray-100 focus:outline-none"
                  />
                  <div className="bg-gray-700 px-4 flex items-center text-gray-400">
                    <span role="img" aria-label="Search">🔍</span>
                  </div>
                </div>
                {searchTerm && (
                  <div className="mt-3 text-gray-400">
                    <span>검색 결과: </span>
                    <span className="text-sky-400 font-medium">{filteredRepos.length}</span>
                    <span> 개의 저장소</span>
                    {filteredRepos.length > 0 && searchTerm && (
                      <button 
                        className="ml-3 text-red-400 hover:text-red-300 transition-colors"
                        onClick={() => setSearchTerm('')}
                      >
                        검색 초기화 ×
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {filteredRepos.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {currentRepos.map(repo => (
                      <div 
                        key={repo.id} 
                        className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                        onClick={() => handleRepoClick(repo)}
                        title={`${repo.name} 저장소로 이동 (새 창에서 열림)`}
                      >
                        <div className="flex items-center text-sky-400 mb-2">
                          <span className="text-xl" role="img" aria-label="Repository">📚</span>
                          <h3 className="text-xl font-bold ml-2">{repo.name}</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 h-10 overflow-hidden">{repo.description}</p>
                        <div className="flex items-center text-gray-400 text-sm mt-auto pt-4 border-t border-gray-700">
                          {repo.language && (
                            <span className="flex items-center mr-4">
                              <span className="h-3 w-3 rounded-full bg-sky-400 mr-2"></span>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center mr-4">
                            <span role="img" aria-label="Stars" className="mr-1">⭐</span> 
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center">
                            <span role="img" aria-label="Forks" className="mr-1">🔀</span> 
                            {repo.forks_count}
                          </span>
                          <span className="ml-auto text-xs">
                            업데이트 {new Date(repo.pushed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="mt-10 flex justify-center">
                      <nav className="flex items-center space-x-1">
                        {/* 처음 페이지로 */}
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          className={`px-3 py-2 rounded-md ${
                            currentPage === 1
                              ? 'text-gray-500 cursor-not-allowed'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          &lt;&lt;
                        </button>
                        
                        {/* 이전 페이지로 */}
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`px-3 py-2 rounded-md ${
                            currentPage === 1
                              ? 'text-gray-500 cursor-not-allowed'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          &lt;
                        </button>
                        
                        {/* 페이지 번호 */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // 표시할 시작 페이지 계산 (현재 페이지 중심으로)
                          let startPage = Math.max(currentPage - 2, 1);
                          if (currentPage > totalPages - 2) {
                            startPage = Math.max(1, totalPages - 4);
                          }
                          const pageNum = startPage + i;
                          return pageNum <= totalPages ? (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-sky-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ) : null;
                        })}
                        
                        {/* 다음 페이지로 */}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-2 rounded-md ${
                            currentPage === totalPages
                              ? 'text-gray-500 cursor-not-allowed'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          &gt;
                        </button>
                        
                        {/* 마지막 페이지로 */}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-2 rounded-md ${
                            currentPage === totalPages
                              ? 'text-gray-500 cursor-not-allowed'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          &gt;&gt;
                        </button>
                      </nav>
                    </div>
                  )}
                  
                  {/* 페이지 정보 */}
                  <div className="mt-4 text-center text-sm text-gray-400">
                    전체 {filteredRepos.length}개 중 {(currentPage - 1) * REPOS_PER_PAGE + 1}-
                    {Math.min(currentPage * REPOS_PER_PAGE, filteredRepos.length)}개 표시
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400">
                  {searchTerm ? (
                    <div>
                      <p className="text-xl mb-4">검색 결과가 없습니다</p>
                      <p>다른 검색어로 시도해보세요</p>
                      <button 
                        className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                        onClick={() => setSearchTerm('')}
                      >
                        검색 초기화
                      </button>
                    </div>
                  ) : (
                    <p className="text-xl">저장소가 없습니다</p>
                  )}
                </div>
              )}
              
              {/* 저장소 로딩 상태 표시 */}
              {reposLoading && (
                <div className="mt-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mx-auto mb-2"></div>
                  <p className="text-gray-400">저장소 데이터를 불러오는 중...</p>
                </div>
              )}
              
              {/* 저장소 수 불일치 메시지 */}
              {!reposLoading && user && user.public_repos > repos.length && (
                <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center text-yellow-400 mb-2">
                    <span className="text-xl mr-2">ℹ️</span>
                    <span className="font-medium">모든 저장소가 표시되지 않았습니다</span>
                  </div>
                  <p className="text-center text-gray-300 text-sm mb-4">
                    GitHub에 {user.public_repos}개의 저장소가 있지만, {repos.length}개만 로드되었습니다.
                    GitHub API 제한으로 인해 일부 저장소만 표시될 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.length > 0 ? (
                projects.map(project => (
                  <div key={project.id} className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors duration-200">
                    <a 
                      href={project.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center text-sky-400 hover:underline mb-2"
                    >
                      <span className="text-xl mr-2" role="img" aria-label="Project">🏗️</span>
                      <h3 className="text-xl font-bold">{project.name}</h3>
                    </a>
                    <p className="text-gray-400 text-sm mb-4">{project.body}</p>
                    <div className="flex items-center text-gray-400 text-sm mt-4 pt-4 border-t border-gray-700">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.state === 'open' ? 'bg-green-500 text-green-900' : 'bg-red-500 text-red-900'
                      }`}>
                        {project.state}
                      </span>
                      <span className="ml-auto text-xs">
                        업데이트 {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400 py-10">
                  이 사용자에게는 공개 프로젝트가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 팔로워 모달 */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-100">
                {user.name || user.login}님의 팔로워 ({user.followers.toLocaleString()})
              </h3>
              <button 
                onClick={closeFollowersModal} 
                className="text-gray-400 hover:text-gray-200"
                title="닫기"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            {/* 검색 필드 */}
            <div className="p-4">
              <div className="flex bg-gray-700 rounded-md shadow-md overflow-hidden">
                <input
                  type="text"
                  placeholder="팔로워 검색..."
                  value={followersSearchTerm}
                  onChange={(e) => {
                    e.preventDefault();
                    const value = e.target.value;
                    setFollowersSearchTerm(value);
                  }}
                  className="flex-grow py-2 px-3 bg-gray-700 text-gray-100 focus:outline-none"
                />
                <div className="bg-gray-600 px-3 flex items-center text-gray-400">
                  <span role="img" aria-label="Search">🔍</span>
                </div>
              </div>
            </div>
            
            {/* 팔로워 목록 */}
            <div className="overflow-y-auto flex-grow">
              {followersLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mb-4"></div>
                  <p className="text-gray-400">팔로워 데이터를 불러오는 중...</p>
                </div>
              ) : filteredFollowers.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {filteredFollowers.map(follower => (
                    <div 
                      key={follower.id} 
                      className="p-4 flex items-center hover:bg-gray-700 transition-colors"
                    >
                      <img 
                        src={follower.avatar_url} 
                        alt={follower.login}
                        className="w-12 h-12 rounded-full mr-4" 
                      />
                      <div className="flex-grow">
                        <p className="font-medium text-gray-100">{follower.login}</p>
                        <p className="text-sm text-gray-400">{follower.type}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => navigateToUserProfile(follower.login)}
                          className="text-gray-400 hover:text-sky-400 transition-colors"
                          title="깃허브 프로필 보기"
                        >
                          <span role="img" aria-label="Profile">👤</span>
                        </button>
                        <button
                          onClick={() => closeModalAndCompare(follower.login)}
                          className="text-gray-400 hover:text-green-400 transition-colors"
                          title="이 사용자와 비교하기"
                        >
                          <span role="img" aria-label="Compare">🔄</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  {followersSearchTerm ? (
                    <p>검색 결과가 없습니다.</p>
                  ) : (
                    <p>팔로워가 없습니다.</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-700 flex justify-between">
              <span className="text-gray-400 text-sm">
                {followersSearchTerm && filteredFollowers.length > 0 ? 
                  `${filteredFollowers.length}개의 결과` : ''}
              </span>
              <button 
                onClick={closeFollowersModal} 
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 팔로잉 모달 */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-100">
                {user.name || user.login}님이 팔로우하는 사용자 ({user.following.toLocaleString()})
              </h3>
              <button 
                onClick={closeFollowingModal} 
                className="text-gray-400 hover:text-gray-200"
                title="닫기"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            {/* 검색 필드 */}
            <div className="p-4">
              <div className="flex bg-gray-700 rounded-md shadow-md overflow-hidden">
                <input
                  type="text"
                  placeholder="팔로잉 검색..."
                  value={followingSearchTerm}
                  onChange={(e) => {
                    e.preventDefault();
                    const value = e.target.value;
                    setFollowingSearchTerm(value);
                  }}
                  className="flex-grow py-2 px-3 bg-gray-700 text-gray-100 focus:outline-none"
                />
                <div className="bg-gray-600 px-3 flex items-center text-gray-400">
                  <span role="img" aria-label="Search">🔍</span>
                </div>
              </div>
            </div>
            
            {/* 팔로잉 목록 */}
            <div className="overflow-y-auto flex-grow">
              {followingLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mb-4"></div>
                  <p className="text-gray-400">팔로잉 데이터를 불러오는 중...</p>
                </div>
              ) : filteredFollowing.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {filteredFollowing.map(follow => (
                    <div 
                      key={follow.id} 
                      className="p-4 flex items-center hover:bg-gray-700 transition-colors"
                    >
                      <img 
                        src={follow.avatar_url} 
                        alt={follow.login}
                        className="w-12 h-12 rounded-full mr-4" 
                      />
                      <div className="flex-grow">
                        <p className="font-medium text-gray-100">{follow.login}</p>
                        <p className="text-sm text-gray-400">{follow.type}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => navigateToUserProfile(follow.login)}
                          className="text-gray-400 hover:text-sky-400 transition-colors"
                          title="깃허브 프로필 보기"
                        >
                          <span role="img" aria-label="Profile">👤</span>
                        </button>
                        <button
                          onClick={() => closeModalAndCompare(follow.login)}
                          className="text-gray-400 hover:text-green-400 transition-colors"
                          title="이 사용자와 비교하기"
                        >
                          <span role="img" aria-label="Compare">🔄</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  {followingSearchTerm ? (
                    <p>검색 결과가 없습니다.</p>
                  ) : (
                    <p>팔로우하는 사용자가 없습니다.</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-700 flex justify-between">
              <span className="text-gray-400 text-sm">
                {followingSearchTerm && filteredFollowing.length > 0 ? 
                  `${filteredFollowing.length}개의 결과` : ''}
              </span>
              <button 
                onClick={closeFollowingModal} 
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboardPage;