# TravelMapper

즉흥적인 여행자를 위한 유연한 여행 스케줄러

## 프로젝트 소개

여행 계획을 세울 때, 빡빡한 일정표는 부담스럽고 무계획은 불안합니다.
TravelMapper는 가고 싶은 장소들을 위시리스트에 미리 저장해두고, 여행 당일 상황에 맞춰 유연하게 일정을 확정할 수 있는 서비스입니다.

## 핵심 기능

- **스케줄 관리**: 여행 일정 생성 및 비밀번호 기반 접근
- **위시리스트**: 교통/숙박/식사/카페/관광지 5개 카테고리 관리
- **타임라인**: 24시간 30분 단위 그리드 기반 일정 배치
- **일정 확정**: 위시리스트 항목을 드래그하여 타임라인에 확정
- **"뭐 하지?" 추천**: 빈 시간대에 가능한 장소 자동 필터링
- **경로 탐색**: 확정 일정 간 Google Maps 길찾기
- **비용 관리**: 인당 비용 자동 계산 및 카테고리별 요약
- **공유**: 토큰 기반 읽기전용 링크 생성
- **다크 모드**: 시스템 설정 감지 + 수동 토글

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL (배포) / SQLite (로컬 개발) |
| Maps | Google Maps Platform (Places, Directions, Routes API) |
| 배포 | Vercel |

## 개발 관리

- **브랜치 전략**: `main` → `dev` → `feature-*`
- **Task 관리**: [GitHub Issues](../../issues)
- **기획/문서**: [GitHub Wiki](../../wiki)
- **PR 전략**: feature 브랜치에서 dev로 PR

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local
# .env.local에 Google Maps API Key 설정
npm run dev
```

Supabase 환경변수 없이 실행하면 자동으로 SQLite(로컬 DB)를 사용합니다.
