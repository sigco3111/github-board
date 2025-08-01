
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import type { GitHubUser, GitHubRepo, GitHubProject, LanguageData, GitHubCommit, GitHubContributor, ContributionStats, ContributionDay } from './types';
import { getUser, getRepos, getProjects, getCommits, getContributors, getContributionStats } from './services/githubService';
import { useTabNavigation, type TabType } from './hooks/useTabNavigation';
import { usePageTitle } from './hooks/usePageTitle';
import NotFoundPage from './components/NotFoundPage';
import UserDashboardPage from './components/UserDashboardPage';

// --- GitHub Token Modal Component ---
const GitHubTokenModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (token: string) => void }> = ({ 
    isOpen, onClose, onSave 
}) => {
    const [token, setToken] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [showError, setShowError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    
    // 토큰 입력 창이 열릴 때 기존 토큰을 불러옵니다
    useEffect(() => {
        if (isOpen) {
            try {
                const savedToken = localStorage.getItem('github_token');
                if (savedToken) {
                    setToken(savedToken);
                }
            } catch (e) {
                console.error('토큰 불러오기 실패:', e);
            }
        }
    }, [isOpen]);
    
    // 토큰 유효성 검사 (간단한 형식 검증)
    const validateToken = (tokenValue: string) => {
        if (!tokenValue.trim()) {
            setShowError('토큰을 입력해주세요.');
            return false;
        }
        
        // GitHub 토큰은 일반적으로 ghp_ 또는 github_pat_로 시작합니다
        const tokenRegex = /^(ghp_|github_pat_)[a-zA-Z0-9_-]{10,}/;
        if (!tokenRegex.test(tokenValue)) {
            setShowError('일반적인 GitHub 토큰 형식(ghp_ 또는 github_pat_로 시작)이 아닙니다. 정확한 토큰을 확인하세요.');
            return false;
        }
        
        setShowError(null);
        return true;
    };
    
    // 토큰 저장 처리
    const handleSaveToken = async () => {
        if (!validateToken(token)) {
            return;
        }
        
        setIsValidating(true);
        
        try {
            // 토큰 유효성을 직접 테스트
            const testUrl = '/api/github/rate_limit';
            const response = await fetch(testUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'GitHub-Dashboard-App/1.0',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                // 토큰이 유효하면 저장
                onSave(token);
                onClose();
            } else {
                // 오류 처리
                const errorText = await response.text();
                console.error('토큰 테스트 실패:', response.status, errorText);
                
                if (response.status === 401) {
                    setShowError('유효하지 않은 토큰입니다. 토큰이 만료되었거나 권한이 없습니다.');
                } else if (response.status === 403) {
                    setShowError('API 요청이 거부되었습니다. 토큰의 권한 범위를 확인하세요.');
                } else {
                    setShowError(`토큰 확인 중 오류가 발생했습니다: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('토큰 저장 중 오류 발생:', error);
            setShowError(`네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        } finally {
            setIsValidating(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    aria-label="닫기"
                    disabled={isValidating}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    GitHub 개인 액세스 토큰
                </h2>
                
                <div className="mb-6">
                    <div className="bg-sky-900/30 p-4 rounded-md border border-sky-800/50 mb-4">
                        <h3 className="text-sky-300 text-sm font-medium mb-2">API 요청 한도 증가</h3>
                        <p className="text-gray-300 text-sm">
                            GitHub API는 인증되지 않은 요청에 <strong>시간당 60회</strong>로 제한됩니다. 
                            개인 액세스 토큰을 설정하면 이 한도가 <strong>시간당 5,000회</strong>로 증가합니다.
                        </p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-300 text-sm">GitHub 개인 액세스 토큰을 입력하세요:</p>
                        <button 
                            onClick={() => setShowHelp(!showHelp)} 
                            className="text-sky-400 hover:text-sky-300 text-sm flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            토큰 생성 방법 {showHelp ? '숨기기' : '보기'}
                        </button>
                    </div>
                    
                    {showHelp && (
                        <div className="bg-gray-700 p-4 rounded-md mb-4 text-sm text-gray-300">
                            <ol className="list-decimal list-inside space-y-2">
                                <li><a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GitHub 토큰 생성 페이지</a>로 이동합니다.</li>
                                <li>토큰 이름에 <code className="bg-gray-800 px-1 py-0.5 rounded">GitHub-Dashboard-App</code>과 같은 식별 가능한 이름을 입력합니다.</li>
                                <li>토큰 만료일을 설정합니다 (30일 ~ 90일 권장).</li>
                                <li>다음 권한을 선택합니다:
                                    <ul className="list-disc list-inside ml-4 mt-1">
                                        <li><code className="bg-gray-800 px-1 py-0.5 rounded">public_repo</code> (공개 저장소 접근)</li>
                                        <li><code className="bg-gray-800 px-1 py-0.5 rounded">read:user</code> (사용자 정보 읽기)</li>
                                        <li><code className="bg-gray-800 px-1 py-0.5 rounded">user:email</code> (이메일 정보 읽기)</li>
                                    </ul>
                                </li>
                                <li>"Generate token"을 클릭하고 생성된 토큰을 복사합니다.</li>
                                <li>이 토큰은 생성 후 한 번만 표시되므로 안전한 곳에 보관하세요.</li>
                                <li>이 앱에서는 토큰이 브라우저의 localStorage에 저장됩니다. 보안상 민감한 환경에서는 사용 후 삭제하는 것이 좋습니다.</li>
                            </ol>
                        </div>
                    )}
                    
                    <div className="relative">
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => {
                                setToken(e.target.value);
                                if (showError) {
                                    setShowError(null);
                                }
                            }}
                            placeholder="ghp_xxxxxxxxxxxxxxxx"
                            disabled={isValidating}
                            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        {token && (
                            <button 
                                onClick={() => setToken('')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                disabled={isValidating}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    {showError && (
                        <div className="mt-2 text-red-400 text-sm flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{showError}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                        disabled={isValidating}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSaveToken}
                        disabled={!token.trim() || isValidating}
                        className={`px-4 py-2 rounded-md flex items-center ${
                            !token.trim() || isValidating
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                : 'bg-sky-600 text-white hover:bg-sky-700'
                        }`}
                    >
                        {isValidating ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                확인 중...
                            </>
                        ) : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Navigation Component ---
const Navigation: React.FC<{ onOpenTokenModal: () => void }> = ({ onOpenTokenModal }) => {
    const location = useLocation();
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    
    return (
        <nav className="flex justify-between items-center border-b border-gray-700 mb-6 px-4" aria-label="Main navigation">
            <div className="flex">
            <Link
                to="/"
                className={`px-6 py-3 text-lg font-medium transition-colors duration-200 ${
                    location.pathname === '/'
                        ? 'border-b-2 border-sky-500 text-sky-400'
                        : 'text-gray-400 hover:text-gray-200'
                }`}
            >
                홈
            </Link>
            <Link
                to="/compare"
                className={`px-6 py-3 text-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    location.pathname === '/compare'
                        ? 'border-b-2 border-sky-500 text-sky-400'
                        : 'text-gray-400 hover:text-gray-200'
                }`}
            >
                <span role="img" aria-hidden="true">👥</span>
                <span>사용자 비교</span>
            </Link>
            </div>
            
            <div className="flex items-center gap-3">
                {/* 도움말 및 설정 버튼 */}
                <div className="relative">
                    <button 
                        onClick={() => setIsHelpOpen(!isHelpOpen)}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm"
                        aria-label="도움말 및 설정"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        도움말
                    </button>
                    
                    {isHelpOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50">
                            <div className="p-4">
                                <h3 className="text-gray-200 font-medium mb-2">GitHub API 사용량</h3>
                                <p className="text-gray-400 text-sm mb-3">
                                    GitHub API는 인증 없이 시간당 60회, 토큰 인증 시 5,000회의 요청이 가능합니다.
                                </p>
                                <button 
                                    onClick={() => {
                                        setIsHelpOpen(false);
                                        onOpenTokenModal();
                                    }}
                                    className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    API 토큰 설정
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

// --- Shared Constants ---
const languageColorMap: { [key: string]: string } = {
    'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'HTML': '#e34c26', 'CSS': '#563d7c',
    'Python': '#3572A5', 'Java': '#b07219', 'C++': '#f34b7d', 'C': '#555555',
    'Shell': '#89e051', 'Ruby': '#701516', 'Go': '#00ADD8', 'PHP': '#4F5D95',
    'Jupyter Notebook': '#DA5B0B', 'Rust': '#dea584', 'Vue': '#41b883', 'Dart': '#00B4AB', 'Kotlin': '#A97BFF',
};


// --- Language Chart Component (Memoized) ---
const LanguageChart: React.FC<{ repos: GitHubRepo[] }> = React.memo(({ repos }) => {
    const data: LanguageData[] = useMemo(() => {
        const languageCounts = repos.reduce((acc, repo) => {
            if (repo.language) {
                acc[repo.language] = (acc[repo.language] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(languageCounts)
            .map(([name, value]) => ({
                name,
                value,
                fill: languageColorMap[name] || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}` // Fallback color
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [repos]);


    if (data.length === 0) {
        return <div className="text-center text-gray-400 py-10">표시할 언어 데이터가 없습니다.</div>;
    }

    return (
        <div className="w-full h-80">
            <ResponsiveContainer>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (!percent || percent === 0 || midAngle === undefined) return null;
                        const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                        return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12">
                                {`${(percent * 100).toFixed(0)}%`}
                            </text>
                        );
                    }}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#FFFFFF' }} 
                        itemStyle={{ color: '#F3F4F6' }}
                    />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
});

// --- Top Repos Chart ---
const TopReposChart: React.FC<{ repos: GitHubRepo[] }> = React.memo(({ repos }) => {
    const chartData = useMemo(() => {
        return repos
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 5)
            .map(repo => ({
                name: repo.name.length > 15 ? `${repo.name.substring(0, 12)}...` : repo.name,
                "별": repo.stargazers_count,
                "포크": repo.forks_count,
                "이슈": repo.open_issues_count
            }));
    }, [repos]);

    if (chartData.length === 0) {
        return <div className="text-center text-gray-400 py-10">차트를 표시할 저장소가 없습니다.</div>;
    }

    return (
        <div className="w-full h-80">
            <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#D1D5DB' }} interval={0} />
                    <YAxis tick={{ fontSize: 12, fill: '#D1D5DB' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
                        itemStyle={{ color: '#E5E7EB' }}
                        cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="별" fill="#FBBF24" />
                    <Bar dataKey="포크" fill="#38BDF8" />
                    <Bar dataKey="이슈" fill="#F472B6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});
// --- Contribution Heatmap Component ---
const ContributionHeatmap: React.FC<{ username: string }> = React.memo(({ username }) => {
  const [contributionData, setContributionData] = useState<ContributionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getContributionStats(username);
        setContributionData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '기여 데이터를 불러오는데 실패했습니다.');
        console.error('기여 데이터 불러오기 오류:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContributions();
  }, [username]);

  // 월 이름 배열
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  
  // 요일 이름 배열
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-pulse flex space-x-4">
          <div className="h-12 w-12 bg-gray-700 rounded-full"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 text-red-400 p-4 rounded-lg text-center">
        <p>기여 데이터를 불러오는데 실패했습니다.</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!contributionData) {
    return (
      <div className="text-gray-400 text-center py-10">
        기여 데이터가 없습니다.
      </div>
    );
  }

  const { totalContributions, weeks, longestStreak, currentStreak } = contributionData;

  // 주별 활동 데이터 생성 (추세선 차트용)
  const weeklyActivity = weeks.map(week => {
    const totalForWeek = week.days.reduce((sum, day) => sum + day.count, 0);
    return {
      week: week.startDate,
      count: totalForWeek
    };
  });

  // 최근 6개월 데이터만 표시
  const recentWeeklyActivity = weeklyActivity.slice(-26);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-100">기여 활동</h3>
          <p className="text-gray-400 text-sm mt-1">지난 1년간 {totalContributions.toLocaleString()}개의 기여</p>
        </div>
        <div className="flex gap-4 mt-3 md:mt-0">
          <div className="bg-gray-700 p-2 rounded-md">
            <p className="text-xs text-gray-400">최장 연속 기여</p>
            <p className="text-xl font-bold text-green-400">{longestStreak}일</p>
          </div>
          <div className="bg-gray-700 p-2 rounded-md">
            <p className="text-xs text-gray-400">현재 연속 기여</p>
            <p className="text-xl font-bold text-sky-400">{currentStreak}일</p>
          </div>
        </div>
      </div>

      {/* 활동 추세 그래프 */}
      <div className="mb-8 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={recentWeeklyActivity} 
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="week" 
              tick={false}
              axisLine={false}
            />
            <YAxis 
              hide={true}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151', 
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              itemStyle={{ color: '#D1D5DB' }}
              labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
              formatter={(value: any) => [`${value} 기여`, '활동']}
              labelFormatter={(label) => {
                const date = new Date(label);
                return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 주`;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#38BDF8" 
              fillOpacity={1}
              fill="url(#colorCount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 기여 활동 히트맵 */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* 월 표시 */}
          <div className="flex text-xs text-gray-500 mb-1 pl-10">
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - 11 + i);
              const monthIndex = date.getMonth();
              // 월 위치를 계산 (각 월의 시작점을 대략적으로 배치)
              const position = (i * 52) / 12;
              return (
                <div 
                  key={`month-${i}`}
                  className="absolute"
                  style={{ left: `${position * 15 + 40}px` }}
                >
                  {months[monthIndex]}
                </div>
              );
            })}
          </div>

          {/* 요일 및 히트맵 그리드 */}
          <div className="flex">
            {/* 요일 레이블 */}
            <div className="flex flex-col justify-around pr-2 pt-2">
              {weekdays.map((day, i) => (
                <div key={`day-${i}`} className="h-[15px] text-xs text-gray-500 text-center">
                  {day}
                </div>
              ))}
            </div>
            
            {/* 히트맵 그리드 */}
            <div className="grid grid-flow-col gap-[2px]">
              {weeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-[2px]">
                  {week.days.map((day, dayIndex) => {
                    // 기여도에 따른 색상 설정
                    let bgColorClass = 'bg-gray-800';
                    if (day.level === 1) bgColorClass = 'bg-green-900/40';
                    else if (day.level === 2) bgColorClass = 'bg-green-700/60';
                    else if (day.level === 3) bgColorClass = 'bg-green-600/80';
                    else if (day.level === 4) bgColorClass = 'bg-green-500';
                    
                    const date = new Date(day.date);
                    const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
                    
                    return (
                      <div
                        key={`day-${weekIndex}-${dayIndex}`}
                        className={`w-[15px] h-[15px] rounded-sm ${bgColorClass} transition-colors hover:ring-2 hover:ring-white/50`}
                        title={`${formattedDate}: ${day.count}회 기여`}
                      ></div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* 범례 */}
          <div className="flex items-center justify-end mt-2">
            <span className="text-xs text-gray-400 mr-2">기여도:</span>
            <div className="flex items-center gap-1">
              <div className="w-[15px] h-[15px] rounded-sm bg-gray-800"></div>
              <div className="w-[15px] h-[15px] rounded-sm bg-green-900/40"></div>
              <div className="w-[15px] h-[15px] rounded-sm bg-green-700/60"></div>
              <div className="w-[15px] h-[15px] rounded-sm bg-green-600/80"></div>
              <div className="w-[15px] h-[15px] rounded-sm bg-green-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Repo Detail Modal ---
const RepoDetailModal: React.FC<{ repo: GitHubRepo; onClose: () => void; }> = ({ repo, onClose }) => {
    const [commits, setCommits] = useState<GitHubCommit[]>([]);
    const [contributors, setContributors] = useState<GitHubContributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const [commitsData, contributorsData] = await Promise.all([
                    getCommits(repo.full_name),
                    getContributors(repo.full_name)
                ]);
                setCommits(commitsData);
                setContributors(contributorsData);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('저장소 세부 정보를 불러오는 중 오류가 발생했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [repo.full_name]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 id="modal-title" className="text-2xl font-bold text-sky-400 flex items-center">
                        <span className="text-2xl" role="img" aria-label="Repository">📚</span>
                        <span className="ml-3">{repo.name}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full -mr-2">
                        <span className="text-xl" aria-hidden="true">❌</span>
                        <span className="sr-only">닫기</span>
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">
                            <p>오류: {error}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-gray-200">기여자</h3>
                                <div className="space-y-3 pr-4 max-h-96 overflow-y-auto">
                                    {contributors.length > 0 ? contributors.map(c => (
                                        <a key={c.id} href={c.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors">
                                            <img src={c.avatar_url} alt={c.login} className="w-10 h-10 rounded-full mr-3"/>
                                            <div className="flex-grow">
                                                <p className="font-semibold text-gray-100">{c.login}</p>
                                                <p className="text-sm text-gray-400">{c.contributions} 기여</p>
                                            </div>
                                        </a>
                                    )) : <p className="text-gray-400">기여자를 찾을 수 없습니다.</p>}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-gray-200">최근 커밋</h3>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {commits.length > 0 ? commits.map(commit => (
                                        <div key={commit.sha} className="p-3 bg-gray-900 rounded-lg">
                                            <a href={commit.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                <p className="text-gray-200 truncate">{commit.commit.message.split('\n')[0]}</p>
                                            </a>
                                            <div className="flex items-center mt-2 text-xs text-gray-400">
                                                {commit.author && <img src={commit.author.avatar_url} alt={commit.author.login} className="w-5 h-5 rounded-full mr-2" />}
                                                <span className="font-medium">{commit.commit.author.name}</span>
                                                <span className="mx-2">•</span>
                                                <span>{new Date(commit.commit.author.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    )) : <p className="text-gray-400">커밋을 찾을 수 없습니다.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Card Components (Memoized) ---
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string }> = React.memo(({ icon, label, value }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex items-center">
        <div className="p-3 bg-gray-700 rounded-full mr-4 text-sky-400">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
));

const RepoCard: React.FC<{ repo: GitHubRepo; onClick: (repo: GitHubRepo) => void }> = React.memo(({ repo, onClick }) => (
    <div onClick={() => onClick(repo)} className="bg-gray-800 p-6 rounded-lg flex flex-col justify-between hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
        <div>
            <div className="flex items-center text-sky-400 mb-2">
                <span className="text-xl" role="img" aria-label="Repository">📚</span>
                <h3 className="text-xl font-bold ml-2">{repo.name}</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4 h-10 overflow-hidden">{repo.description}</p>
        </div>
        <div className="flex items-center text-gray-400 text-sm mt-auto pt-4 border-t border-gray-700">
            {repo.language && <span className="flex items-center mr-4"><span className="h-3 w-3 rounded-full bg-sky-400 mr-2"></span>{repo.language}</span>}
            <span className="flex items-center mr-4"><span role="img" aria-label="Stars" className="mr-1">⭐</span> {repo.stargazers_count}</span>
            <span className="flex items-center"><span role="img" aria-label="Forks" className="mr-1">🔀</span> {repo.forks_count}</span>
            <span className="ml-auto text-xs">업데이트 {new Date(repo.pushed_at).toLocaleDateString()}</span>
        </div>
    </div>
));

const ProjectCard: React.FC<{ project: GitHubProject }> = React.memo(({ project }) => (
    <div className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors duration-200">
        <a href={project.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sky-400 hover:underline mb-2">
            <span className="text-xl mr-2" role="img" aria-label="Project">🏗️</span>
            <h3 className="text-xl font-bold">{project.name}</h3>
        </a>
        <p className="text-gray-400 text-sm mb-4">{project.body}</p>
        <div className="flex items-center text-gray-400 text-sm mt-4 pt-4 border-t border-gray-700">
            <span className={`px-2 py-1 text-xs rounded-full ${project.state === 'open' ? 'bg-green-500 text-green-900' : 'bg-red-500 text-red-900'}`}>{project.state}</span>
            <span className="ml-auto text-xs">업데이트 {new Date(project.updated_at).toLocaleDateString()}</span>
        </div>
    </div>
));


// --- HomePage Component (Search Interface) ---
const HomePage: React.FC<{ onOpenTokenModal?: () => void }> = ({ onOpenTokenModal }) => {
    const navigate = useNavigate();
    const [username, setUsername] = useState<string>('');
    const [history, setHistory] = useState<string[]>(() => {
        try {
            const storedHistory = localStorage.getItem('github-dashboard-history');
            return storedHistory ? JSON.parse(storedHistory) : [];
        } catch (e) {
            return [];
        }
    });

    // Save history to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem('github-dashboard-history', JSON.stringify(history));
        } catch (err) {
            console.error("Failed to save history to localStorage", err);
        }
    }, [history]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;
        
        // Update history
        setHistory(prevHistory => {
            const newHistory = [username, ...prevHistory.filter(item => item.toLowerCase() !== username.toLowerCase())].slice(0, 10);
            return newHistory;
        });

        // Navigate to user dashboard
        navigate(`/${username}`);
    };

    const handleHistoryClick = useCallback((searchUsername: string) => {
        navigate(`/${searchUsername}`);
    }, [navigate]);

    const removeHistoryItem = useCallback((e: React.MouseEvent, itemToRemove: string) => {
        e.stopPropagation();
        setHistory(prevHistory => prevHistory.filter(item => item !== itemToRemove));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    // Set page title for home page
    usePageTitle({});

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
                        <span className="text-4xl" role="img" aria-label="Application Logo">✨</span>
                        GitHub 대시보드
                    </h1>
                </header>
                


                <div className="mb-6">
                    <form onSubmit={handleSearch} className="max-w-xl mx-auto flex">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="GitHub 사용자명을 입력하세요..."
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                            aria-label="GitHub 사용자명"
                        />
                        <button type="submit" className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-r-md hover:bg-sky-700 transition-colors duration-200 whitespace-nowrap">
                            검색
                        </button>
                    </form>
                </div>

                <main>
                    {history.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-gray-400 tracking-wider">최근 검색</h3>
                                <button
                                    onClick={clearHistory}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-sky-400 transition-colors"
                                    aria-label="검색 기록 모두 지우기"
                                >
                                    <span aria-hidden="true">🗑️</span>
                                    <span>모두 지우기</span>
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {history.map((item) => (
                                    <div key={item} className="flex items-center bg-gray-700 rounded-full overflow-hidden hover:bg-gray-600 transition-colors duration-200">
                                        <button
                                            onClick={() => handleHistoryClick(item)}
                                            className="pl-3 pr-2 py-1 text-sm text-gray-200"
                                            aria-label={`${item} 검색`}
                                        >
                                            {item}
                                        </button>
                                        <button
                                            onClick={(e) => removeHistoryItem(e, item)}
                                            className="px-2 py-1 text-gray-400 hover:text-white"
                                            aria-label={`${item} 기록에서 제거`}
                                        >
                                            <span className="text-xs" aria-hidden="true">❌</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="text-center py-20 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg">
                        <span className="text-6xl mx-auto" role="img" aria-label="Application Logo">✨</span>
                        <h2 className="mt-4 text-2xl font-semibold text-gray-300">GitHub 대시보드에 오신 것을 환영합니다</h2>
                        <p className="mt-2 text-gray-400">시작하려면 위에서 GitHub 사용자명을 입력하거나 최근 검색 기록을 사용하세요.</p>
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---
const Dashboard: React.FC<{ user: GitHubUser; repos: GitHubRepo[]; projects: GitHubProject[]; onRepoClick: (repo: GitHubRepo) => void; }> = ({ user, repos, projects, onRepoClick }) => {
    const { activeTab, navigateToTab } = useTabNavigation(user.login);
    
    // States for filtering and sorting repositories
    const [searchTerm, setSearchTerm] = useState('');
    const [languageFilter, setLanguageFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'sources' | 'forks'>('all');
    const [sortKey, setSortKey] = useState<'pushed_at' | 'stargazers_count' | 'name'>('pushed_at');

    const uniqueLanguages = useMemo(() => {
        const languages = new Set<string>();
        repos.forEach(repo => {
            if (repo.language) {
                languages.add(repo.language);
            }
        });
        return ['all', ...Array.from(languages).sort()];
    }, [repos]);

    const filteredAndSortedRepos = useMemo(() => {
        let processedRepos = [...repos];

        if (typeFilter === 'sources') {
            processedRepos = processedRepos.filter(repo => !repo.fork);
        } else if (typeFilter === 'forks') {
            processedRepos = processedRepos.filter(repo => repo.fork);
        }

        if (languageFilter !== 'all') {
            processedRepos = processedRepos.filter(repo => repo.language === languageFilter);
        }

        if (searchTerm) {
            processedRepos = processedRepos.filter(repo =>
                repo.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        processedRepos.sort((a, b) => {
            switch (sortKey) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'stargazers_count':
                    return b.stargazers_count - a.stargazers_count;
                case 'pushed_at':
                default:
                    return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
            }
        });

        return processedRepos;
    }, [repos, searchTerm, languageFilter, typeFilter, sortKey]);

    const tabs: { id: TabType; label: string }[] = [
        { id: 'overview', label: '개요' },
        { id: 'repositories', label: `저장소 (${filteredAndSortedRepos.length})` },
        { id: 'projects', label: `프로젝트 (${projects.length})` },
    ];

    return (
        <div className="mt-8">
            {/* 사용자 프로필 카드 - 모던한 디자인 */}
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl shadow-2xl p-6 border border-gray-700/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                    {/* 프로필 이미지 */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-purple-500/20 rounded-full animate-pulse-slow"></div>
                        <img 
                            src={user.avatar_url} 
                            alt={user.name || user.login} 
                            className="relative w-40 h-40 rounded-full border-4 border-gray-700/70 shadow-lg z-10 object-cover" 
                        />
                        <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-2 border-2 border-gray-700 shadow-lg z-20">
                            <span className="flex h-5 w-5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500"></span>
                            </span>
                </div>
            </div>

                    {/* 사용자 정보 */}
                    <div className="md:ml-8 mt-6 md:mt-0 text-center md:text-left flex-grow">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-white">{user.name || user.login}</h2>
                                <a 
                                    href={user.html_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xl text-gray-400 hover:text-sky-400 transition-colors flex items-center justify-center md:justify-start gap-1 mt-1"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                    </svg>
                                    @{user.login}
                                </a>
                            </div>
                            
                            {/* 생성일 뱃지 */}
                            <div className="mt-3 md:mt-0 bg-gray-800/80 px-3 py-1.5 rounded-full border border-gray-700/50 text-sm text-gray-400 inline-flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(user.created_at).getFullYear()}년부터
                            </div>
                        </div>

                        {/* 사용자 바이오 */}
                        <p className="mt-4 text-gray-300 max-w-3xl leading-relaxed">{user.bio || '바이오가 없습니다.'}</p>
                        
                        {/* 위치, 웹사이트 등 */}
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center md:justify-start text-sm">
                            {user.location && (
                                <div className="flex items-center text-gray-400">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {user.location}
                                </div>
                            )}
                            {user.blog && (
                                <a href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-400 hover:text-sky-400 transition-colors">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    {user.blog.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                            )}
                            {user.twitter_username && (
                                <a href={`https://twitter.com/${user.twitter_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-400 hover:text-sky-400 transition-colors">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                    </svg>
                                    @{user.twitter_username}
                                </a>
                            )}
                            {user.company && (
                                <div className="flex items-center text-gray-400">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {user.company}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-4 rounded-lg border border-gray-700/50 shadow-lg backdrop-blur-sm flex items-center transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer" onClick={openFollowersModal}>
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-sky-500/20 rounded-full mr-4 text-sky-400 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium">팔로워</p>
                        <p className="text-2xl font-bold text-white">{user.followers.toLocaleString()}</p>
                    </div>
                    <div className="ml-auto text-gray-400 transition-colors group-hover:text-sky-400">
                        <span className="text-xl" title="자세히 보기">👁️</span>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-4 rounded-lg border border-gray-700/50 shadow-lg backdrop-blur-sm flex items-center transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer" onClick={openFollowingModal}>
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full mr-4 text-pink-400 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium">팔로잉</p>
                        <p className="text-2xl font-bold text-white">{user.following.toLocaleString()}</p>
                    </div>
                    <div className="ml-auto text-gray-400 transition-colors group-hover:text-pink-400">
                        <span className="text-xl" title="자세히 보기">👁️</span>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-4 rounded-lg border border-gray-700/50 shadow-lg backdrop-blur-sm flex items-center transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full mr-4 text-emerald-400 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2h8v2H6V6zm8 3H6v2h8V9zm0 3H6v2h8v-2z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium">공개 저장소</p>
                        <p className="text-2xl font-bold text-white">{user.public_repos.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => navigateToTab(tab.id as TabType)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-sky-500 text-sky-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-8">
                {activeTab === 'overview' && (
                     <div className="space-y-8">
                        {/* API 오류 알림 배너 */}
                        {error && (
                          <>
                            {/* API 속도 제한 오류 알림 */}
                            {error.includes('rate limit exceeded') && (
                              <div className="bg-gradient-to-r from-amber-900/50 to-red-900/50 rounded-xl p-6 border border-amber-700/50 shadow-lg animate-fade-in">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <h3 className="text-lg font-medium text-amber-300">GitHub API 속도 제한 도달</h3>
                                    <div className="mt-2 text-sm text-amber-200">
                                      <p>GitHub API 호출 제한에 도달했습니다. 이는 단시간 내에 너무 많은 요청을 보냈기 때문입니다.</p>
                                      <p className="mt-1">시스템이 자동으로 요청을 관리하여 데이터를 로드할 것입니다. 잠시만 기다려주세요.</p>
                                    </div>
                                    <div className="mt-4">
                                      <div className="inline-flex items-center px-3 py-1.5 border border-amber-600/50 rounded-full text-xs font-medium bg-amber-900/30 text-amber-200">
                                        <svg className="mr-1.5 h-2 w-2 text-amber-400 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3" />
                                        </svg>
                                        요청이 대기열에 추가되었습니다
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* 403 Forbidden 오류 알림 */}
                            {(error.includes('Forbidden') || error.includes('403')) && !error.includes('rate limit exceeded') && (
                              <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-700/50 shadow-lg animate-fade-in">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <h3 className="text-lg font-medium text-purple-300">접근이 거부되었습니다 (403)</h3>
                                    <div className="mt-2 text-sm text-purple-200">
                                      <p>GitHub API에서 접근을 거부했습니다. 이는 일시적인 현상일 수 있습니다.</p>
                                      <p className="mt-1">시스템이 자동으로 재시도 중입니다. 잠시만 기다려주세요.</p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <div className="inline-flex items-center px-3 py-1.5 border border-purple-600/50 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200">
                                        <svg className="mr-1.5 h-2 w-2 text-purple-400 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3" />
                                        </svg>
                                        자동 재시도 중
                                      </div>
                                      <div className="inline-flex items-center px-3 py-1.5 border border-indigo-600/50 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-200">
                                        <svg className="mr-1.5 h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        지연 시간 자동 증가
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* 사용자 기여 활동 히트맵 */}
                        <ContributionHeatmap username={user.login} />
                        
                        {/* 차트 섹션 */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                        <div>
                                <h3 className="text-2xl font-semibold mb-4 text-gray-200 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                    </svg>
                                    언어 분포
                                </h3>
                                <div className="bg-gray-800/80 p-6 rounded-xl shadow-lg h-[400px] flex items-center justify-center backdrop-blur-sm border border-gray-700/50">
                               <LanguageChart repos={repos} />
                            </div>
                        </div>
                        <div>
                                <h3 className="text-2xl font-semibold mb-4 text-gray-200 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                    인기 저장소 스탯
                                </h3>
                                <div className="bg-gray-800/80 p-6 rounded-xl shadow-lg h-[400px] flex items-center justify-center backdrop-blur-sm border border-gray-700/50">
                               <TopReposChart repos={repos} />
                                </div>
                            </div>
                        </div>
                        
                        {/* 추가 시각화 차트 섹션 */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* 저장소 크기 분포 차트 */}
                            <div>
                                <h3 className="text-2xl font-semibold mb-4 text-gray-200 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    저장소 크기 분포
                                </h3>
                                <div className="bg-gray-800/80 p-6 rounded-xl shadow-lg h-[400px] flex items-center justify-center backdrop-blur-sm border border-gray-700/50">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={repos.slice(0, 10).map(repo => ({
                                                name: repo.name,
                                                size: repo.size
                                            }))}
                                            margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis 
                                                dataKey="name" 
                                                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                                angle={-45}
                                                textAnchor="end"
                                                interval={0}
                                            />
                                            <YAxis 
                                                tick={{ fill: '#9CA3AF' }}
                                                tickFormatter={(value) => `${Math.round(value/1024)}KB`}
                                            />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                                formatter={(value: any) => [`${Math.round(value/1024)}KB`, '크기']}
                                                labelStyle={{ color: '#F3F4F6' }}
                                            />
                                            <Bar 
                                                dataKey="size" 
                                                fill="#10B981" 
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            {/* 포크 & 스타 비교 차트 */}
                            <div>
                                <h3 className="text-2xl font-semibold mb-4 text-gray-200 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    포크 & 스타 비교
                                </h3>
                                <div className="bg-gray-800/80 p-6 rounded-xl shadow-lg h-[400px] flex items-center justify-center backdrop-blur-sm border border-gray-700/50">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={repos.slice(0, 5).map(repo => ({
                                                name: repo.name,
                                                stars: repo.stargazers_count,
                                                forks: repo.forks_count
                                            }))}
                                            margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis 
                                                dataKey="name" 
                                                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                                angle={-45}
                                                textAnchor="end"
                                            />
                                            <YAxis tick={{ fill: '#9CA3AF' }} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                                itemStyle={{ color: '#F3F4F6' }}
                                            />
                                            <Legend />
                                            <Bar dataKey="stars" name="스타" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="forks" name="포크" fill="#EC4899" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'repositories' && (
                    <div className="animate-fade-in">
                        {/* API 오류 알림 배너 */}
                        {error && (
                          <>
                            {/* API 속도 제한 오류 알림 */}
                            {error.includes('rate limit exceeded') && (
                              <div className="bg-gradient-to-r from-amber-900/50 to-red-900/50 rounded-xl p-6 border border-amber-700/50 shadow-lg animate-fade-in mb-6">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <h3 className="text-lg font-medium text-amber-300">GitHub API 속도 제한 도달</h3>
                                    <div className="mt-2 text-sm text-amber-200">
                                      <p>GitHub API 호출 제한에 도달했습니다. 이는 단시간 내에 너무 많은 요청을 보냈기 때문입니다.</p>
                                      <p className="mt-1">시스템이 자동으로 요청을 관리하여 데이터를 로드할 것입니다. 잠시만 기다려주세요.</p>
                                    </div>
                                    <div className="mt-4">
                                      <div className="inline-flex items-center px-3 py-1.5 border border-amber-600/50 rounded-full text-xs font-medium bg-amber-900/30 text-amber-200">
                                        <svg className="mr-1.5 h-2 w-2 text-amber-400 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3" />
                                        </svg>
                                        요청이 대기열에 추가되었습니다
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* 403 Forbidden 오류 알림 */}
                            {(error.includes('Forbidden') || error.includes('403')) && !error.includes('rate limit exceeded') && (
                              <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-700/50 shadow-lg animate-fade-in mb-6">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <h3 className="text-lg font-medium text-purple-300">접근이 거부되었습니다 (403)</h3>
                                    <div className="mt-2 text-sm text-purple-200">
                                      <p>GitHub API에서 접근을 거부했습니다. 이는 일시적인 현상일 수 있습니다.</p>
                                      <p className="mt-1">시스템이 30초 후 자동으로 재시도합니다.</p>
                                    </div>
                                    <div className="mt-4">
                                      <div className="inline-flex items-center px-3 py-1.5 border border-purple-600/50 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200">
                                        <svg className="mr-1.5 h-2 w-2 text-purple-400 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3" />
                                        </svg>
                                        자동 재시도 중...
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* 검색 및 필터 섹션 */}
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl mb-8 shadow-lg border border-gray-700/50 backdrop-blur-sm">
                           <h3 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
                              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                              </svg>
                              저장소 검색 및 필터
                           </h3>
                           <div className="flex flex-col sm:flex-row gap-4">
                               <div className="flex-grow relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                        </svg>
                                    </div>
                                <input
                                    type="text"
                                        placeholder="저장소 이름 또는 설명으로 검색..."
                                    value={searchTerm}
                                        onChange={(e) => {
                                          e.preventDefault();
                                          const value = e.target.value;
                                          setSearchTerm(value);
                                        }}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-700/70 border border-gray-600/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-sm transition-all duration-200"
                                    aria-label="저장소 검색"
                                />
                            </div>
                               <div className="flex gap-3 w-full sm:w-auto flex-col sm:flex-row">
                                    <div className="relative">
                                        <label className="absolute -top-2.5 left-3 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">언어</label>
                                <select
                                    value={languageFilter}
                                    onChange={(e) => setLanguageFilter(e.target.value)}
                                            className="appearance-none h-full pl-3 pr-8 py-2.5 bg-gray-700/70 border border-gray-600/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-sm min-w-[120px]"
                                    aria-label="언어 필터"
                                >
                                    {uniqueLanguages.map(lang => (
                                        <option key={lang} value={lang}>{lang === 'all' ? '모든 언어' : lang}</option>
                                    ))}
                                </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="absolute -top-2.5 left-3 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">유형</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value as any)}
                                            className="appearance-none h-full pl-3 pr-8 py-2.5 bg-gray-700/70 border border-gray-600/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-sm min-w-[120px]"
                                    aria-label="유형 필터"
                                >
                                    <option value="all">모든 유형</option>
                                    <option value="sources">소스</option>
                                    <option value="forks">포크</option>
                                </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="absolute -top-2.5 left-3 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">정렬</label>
                                <select
                                    value={sortKey}
                                    onChange={(e) => setSortKey(e.target.value as any)}
                                            className="appearance-none h-full pl-3 pr-8 py-2.5 bg-gray-700/70 border border-gray-600/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-sm min-w-[150px]"
                                    aria-label="정렬 기준"
                                >
                                    <option value="pushed_at">최신 업데이트 순</option>
                                    <option value="stargazers_count">별 개수 순</option>
                                    <option value="name">이름 순</option>
                                </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                            </div>
                        </div>
                                </div>
                            </div>
                            
                            {/* 검색 결과 카운터 */}
                            {searchTerm && (
                              <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-400">검색 결과: </span>
                                  <span className="ml-1 text-sky-400 font-medium">{filteredAndSortedRepos.length}</span>
                                  <span className="ml-1 text-gray-400">개의 저장소</span>
                                </div>
                                {filteredAndSortedRepos.length > 0 && searchTerm && (
                                  <button 
                                    className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center"
                                    onClick={() => setSearchTerm('')}
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                    검색 초기화
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                        
                        {/* 저장소 목록 */}
                        {filteredAndSortedRepos.length > 0 ? (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                               {filteredAndSortedRepos.map((repo, index) => (
                                 <div 
                                   key={repo.id} 
                                   className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl overflow-hidden border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform cursor-pointer backdrop-blur-sm animate-slide-in"
                                   style={{ animationDelay: `${index * 50}ms` }}
                                   onClick={() => onRepoClick(repo)}
                                 >
                                   <div className="p-6">
                                     <div className="flex items-start justify-between">
                                       <h3 className="text-xl font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center">
                                         <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                         </svg>
                                         {repo.name}
                                       </h3>
                                       {repo.fork && (
                                         <span className="bg-gray-700/70 text-gray-300 text-xs px-2 py-1 rounded-full">포크</span>
                                       )}
                                     </div>
                                     <p className="mt-2 text-gray-400 text-sm mb-4 line-clamp-2 h-10">{repo.description || '설명 없음'}</p>
                                     
                                     <div className="flex flex-wrap items-center gap-3 mt-4">
                                       {repo.language && (
                                         <div className="flex items-center">
                                           <span 
                                             className="h-3 w-3 rounded-full mr-1"
                                             style={{ backgroundColor: languageColorMap[repo.language] || '#888' }}
                                           ></span>
                                           <span className="text-sm text-gray-400">{repo.language}</span>
                                         </div>
                                       )}
                                       
                                       <div className="flex items-center" title="별">
                                         <svg className="w-4 h-4 text-amber-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                           <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                         </svg>
                                         <span className="text-sm text-gray-400">{repo.stargazers_count.toLocaleString()}</span>
                                       </div>
                                       
                                       <div className="flex items-center" title="포크">
                                         <svg className="w-4 h-4 text-sky-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582A1.5 1.5 0 004 6.99V16.5a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5V6.99a1.5 1.5 0 00-1.046-1.4L11 4.323V3a1 1 0 00-1-1zm5 14.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5V7.207l5-2v2.586a1 1 0 001.707.707L16 4.207v12.293zm-8.5-11a.5.5 0 00-.5.5v6a.5.5 0 001 0v-6a.5.5 0 00-.5-.5z" clipRule="evenodd" />
                                         </svg>
                                         <span className="text-sm text-gray-400">{repo.forks_count.toLocaleString()}</span>
                                       </div>
                                       
                                       <div className="flex items-center" title="이슈">
                                         <svg className="w-4 h-4 text-purple-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                         </svg>
                                         <span className="text-sm text-gray-400">{repo.open_issues_count.toLocaleString()}</span>
                                       </div>
                                     </div>
                                   </div>
                                   
                                   <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-700/50 flex justify-between items-center">
                                     <div className="text-xs text-gray-400">
                                       업데이트: {new Date(repo.pushed_at).toLocaleDateString()}
                                     </div>
                                     <div className="text-sm text-sky-400">
                                       <span role="img" aria-label="Visit" className="mr-1">↗️</span>
                                       방문하기
                                     </div>
                                   </div>
                                 </div>
                               ))}
                           </div>
                        ) : (
                           <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-10 rounded-xl text-center border border-gray-700/50 shadow-lg backdrop-blur-sm">
                               <svg className="h-20 w-20 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M9.995 15.001l4 3.999-.996.999-4-4z"></path>
                               </svg>
                               <h3 className="text-xl font-semibold text-gray-300 mb-2">
                                {searchTerm ? '검색 결과가 없습니다.' : '저장소를 찾을 수 없습니다.'}
                               </h3>
                               <p className="text-gray-400">
                                {searchTerm ? '다른 검색어로 다시 시도해보세요.' : '이 사용자는 공개 저장소가 없거나 아직 데이터를 불러오지 못했습니다.'}
                               </p>
                           </div>
                        )}
                    </div>
                )}
                {activeTab === 'projects' && (
                    <div className="animate-fade-in">
                        {/* API 오류 알림 배너 */}
                        {error && (
                          <>
                            {/* API 속도 제한 오류 알림 */}
                            {error.includes('rate limit exceeded') && (
                              <div className="bg-gradient-to-r from-amber-900/50 to-red-900/50 rounded-xl p-6 border border-amber-700/50 shadow-lg animate-fade-in mb-6">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <h3 className="text-lg font-medium text-amber-300">GitHub API 속도 제한 도달</h3>
                                    <div className="mt-2 text-sm text-amber-200">
                                      <p>GitHub API 호출 제한에 도달했습니다. 이는 단시간 내에 너무 많은 요청을 보냈기 때문입니다.</p>
                                      <p className="mt-1">시스템이 자동으로 요청을 관리하여 데이터를 로드할 것입니다. 잠시만 기다려주세요.</p>
                                    </div>
                                    <div className="mt-4">
                                      <div className="inline-flex items-center px-3 py-1.5 border border-amber-600/50 rounded-full text-xs font-medium bg-amber-900/30 text-amber-200">
                                        <svg className="mr-1.5 h-2 w-2 text-amber-400 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3" />
                                        </svg>
                                        요청이 대기열에 추가되었습니다
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* 403 Forbidden 오류 알림 */}
                            {(error.includes('Forbidden') || error.includes('403')) && !error.includes('rate limit exceeded') && (
                              <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-700/50 shadow-lg animate-fade-in mb-6">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <h3 className="text-lg font-medium text-purple-300">접근이 거부되었습니다 (403)</h3>
                                    <div className="mt-2 text-sm text-purple-200">
                                      <p>GitHub API에서 접근을 거부했습니다. 이는 일시적인 현상일 수 있습니다.</p>
                                      <p className="mt-1">시스템이 30초 후 자동으로 재시도합니다.</p>
                                    </div>
                                    <div className="mt-4">
                                      <div className="inline-flex items-center px-3 py-1.5 border border-purple-600/50 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200">
                                        <svg className="mr-1.5 h-2 w-2 text-purple-400 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="3" />
                                        </svg>
                                        자동 재시도 중...
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="mb-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-xl shadow-lg border border-gray-700/50 backdrop-blur-sm">
                            <h3 className="text-xl font-semibold text-gray-200 mb-3 flex items-center">
                                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7z" clipRule="evenodd" />
                                </svg>
                                프로젝트
                            </h3>
                            <p className="text-gray-400 text-sm">
                                GitHub 프로젝트는 이슈, 풀 리퀘스트 및 노트를 사용하여 작업을 구성하고 우선순위를 지정하는 데 도움이 됩니다. {user.login}님의 공개 프로젝트를 확인해보세요.
                            </p>
                        </div>

                        {projects.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.map((project, index) => (
                                    <div 
                                        key={project.id} 
                                        className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl overflow-hidden border border-gray-700/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer backdrop-blur-sm animate-slide-in"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        onClick={() => window.open(project.html_url, '_blank', 'noopener,noreferrer')}
                                    >
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold text-purple-400">{project.name}</h3>
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    project.state === 'open' 
                                                        ? 'bg-green-500/20 text-green-400' 
                                                        : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {project.state === 'open' ? '진행 중' : '완료됨'}
                                                </span>
                                            </div>
                                            
                                            <p className="text-gray-400 text-sm mb-4 line-clamp-3 h-[4.5rem]">
                                                {project.body || '설명 없음'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {new Date(project.created_at).toLocaleDateString()} 생성
                                                </div>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    <a href={project.html_url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">
                                                        보기
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-700/50 flex justify-between items-center">
                                            <div className="flex items-center">
                                                <span className="text-xs text-gray-400">작성자:</span>
                                                <span className="text-xs text-gray-300 ml-1">{project.creator.login}</span>
                                            </div>
                                            <div className="text-xs text-purple-400 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                                </svg>
                                                열기
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-10 rounded-xl text-center border border-gray-700/50 shadow-lg backdrop-blur-sm">
                                <svg className="h-20 w-20 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                </svg>
                                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                                    공개 프로젝트 없음
                                </h3>
                                <p className="text-gray-400">
                                    이 사용자에게는 공개된 프로젝트가 없거나 아직 데이터를 불러오지 못했습니다.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};



// --- User Comparison Components ---
type UserData = { user: GitHubUser; repos: GitHubRepo[] };
type ComparisonResult = {
    userOne: UserData | { error: string };
    userTwo: UserData | { error: string };
};

const LanguageComparisonDonutChart: React.FC<{ userOneData: UserData; userTwoData: UserData; }> = React.memo(({ userOneData, userTwoData }) => {
    
    const combinedData = useMemo(() => {
        const langCounts: Record<string, { [key: string]: number }> = {};
        const user1Login = userOneData.user.login;
        const user2Login = userTwoData.user.login;

        userOneData.repos.forEach(repo => {
            if (repo.language) {
                if (!langCounts[repo.language]) {
                    langCounts[repo.language] = { [user1Login]: 0, [user2Login]: 0 };
                }
                langCounts[repo.language][user1Login]++;
            }
        });

        userTwoData.repos.forEach(repo => {
            if (repo.language) {
                if (!langCounts[repo.language]) {
                    langCounts[repo.language] = { [user1Login]: 0, [user2Login]: 0 };
                }
                langCounts[repo.language][user2Login]++;
            }
        });

        return Object.entries(langCounts)
            .map(([name, counts]) => ({
                name,
                value: counts[user1Login] + counts[user2Login],
                breakdown: {
                    [user1Login]: counts[user1Login],
                    [user2Login]: counts[user2Login],
                },
                fill: languageColorMap[name] || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [userOneData, userTwoData]);

    if (combinedData.length === 0) {
        return <div className="text-center text-gray-400 py-10 h-full flex items-center justify-center">두 사용자 모두 표시할 언어 데이터가 없습니다.</div>;
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const user1Name = userOneData.user.login;
            const user2Name = userTwoData.user.login;

            return (
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-lg text-sm text-gray-200">
                    <p className="font-bold text-base mb-2 flex items-center">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: data.fill }}></span>
                        {data.name}
                    </p>
                    <p className="pl-5">총: <span className="font-semibold">{data.value}</span> repos</p>
                    <hr className="border-gray-600 my-2"/>
                    <div className="pl-5 space-y-1">
                        <p className="text-sky-400">{user1Name}: <span className="font-semibold">{data.breakdown[user1Name]}</span> repos</p>
                        <p className="text-pink-400">{user2Name}: <span className="font-semibold">{data.breakdown[user2Name]}</span> repos</p>
                    </div>
                </div>
            );
        }
        return null;
    };
    
    return (
        <div className="w-full h-96">
            <ResponsiveContainer>
                <PieChart>
                    <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(113, 113, 122, 0.2)' }}
                    />
                    <Legend wrapperStyle={{fontSize: "12px", paddingTop: '20px' }}/>
                    <Pie
                        data={combinedData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        innerRadius="50%"
                    >
                        {combinedData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
});

const ComparisonRadarChart: React.FC<{ userOneData: UserData; userTwoData: UserData; }> = React.memo(({ userOneData, userTwoData }) => {
    const chartData = useMemo(() => {
        const calcStats = (user: GitHubUser, repos: GitHubRepo[]) => {
            const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
            const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
            const avgStars = repos.length > 0 ? parseFloat((totalStars / repos.length).toFixed(2)) : 0;
            return {
                followers: user.followers,
                public_repos: user.public_repos,
                totalStars,
                totalForks,
                avgStars,
            };
        };

        const stats1 = calcStats(userOneData.user, userOneData.repos);
        const stats2 = calcStats(userTwoData.user, userTwoData.repos);
        const user1Name = userOneData.user.login;
        const user2Name = userTwoData.user.login;
        
        const dataPoints = [
            { subject: '팔로워', key: 'followers' },
            { subject: '저장소', key: 'public_repos' },
            { subject: '총 스타', key: 'totalStars' },
            { subject: '평균 스타', key: 'avgStars' },
            { subject: '총 포크', key: 'totalForks' },
        ];

        return dataPoints.map(point => ({
            subject: point.subject,
            [user1Name]: (stats1 as any)[point.key],
            [user2Name]: (stats2 as any)[point.key],
            fullMark: Math.max(1, (stats1 as any)[point.key], (stats2 as any)[point.key]) * 1.2,
        }));

    }, [userOneData, userTwoData]);

    return (
        <div className="w-full h-96">
            <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#4B5563" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#D1D5DB', fontSize: 14 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: 'transparent' }} />
                    <Radar name={userOneData.user.login} dataKey={userOneData.user.login} stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.6} />
                    <Radar name={userTwoData.user.login} dataKey={userTwoData.user.login} stroke="#F472B6" fill="#F472B6" fillOpacity={0.6} />
                    <Legend wrapperStyle={{ fontSize: "14px", paddingTop: '20px' }} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#FFFFFF' }}
                        labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
});


const UserComparison: React.FC<{ data: ComparisonResult }> = ({ data }) => {
    const navigate = useNavigate();
    
    const renderUserColumn = (userData: UserData | { error: string }) => {
        if ('error' in userData) {
            return (
                <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center h-full border border-dashed border-red-500/50">
                    <p className="text-red-400 text-center">{userData.error}</p>
                </div>
            );
        }

        const { user } = userData;

        return (
            <div className="bg-gray-800 p-6 rounded-lg flex flex-col h-full">
                <div className="flex flex-col items-center text-center">
                    <img src={user.avatar_url} alt={user.name || user.login} className="w-28 h-28 rounded-full border-4 border-gray-700" />
                    <div className="mt-4">
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="text-lg text-gray-400 hover:text-sky-400">@{user.login}</a>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 my-6 text-center">
                    <div className="bg-gray-900 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">팔로워</p>
                        <p className="text-xl font-bold">{user.followers.toLocaleString()}</p>
                    </div>
                     <div className="bg-gray-900 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">팔로잉</p>
                        <p className="text-xl font-bold">{user.following.toLocaleString()}</p>
                    </div>
                     <div className="bg-gray-900 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">저장소</p>
                        <p className="text-xl font-bold">{user.public_repos.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        );
    };

    const bothUsersValid = !('error' in data.userOne) && !('error' in data.userTwo);

    return (
        <div className="mt-8">
            {/* 뒤로가기 버튼 추가 */}
            <div className="mb-6">
                <button 
                    onClick={() => navigate(-1)} 
                    // -1은 브라우저 히스토리에서 한 단계 뒤로 이동
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors duration-200"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    <span>이전 검색 결과로 돌아가기</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderUserColumn(data.userOne)}
                {renderUserColumn(data.userTwo)}
            </div>

            {bothUsersValid && (
                <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col">
                        <h3 className="text-2xl font-semibold mb-4 text-center text-gray-200">언어 분포 비교</h3>
                        <LanguageComparisonDonutChart 
                            userOneData={data.userOne as UserData}
                            userTwoData={data.userTwo as UserData}
                        />
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col">
                        <h3 className="text-2xl font-semibold mb-4 text-center text-gray-200">역량 비교 분석</h3>
                        <ComparisonRadarChart 
                            userOneData={data.userOne as UserData}
                            userTwoData={data.userTwo as UserData}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


// --- User Comparison Page Component ---
const UserComparisonPage: React.FC<{ onOpenTokenModal?: () => void }> = ({ onOpenTokenModal }) => {
    const { username1, username2 } = useParams<{ username1?: string; username2?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    // URL 파라미터가 있으면 사용, 없으면 localStorage의 값 사용
    const [usernameOne, setUsernameOne] = useState<string>(() => username1 || localStorage.getItem('lastComparisonUser1') || '');
    const [usernameTwo, setUsernameTwo] = useState<string>(() => username2 || localStorage.getItem('lastComparisonUser2') || '');
    const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
    const [comparisonLoading, setComparisonLoading] = useState(false);

        // 사용자 비교를 수행하는 함수 (API 속도 제한 문제 해결)
    const compareUsers = useCallback(async (user1: string, user2: string) => {
        if (!user1 || !user2) return;
        
        setComparisonLoading(true);
        setComparisonData(null);

        try {
            localStorage.setItem('lastComparisonUser1', user1);
            localStorage.setItem('lastComparisonUser2', user2);
        } catch (err) {
            console.error("Failed to save comparison users to localStorage", err);
        }

        // 캐시 키 생성 및 확인
        const cacheKey = `comparison_${user1}_${user2}`;
        let useCache = false;
        let cachedResult = null;
        
        try {
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                const cacheTime = parsedData.timestamp || 0;
                
                // 캐시가 1시간 이내면 사용 (30분에서 1시간으로 연장)
                if (Date.now() - cacheTime < 60 * 60 * 1000) {
                    cachedResult = parsedData.data;
                    useCache = true;
                }
            }
        } catch (e) {
            console.warn('캐시 데이터 파싱 오류:', e);
            // 캐시 파싱 오류 시 무시하고 계속 진행
        }
        
        if (useCache && cachedResult) {
            setComparisonData(cachedResult);
            setComparisonLoading(false);
            return;
        }
        
        // 사용자 데이터 요청 (최소한의 API 호출만 수행)
        try {
            // 첫 번째 사용자 기본 정보만 먼저 요청
            const userData1 = await getUser(user1);
            
            // 두 번째 사용자 기본 정보만 먼저 요청
            const userData2 = await getUser(user2);
            
            // 기본 사용자 정보로 초기 데이터 설정
            const initialData: ComparisonResult = {
                userOne: { user: userData1, repos: [] },
                userTwo: { user: userData2, repos: [] }
            };
            
            // 초기 데이터 표시 (사용자에게 빠른 피드백 제공)
            setComparisonData(initialData);
            
            // 각 사용자의 저장소 정보는 비동기적으로 요청
            const fetchRepos = async () => {
                try {
                    // 첫 번째 사용자 저장소 요청
                    const repos1 = await getRepos(user1);
                    
                    // 중간 업데이트 (첫 번째 사용자 저장소 정보 추가)
                    setComparisonData(prevData => {
                        if (!prevData) return prevData;
                        return {
                            ...prevData,
                            userOne: { 
                                ...prevData.userOne, 
                                user: userData1, 
                                repos: repos1 
                            }
                        };
                    });
                    
                    // 두 번째 사용자 저장소 요청
                    const repos2 = await getRepos(user2);
                    
                    // 최종 데이터 업데이트
                    const finalData: ComparisonResult = {
                        userOne: { user: userData1, repos: repos1 },
                        userTwo: { user: userData2, repos: repos2 }
                    };
                    
                    setComparisonData(finalData);
                    
                    // 결과 캐싱
                    try {
                        sessionStorage.setItem(cacheKey, JSON.stringify({
                            data: finalData,
                            timestamp: Date.now()
                        }));
                    } catch (e) {
                        console.warn('비교 결과 캐싱 실패:', e);
                    }
                } catch (repoError) {
                    console.error('저장소 데이터 가져오기 오류:', repoError);
                    // 저장소 데이터 가져오기 실패해도 사용자 기본 정보는 유지
                }
            };
            
            // 저장소 정보 비동기적으로 가져오기
            fetchRepos();
            
        } catch (error) {
            console.error('사용자 비교 중 오류 발생:', error);
            
            // 에러 발생 시에도 가능한 데이터는 표시
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            
            setComparisonData({
                userOne: { error: `사용자 데이터를 불러오는 데 실패했습니다: ${errorMessage}` },
                userTwo: { error: `사용자 데이터를 불러오는 데 실패했습니다: ${errorMessage}` }
            });
        } finally {
        setComparisonLoading(false);
        }
    }, []);
    
    // URL 파라미터가 변경되면 자동으로 비교 실행
    useEffect(() => {
        if (username1 && username2) {
            setUsernameOne(username1);
            setUsernameTwo(username2);
            compareUsers(username1, username2);
        }
    }, [username1, username2, compareUsers]);

    const handleComparisonSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usernameOne || !usernameTwo) return;

        // URL 업데이트
        navigate(`/compare/${usernameOne}/${usernameTwo}`, { replace: true });

        // compareUsers 함수 호출
        compareUsers(usernameOne, usernameTwo);
    }, [usernameOne, usernameTwo, navigate, compareUsers]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
                        <span className="text-4xl" role="img" aria-label="Application Logo">✨</span>
                        GitHub 대시보드 - 사용자 비교
                    </h1>
                </header>
                




                <div className="mb-6">
                    <form onSubmit={handleComparisonSearch} className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 justify-center">
                        <input
                            type="text"
                            value={usernameOne}
                            onChange={(e) => {
                                e.preventDefault();
                                const value = e.target.value;
                                setUsernameOne(value);
                            }}
                            placeholder="사용자 1"
                            className="w-full sm:w-auto flex-grow px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                            aria-label="첫 번째 사용자"
                        />
                        <span className="text-gray-500 font-bold text-xl">VS</span>
                        <input
                            type="text"
                            value={usernameTwo}
                            onChange={(e) => {
                                e.preventDefault();
                                const value = e.target.value;
                                setUsernameTwo(value);
                            }}
                            placeholder="사용자 2"
                            className="w-full sm:w-auto flex-grow px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                            aria-label="두 번째 사용자"
                        />
                        <button type="submit" disabled={comparisonLoading} className="w-full sm:w-auto px-6 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0">
                            {comparisonLoading ? '...' : '비교'}
                        </button>
                    </form>
                </div>

                <main>
                    {comparisonLoading && (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sky-400"></div>
                        </div>
                    )}
                    {comparisonData && (
                        <UserComparison data={comparisonData} />
                    )}
                    {!comparisonLoading && !comparisonData && (
                        <div className="text-center py-20 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg flex flex-col items-center">
                            <span className="text-6xl" role="img" aria-label="User Comparison">👥</span>
                            <h2 className="mt-4 text-2xl font-semibold text-gray-300">사용자 비교</h2>
                            <p className="mt-2 text-gray-400">두 GitHub 사용자의 프로필을 나란히 비교해 보세요.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// Router-wrapped App Component
export default function App() {
    // GitHub 토큰 모달 상태
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    
    // localStorage에서 토큰 가져오기
    useEffect(() => {
        // GitHub 토큰 로드 및 설정 함수
        const loadAndSetToken = async () => {
            try {
                console.log('저장된 GitHub 토큰 확인 중...');
                const savedToken = localStorage.getItem('github_token');
                
                if (savedToken && savedToken.trim() !== '') {
                    console.log('저장된 토큰을 찾았습니다. 토큰을 설정합니다...');
                    
                    // githubService의 setGitHubToken 함수 호출
                    const { setGitHubToken } = await import('./services/githubService');
                    setGitHubToken(savedToken);
                    
                    console.log('앱 시작 시 토큰 설정이 완료되었습니다.');
                } else {
                    console.log('저장된 GitHub 토큰이 없습니다. API 호출은 시간당 60회로 제한됩니다.');
                    // 팝업 대신 네비게이션 버튼으로 대체
                }
            } catch (error) {
                console.error('토큰 설정 중 오류 발생:', error);
            }
        };

        loadAndSetToken();
    }, []);
    
    // 토큰 저장 핸들러
    const handleSaveToken = useCallback((token: string) => {
        if (!token.trim()) {
            alert('유효하지 않은 토큰입니다. 토큰이 비어 있습니다.');
            return;
        }
        
        // 토큰 형식 기본 검증 (GitHub 토큰은 일반적으로 ghp_ 또는 github_pat_로 시작)
        const tokenRegex = /^(ghp_|github_pat_)[a-zA-Z0-9_-]{10,}/;
        if (!tokenRegex.test(token)) {
            if (!confirm('입력하신 토큰이 일반적인 GitHub 토큰 형식(ghp_ 또는 github_pat_로 시작)과 다릅니다. 계속하시겠습니까?')) {
                return;
            }
        }
        
        console.log(`토큰 저장 시도 (길이: ${token.length})`);
        
        try {
            // 토큰 저장
            localStorage.setItem('github_token', token);
            console.log('토큰이 localStorage에 저장되었습니다.');
            
            // 페이지 리로드 전 토큰 테스트
            const testUrl = '/api/github/rate_limit';
            
            console.log('토큰 유효성 테스트 중...');
            
            // 테스트 요청
            fetch(testUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'GitHub-Dashboard-App/1.0',
                    'Accept': 'application/vnd.github.v3+json'
                }
            })
            .then(async response => {
                if (response.ok) {
                    const data = await response.json();
                    
                    console.log('토큰 테스트 성공:', data);
                    
                    // githubService의 setGitHubToken 함수 호출
                    import('./services/githubService').then(({ setGitHubToken }) => {
                        setGitHubToken(token);
                        
                        // 성공 메시지 표시
                        alert(`GitHub 토큰이 성공적으로 설정되었습니다.\n\n시간당 최대 ${data.resources.core.limit}개의 API 요청이 가능합니다.\n현재 남은 요청 수: ${data.resources.core.remaining}`);
                        
                        // 페이지 새로고침 (선택적)
                        if (confirm('설정이 완료되었습니다. 페이지를 새로고침하시겠습니까?')) {
                            window.location.reload();
                        }
                    });
                } else {
                    const errorText = await response.text();
                    console.error('토큰 테스트 실패:', response.status, errorText);
                    
                    // 토큰 오류 시 삭제
                    localStorage.removeItem('github_token');
                    
                    if (response.status === 401) {
                        alert('유효하지 않은 토큰입니다. 토큰이 만료되었거나 권한이 없습니다.');
                    } else {
                        alert(`토큰 유효성 검사 실패: ${response.status} ${response.statusText}`);
                    }
                }
            })
            .catch(error => {
                console.error('토큰 테스트 중 네트워크 오류:', error);
                alert(`토큰 테스트 중 오류가 발생했습니다: ${error.message}`);
            });
        } catch (error) {
            console.error('토큰 저장 중 오류 발생:', error);
            alert('토큰 저장 중 오류가 발생했습니다.');
        }
    }, []);
    
    // 앱 레이아웃을 위한 컨텍스트 제공 컴포넌트
    const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return (
            <>
                <GitHubTokenModal 
                    isOpen={isTokenModalOpen} 
                    onClose={() => setIsTokenModalOpen(false)} 
                    onSave={handleSaveToken} 
                />
                <Navigation onOpenTokenModal={() => setIsTokenModalOpen(true)} />
                {React.cloneElement(children as React.ReactElement, { 
                    onOpenTokenModal: () => setIsTokenModalOpen(true) 
                })}
            </>
        );
    };
    
    // 수정된 라우트 컴포넌트들
    const EnhancedHomePage: React.FC<{ onOpenTokenModal?: () => void }> = (props) => {
        return <HomePage {...props} />;
    };
    
    const EnhancedUserComparisonPage: React.FC<{ onOpenTokenModal?: () => void }> = (props) => {
        return <UserComparisonPage {...props} />;
    };
    
    const EnhancedUserDashboardPage: React.FC<{ onOpenTokenModal?: () => void }> = (props) => {
        return <UserDashboardPage {...props} />;
    };
    
    return (
        <BrowserRouter>
            <AppLayout>
            <Routes>
                    <Route path="/" element={<EnhancedHomePage />} />
                    <Route path="/compare" element={<EnhancedUserComparisonPage />} />
                    <Route path="/compare/:username1/:username2" element={<EnhancedUserComparisonPage />} />
                    <Route path="/:username" element={<EnhancedUserDashboardPage />} />
                    <Route path="/:username/:tab" element={<EnhancedUserDashboardPage />} />
                {/* Catch-all route for 404 errors */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </AppLayout>
        </BrowserRouter>
    );
}
