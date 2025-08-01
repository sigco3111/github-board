# Vercel 배포 가이드

이 문서는 GitHub Board 애플리케이션을 Vercel에 배포하는 방법을 설명합니다.

## 사전 준비

1. [Vercel](https://vercel.com) 계정
2. GitHub 계정 (소스 코드 저장소 연결용)

## 배포 단계

### 1. 프로젝트 설정 확인

배포하기 전에 다음 파일들이 프로젝트에 포함되어 있는지 확인하세요:

- `vercel.json` - Vercel 설정 파일 (API 라우팅 및 서버리스 함수 설정)
- `api/github/[...path].js` - GitHub API 프록시 서버리스 함수

### 2. Vercel에 배포하기

#### GitHub 저장소에서 직접 배포

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인합니다.
2. "New Project" 버튼을 클릭합니다.
3. "Import Git Repository" 섹션에서 GitHub 계정을 연결하고 프로젝트 저장소를 선택합니다.
4. 프로젝트 설정 화면에서 다음 설정을 확인합니다:
   - **Framework Preset**: `Other` 또는 `Vite`
   - **Build Command**: `npm run build` 또는 `vite build`
   - **Output Directory**: `dist`
5. "Deploy" 버튼을 클릭하여 배포를 시작합니다.

#### 로컬 프로젝트 배포

1. Vercel CLI를 설치합니다: `npm i -g vercel`
2. 프로젝트 디렉토리에서 `vercel` 명령어를 실행합니다.
3. 프롬프트에 따라 설정을 완료합니다.

### 3. 환경 변수 설정 (선택사항)

GitHub API 요청 제한을 늘리기 위해 개인 액세스 토큰을 환경 변수로 설정할 수 있습니다:

1. Vercel 대시보드에서 프로젝트를 선택합니다.
2. "Settings" > "Environment Variables"로 이동합니다.
3. 새 환경 변수를 추가합니다:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: 귀하의 GitHub 개인 액세스 토큰
   - **Environment**: Production, Preview, Development (필요에 따라 선택)

### 4. 배포 확인

배포가 완료되면 Vercel이 제공하는 URL로 접속하여 애플리케이션이 정상적으로 작동하는지 확인합니다:

- 홈 화면 로드
- 사용자 검색 기능
- GitHub API 연동 (저장소 목록, 팔로워 등)

### 5. 문제 해결

배포 후 문제가 발생하면 다음을 확인하세요:

1. **API 요청 404 오류**:
   - `vercel.json` 파일이 올바르게 설정되었는지 확인
   - 서버리스 함수 파일이 `api/github/[...path].js` 경로에 있는지 확인

2. **CORS 오류**:
   - `vercel.json`의 헤더 설정 확인
   - 서버리스 함수에서 CORS 헤더가 올바르게 설정되었는지 확인

3. **API 속도 제한 오류**:
   - GitHub 토큰이 환경 변수로 올바르게 설정되었는지 확인
   - 토큰의 권한 범위가 충분한지 확인

### 6. 커스텀 도메인 설정 (선택사항)

1. Vercel 대시보드에서 프로젝트를 선택합니다.
2. "Settings" > "Domains"로 이동합니다.
3. 원하는 도메인을 추가하고 DNS 설정을 완료합니다.

## 추가 참고 사항

- Vercel은 기본적으로 모든 배포에 대해 HTTPS를 제공합니다.
- GitHub API 요청 제한은 인증되지 않은 요청의 경우 시간당 60회, 인증된 요청의 경우 시간당 5,000회입니다.
- 서버리스 함수는 실행 시간과 메모리 사용량에 제한이 있습니다. 자세한 내용은 [Vercel 문서](https://vercel.com/docs/functions/serverless-functions)를 참조하세요.