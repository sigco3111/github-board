
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { GitHubUser, GitHubRepo, GitHubProject, LanguageData, GitHubCommit, GitHubContributor } from './types';
import { getUser, getRepos, getProjects, getCommits, getContributors } from './services/githubService';
import { useTabNavigation, type TabType } from './hooks/useTabNavigation';
import { usePageTitle } from './hooks/usePageTitle';
import NotFoundPage from './components/NotFoundPage';
import UserDashboardPage from './components/UserDashboardPage';

// --- Navigation Component ---
const Navigation: React.FC = () => {
    const location = useLocation();
    
    return (
        <nav className="flex justify-center border-b border-gray-700 mb-6" aria-label="Main navigation">
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
const HomePage: React.FC = () => {
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
                
                <Navigation />

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
                        <button type="submit" className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-r-md hover:bg-sky-700 transition-colors duration-200">
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
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                <img src={user.avatar_url} alt={user.name} className="w-32 h-32 rounded-full border-4 border-gray-700" />
                <div className="md:ml-8 mt-4 md:mt-0">
                    <h2 className="text-3xl font-bold">{user.name}</h2>
                    <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="text-xl text-gray-400 hover:text-sky-400">@{user.login}</a>
                    <p className="mt-2 text-gray-300 max-w-xl">{user.bio}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                <StatCard icon={<span className="text-2xl" role="img" aria-label="Users">👥</span>} label="팔로워" value={user.followers.toLocaleString()} />
                <StatCard icon={<span className="text-2xl" role="img" aria-label="Users">👥</span>} label="팔로잉" value={user.following.toLocaleString()} />
                <StatCard icon={<span className="text-2xl" role="img" aria-label="Repository">📚</span>} label="공개 저장소" value={user.public_repos.toLocaleString()} />
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
                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-gray-200">언어 분포</h3>
                            <div className="bg-gray-800 p-4 rounded-lg h-[400px] flex items-center justify-center">
                               <LanguageChart repos={repos} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-semibold mb-4 text-gray-200">인기 저장소 스탯</h3>
                            <div className="bg-gray-800 p-4 rounded-lg h-[400px] flex items-center justify-center">
                               <TopReposChart repos={repos} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'repositories' && (
                    <>
                        <div className="bg-gray-800/50 p-4 rounded-lg mb-6 flex flex-col sm:flex-row gap-4">
                           <div className="flex-grow">
                                <input
                                    type="text"
                                    placeholder="저장소 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    aria-label="저장소 검색"
                                />
                            </div>
                           <div className="flex gap-4 w-full sm:w-auto flex-col sm:flex-row">
                                <select
                                    value={languageFilter}
                                    onChange={(e) => setLanguageFilter(e.target.value)}
                                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    aria-label="언어 필터"
                                >
                                    {uniqueLanguages.map(lang => (
                                        <option key={lang} value={lang}>{lang === 'all' ? '모든 언어' : lang}</option>
                                    ))}
                                </select>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value as any)}
                                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    aria-label="유형 필터"
                                >
                                    <option value="all">모든 유형</option>
                                    <option value="sources">소스</option>
                                    <option value="forks">포크</option>
                                </select>
                                <select
                                    value={sortKey}
                                    onChange={(e) => setSortKey(e.target.value as any)}
                                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    aria-label="정렬 기준"
                                >
                                    <option value="pushed_at">최신 업데이트 순</option>
                                    <option value="stargazers_count">별 개수 순</option>
                                    <option value="name">이름 순</option>
                                </select>
                            </div>
                        </div>
                        {filteredAndSortedRepos.length > 0 ? (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                               {filteredAndSortedRepos.map(repo => <RepoCard key={repo.id} repo={repo} onClick={onRepoClick} />)}
                           </div>
                        ) : (
                           <div className="text-center text-gray-400 py-10 bg-gray-800/50 rounded-lg">
                               필터와 일치하는 저장소가 없습니다.
                           </div>
                        )}
                    </>
                )}
                {activeTab === 'projects' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.length > 0 ? (
                            projects.map(project => <ProjectCard key={project.id} project={project} />)
                        ) : (
                            <div className="col-span-full text-center text-gray-400 py-10">이 사용자에게는 공개 프로젝트가 없습니다.</div>
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
const UserComparisonPage: React.FC = () => {
    const { username1, username2 } = useParams<{ username1?: string; username2?: string }>();
    const navigate = useNavigate();
    
    // URL 파라미터가 있으면 사용, 없으면 localStorage의 값 사용
    const [usernameOne, setUsernameOne] = useState<string>(() => username1 || localStorage.getItem('lastComparisonUser1') || '');
    const [usernameTwo, setUsernameTwo] = useState<string>(() => username2 || localStorage.getItem('lastComparisonUser2') || '');
    const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
    const [comparisonLoading, setComparisonLoading] = useState(false);

    // 사용자 비교를 수행하는 함수
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
        
        const results = await Promise.allSettled([
            Promise.all([getUser(user1), getRepos(user1)]),
            Promise.all([getUser(user2), getRepos(user2)])
        ]);

        const [resultOne, resultTwo] = results;

        const data: ComparisonResult = {
            userOne: resultOne.status === 'fulfilled' 
                ? { user: resultOne.value[0], repos: resultOne.value[1] }
                : { error: `사용자 '${user1}'의 데이터를 불러오는 데 실패했습니다: ${(resultOne.reason as Error).message}` },
            userTwo: resultTwo.status === 'fulfilled' 
                ? { user: resultTwo.value[0], repos: resultTwo.value[1] }
                : { error: `사용자 '${user2}'의 데이터를 불러오는 데 실패했습니다: ${(resultTwo.reason as Error).message}` },
        };
        
        setComparisonData(data);
        setComparisonLoading(false);
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
                
                <Navigation />

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
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/compare" element={<UserComparisonPage />} />
                <Route path="/compare/:username1/:username2" element={<UserComparisonPage />} />
                <Route path="/:username" element={<UserDashboardPage />} />
                <Route path="/:username/:tab" element={<UserDashboardPage />} />
                {/* Catch-all route for 404 errors */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}
