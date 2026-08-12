# ko-rebalance

한국주식 멀티팩터 ISA 분기 리밸런싱 Batch 프로그램

## 필요 조건

- Node.js 20+
- pnpm

## API 키 발급

### 한국투자증권 Open API

1. [KIS Developers](https://apiportal.koreainvestment.com/) 접속
2. 회원가입 후 **앱 등록**
3. APP KEY / APP SECRET 발급
4. ISA 계좌번호 확인

### DART OpenAPI

1. [OpenDART](https://opendart.fss.or.kr/) 접속
2. 회원가입 → **인증키 신청**
3. API 키 발급 (무료, 일 10,000건)

## 설치

```bash
git clone <repo>
cd auto-portfolio
pnpm install
cp .env.example .env
```

`.env` 파일에 발급받은 키를 입력:

```env
KIS_APP_KEY=발급받은_앱키
KIS_APP_SECRET=발급받은_시크릿키
KIS_ACCOUNT_NO=계좌번호
KIS_ACCOUNT_PRODUCT_CODE=01
KIS_ENV=virtual

DART_API_KEY=발급받은_DART_API키

AUTO_TRADE=false
```

## 실행

```bash
# dry-run (기본값 — 주문 없이 결과만 생성)
pnpm run rebalance

# 날짜/중복 검사 무시 (테스트용)
pnpm run rebalance -- --force

# 실제 주문 실행
pnpm run rebalance -- --execute
```

## 출력

실행 결과는 `output/` 디렉터리에 저장:

```
output/2026-Q3/
├── ranking.csv           # 팩터 스코어 랭킹
├── target-portfolio.csv  # 목표 포트폴리오
├── rebalance.csv         # 매수/매도/유지 주문안
└── result.json           # 전체 결과 (JSON)
```

## 데이터 소스

| 데이터 | 소스 |
|---|---|
| 종목 목록, 주가, 거래대금, 시가총액 | KIS Open API |
| 재무제표 (매출, 영업이익, 자산, 부채 등) | DART OpenAPI |
| 잔고 조회, 주문 | KIS Open API |
