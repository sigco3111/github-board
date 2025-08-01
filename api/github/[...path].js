// api/github/[...path].js - Vercel 서버리스 함수
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // path 파라미터 가져오기
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  const githubUrl = `https://api.github.com/${apiPath}`;
  
  // 요청 헤더 설정
  const headers = {
    'User-Agent': 'GitHub-Dashboard-App/1.0',
    'Accept': 'application/vnd.github.v3+json',
  };
  
  // Authorization 헤더가 있으면 전달
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }
  
  try {
    console.log(`GitHub API 요청: ${githubUrl}`);
    
    const response = await fetch(githubUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    // GitHub API 응답 헤더 복사
    const responseHeaders = response.headers;
    for (const [key, value] of Object.entries(Object.fromEntries(responseHeaders.entries()))) {
      res.setHeader(key, value);
    }
    
    // 응답 데이터 반환
    const data = await response.text();
    return res.status(response.status).send(data);
  } catch (error) {
    console.error(`GitHub API 요청 오류: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}