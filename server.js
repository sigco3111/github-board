// GitHub API 요청을 위한 프록시 서버
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// CORS 설정
app.use(cors());

// GitHub API 프록시 설정
app.use('/api/github', createProxyMiddleware({
  target: 'https://api.github.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/github': '/' // '/api/github' 경로를 '/'로 변경
  },
  onProxyReq: (proxyReq, req, res) => {
    // GitHub API 요청에 필요한 헤더 추가
    proxyReq.setHeader('User-Agent', 'GitHub-Dashboard-App/1.0');
    proxyReq.setHeader('Accept', 'application/vnd.github.v3+json');
    
    // Authorization 헤더가 있으면 그대로 전달
    if (req.headers.authorization) {
      console.log('Authorization 헤더 전달: 토큰 정보 있음');
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    
    // 디버깅을 위해 요청 정보 로깅
    console.log(`프록시 요청: ${req.method} ${req.path}`);
    console.log('요청 헤더:', JSON.stringify(req.headers, null, 2));
  },
  onProxyRes: (proxyRes, req, res) => {
    // 응답 헤더에 CORS 허용 헤더 추가
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  },
  // 프록시 로깅
  logLevel: 'debug'
}));

// 정적 파일 서빙 (빌드된 React 앱)
app.use(express.static(path.join(__dirname, 'dist')));

// 모든 경로에 대해 index.html 서빙 (SPA를 위한 설정)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`프록시 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`GitHub API 요청은 /api/github 경로로 프록시됩니다.`);
});