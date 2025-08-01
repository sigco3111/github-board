import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-4xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-300 mb-4">페이지를 찾을 수 없습니다</h2>
        <p className="text-gray-400 mb-2">
          요청하신 페이지 <code className="bg-gray-800 px-2 py-1 rounded text-sky-400">{location.pathname}</code>를 찾을 수 없습니다.
        </p>
        <p className="text-gray-400 mb-8">
          URL을 확인하시거나 아래 버튼을 통해 홈으로 돌아가세요.
        </p>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="block w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors duration-200"
          >
            홈으로 돌아가기
          </Link>
          
          <div className="text-sm text-gray-500">
            <p className="mb-2">올바른 URL 형식:</p>
            <ul className="space-y-1">
              <li><code className="bg-gray-800 px-2 py-1 rounded">/username</code> - 사용자 대시보드</li>
              <li><code className="bg-gray-800 px-2 py-1 rounded">/username/repositories</code> - 저장소 탭</li>
              <li><code className="bg-gray-800 px-2 py-1 rounded">/username/projects</code> - 프로젝트 탭</li>
              <li><code className="bg-gray-800 px-2 py-1 rounded">/compare</code> - 사용자 비교</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;