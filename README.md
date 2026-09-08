# RankOn - 계약관리 시스템

내부 업무용 계약 관리 시스템입니다.

## 기술 스택

- Next.js (App Router), TypeScript, Tailwind CSS
- Prisma + SQLite
- bcryptjs, jose (세션), Zod, pdf-lib, Canvas 서명

## 빠른 시작

```bash
npm install
npm run setup
npm run dev
```

## 관리자 로그인

- URL: http://localhost:3000/admin/login
- ID: `vip080`
- PW: `qwer1234`

## 주요 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run setup` | DB 마이그레이션 + seed + storage 폴더 생성 |
| `npm run db:reset` | DB 초기화 및 재시드 |

## 저장 경로

- DB: `prisma/dev.db`
- 업로드: `storage/uploads`
- 서명: `storage/signatures`
- PDF: `storage/pdfs`

## 환경 변수

`.env.example` 참고
