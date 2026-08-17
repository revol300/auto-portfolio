# auto-portfolio

한국/미국 주식 분기 리밸런싱 Batch 프로그램

## 전략

| 시장 | 전략 | 종목 수 | 리밸런싱 | 상세 |
|---|---|---:|---|---|
| KO | 멀티팩터 (Value·Quality·Earnings·Momentum) | 20 | 3·6·9·12월 | [KO_STRATEGY.md](KO_STRATEGY.md) |
| US | EV/EBITDA 저평가 | 25 | 1·4·7·10월 | [US_STRATEGY.md](US_STRATEGY.md) |

## 필요 조건

- Node.js 20+
- pnpm

## API 키 발급

### 한국투자증권 Open API

1. [KIS Developers](https://apiportal.koreainvestment.com/) 접속
2. 회원가입 후 **앱 등록**
3. APP KEY / APP SECRET 발급
4. 계좌번호 확인 (한국주식용, 미국주식용 각각)

### DART OpenAPI (한국주식 전략 사용 시)

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
# 공통
KIS_APP_KEY=발급받은_앱키
KIS_APP_SECRET=발급받은_시크릿키
KIS_ENV=virtual

# 한국주식 계좌
KIS_KO_ACCOUNT_NO=계좌번호
KIS_KO_ACCOUNT_PRODUCT_CODE=01

# 미국주식 계좌
KIS_US_ACCOUNT_NO=계좌번호
KIS_US_ACCOUNT_PRODUCT_CODE=01

# DART (한국주식 전략 사용 시)
DART_API_KEY=발급받은_DART_API키
```

## 실행

```bash
# 한국주식 멀티팩터 리밸런싱 (dry-run)
pnpm run rebalance:ko

# 미국주식 EV/EBITDA 리밸런싱 (dry-run)
pnpm run rebalance:us

# 실제 주문 실행
pnpm run rebalance:ko -- --execute

# 주말/중복 검사 무시하고 강제 실행
pnpm run rebalance:ko -- --force
```

기본값은 dry-run으로, 주문 없이 결과만 생성한다. `--execute`를 명시해야 실제 주문이 나간다.

### 실행 전 검사

프로그램은 실행 시 두 가지를 자동으로 체크한다:

1. **주말 체크** — 토/일요일이면 `[Skip]` 출력 후 종료
2. **중복 실행 방지** — `output/{market}/{quarter}/` 디렉터리에서 `YYYYMMDD.json` 파일을 스캔하여, 7일 이내 실행 기록이 있으면 `[Skip]` 출력 후 종료

`--force` 옵션을 주면 두 검사를 모두 무시한다. 중복 실행을 재허용하려면 해당 json 파일을 삭제해도 된다.

## crontab 설정

```bash
# crontab 설치
crontab crontab

# 확인
crontab -l
```

| 시장 | 실행 월 | 실행 일 | 시각 | 설명 |
|---|---|---|---|---|
| KO | 3, 6, 9, 12 | 28~31일 | 15:00 | 장 마감 30분 전 |
| US | 1, 4, 7, 10 | 1~5일 | 06:00 | 미국장 마감 후 (KST) |

날짜 범위로 여러 날 걸어놓고, 실제 거래일에 수동으로 실행하거나 그대로 cron에 맡기면 된다.

## Stateless 설계

모든 실행은 독립적이다. KIS API에서 현재 자산/보유종목을 매번 조회하며, 로컬 DB나 상태 파일이 다음 실행에 영향을 주지 않는다. 결과 파일(CSV/JSON)은 사람이 확인하는 용도로만 출력한다.

## 출력

실행 결과는 `output/` 디렉터리에 시장별로 저장:

```
output/ko/2026-Q3/
├── ranking.csv           # 팩터 스코어 랭킹
├── target-portfolio.csv  # 목표 포트폴리오
├── rebalance.csv         # 매수/매도/유지 주문안
└── 20260930.json         # 전체 결과 (실행일 기준)

output/us/2026-Q4/
├── ranking.csv           # EV/EBITDA 랭킹
├── target-portfolio.csv
├── rebalance.csv
└── 20261005.json
```

## 데이터 소스

| 데이터 | 소스 | 시장 |
|---|---|---|
| 종목 목록, 주가, 거래대금, 시가총액 | KIS Open API | KO / US |
| 재무제표 (매출, 영업이익, 자산, 부채 등) | DART OpenAPI | KO |
| EBITDA, Debt, Cash | FundamentalsProvider (TBD) | US |
| 잔고 조회, 주문 | KIS Open API | KO / US |

## 백테스팅 레퍼런스

본 전략에서 사용하는 팩터(밸류, 퀄리티, 이익성장, 모멘텀)와 소형주 유니버스에 대한 학술 연구 및 백테스트 자료입니다.

### 한국 시장 팩터 연구

- **Enhanced Factor Investing in the Korean Stock Market** — 한국 주식시장의 싱글/멀티팩터 포트폴리오를 분석하여, 사이즈·밸류·모멘텀·수익성·저위험 팩터에 유의미한 리스크 프리미엄이 존재함을 확인. 사이즈 팩터가 가장 높은 수익률을 기록.
  [ScienceDirect (Pacific-Basin Finance Journal, 2021)](https://www.sciencedirect.com/science/article/abs/pii/S0927538X21000652)

- **Re-examination of Fama–French Models in the Korean Stock Market** — 파마-프렌치 5팩터 모델의 한국 시장 적용 연구. Size-B/M, Size-OP, Size-Inv 포트폴리오에서 소형주·고B/M·고수익성일수록 초과수익이 증가하는 패턴 확인.
  [Springer (Asia-Pacific Financial Markets, 2018)](https://link.springer.com/article/10.1007/s10690-018-9254-5)

- **Market Anomalies in the Korean Stock Market** — KOSPI/KOSDAQ 전체 유니버스에서 148개 이상의 아노말리를 복제·검증한 연구. 소형주(마이크로캡) 포함 여부와 동일가중/시가총액가중 방식에 따라 결과가 크게 달라짐을 보고.
  [Emerald (Journal of Derivatives and Quantitative Studies, 2020)](https://www.emerald.com/jdqs/article/28/2/3/206237/Market-anomalies-in-the-Korean-stock-market)

- **Momentum and Reversal Effects in the Korean Stock Market** — 한국 시장에서의 모멘텀/반전 효과 분석. KOSPI 200 구성종목 한정 시 모멘텀 전략의 수익성이 유의미하게 향상됨을 발견.
  [ResearchGate](https://www.researchgate.net/publication/388410691_Momentum_and_reversal_effects_in_the_Korean_stock_market)

- **The Momentum Strategies and Salience: Evidence from the Korean Stock Market** — 한국 주식시장에서의 모멘텀 전략 수익성 분석. 장기 모멘텀이 미국 시장보다 강하게 나타나며 이는 정보 확산 속도 차이에 기인할 수 있음을 시사.
  [Taylor & Francis (Emerging Markets Finance and Trade, 2022)](https://www.tandfonline.com/doi/abs/10.1080/1540496X.2022.2034615)

### 팩터 원론 (학술 논문)

- **The Other Side of Value: The Gross Profitability Premium** (Novy-Marx, 2013) — GP/A(매출총이익/총자산)가 전통적 밸류 지표만큼 주식 수익률 예측력이 있음을 최초로 실증. 본 전략의 퀄리티 팩터(GP/A) 핵심 근거.
  [ScienceDirect (Journal of Financial Economics)](https://www.sciencedirect.com/science/article/abs/pii/S0304405X13000044)

- **Momentum** (Jegadeesh & Titman, 2011) — 12-1 모멘텀 전략의 학술적 기초를 정리한 서베이 논문. 본 전략의 모멘텀 팩터(12개월 수익률 - 최근 1개월 제외) 설계 근거.
  [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1919226)

- **The Five-Factor Asset Pricing Model** (Fama & French, 2015) — 시장·사이즈·밸류에 수익성(RMW)·투자(CMA) 팩터를 추가한 5팩터 모델. 본 전략의 멀티팩터 프레임워크 이론적 배경.
  [ResearchGate](https://www.researchgate.net/publication/309194310_The_Five-Factor_Asset_Pricing_Model_Applications_to_the_Korean_Stock_Market)

### 한국 시장 실전 백테스트

- **R을 이용한 퀀트 투자 포트폴리오 만들기** (이현열) — PER+PBR+PSR+PCR+GP/A 콤보, 시총 하위 20% 소형주 필터, 동일가중 20종목 포트폴리오의 한국 시장 실전 백테스트. 본 전략의 직접적 참고 자료.
  [Online Book](https://hyunyulhenry.github.io/quant_cookbook/) | [GitHub](https://github.com/hyunyulhenry/quant_cookbook)

- **할 수 있다! 퀀트 투자** (강환국) — 소형주(하위 20%) + 밸류 + 퀄리티(GP/A, F-Score) 콤보 전략의 한국 시장 백테스트. 슈퍼 퀄리티 2.0 전략 소형주 적용 시 연평균 수익률 ~46% (MDD ~56%) 기록.
  [교보문고](https://product.kyobobook.co.kr/detail/S000001969114) | [IntelliQuant 백테스트](https://www.intelliquant.ai/article/867)

- **국내주식 퀀트 백테스트** — 한국 주식 퀀트 전략 백테스팅 플랫폼. 다양한 팩터 조합의 과거 성과를 직접 확인 가능.
  [backtest.kr](https://backtest.kr/quant-backtest)
