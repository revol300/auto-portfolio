# KIS 기반 미국주식 EV/EBITDA 분기 리밸런싱 구현 기획서

## 1. 목적

기존 배치 프로그램 뼈대를 유지하면서, 미국주식 EV/EBITDA 전략의 종목 선정과 리밸런싱을 다음 원칙으로 구현한다.

- **KIS 해외주식 조건검색 API**에서 처리 가능한 조건은 최대한 KIS에 위임한다.
- KIS 조건검색에서 지원하지 않는 조건은 **Batch Program**에서 후처리한다.
- KIS는 후보군 생성, 시세/계좌/주문 실행의 주 인터페이스로 사용한다.
- 전략의 핵심인 **EBITDA / Enterprise Value 계산과 랭킹**은 Batch에서 수행한다.
- 리밸런싱 주기는 **3개월(분기 1회)** 로 고정한다.

---

## 2. 최종 전략 정의

### Universe

- 미국 NASDAQ / NYSE / AMEX
- 보통주만 포함
- ETF / ETN / ETP 제외
- ADR/DR 제외
- 금융주 제외

### 기본 필터

- Price >= **$5**
- Market Cap >= **$500M**
- Liquidity >= **$5M/day**
- EBITDA TTM > **0**
- EV/EBITDA > **0**

### Ranking

```text
EV/EBITDA 오름차순
```

즉 가장 저평가된 종목부터 선택한다.

### Portfolio

- 상위 **25종목**
- 동일가중
- 기본 목표 비중: 종목당 약 **4%**
- 주문 오차/현금 부족 방지를 위해 실제 구현에서는 총 투자비중을 `99%` 정도로 제한 가능

### Rebalance

```text
1월 / 4월 / 7월 / 10월
```

분기 1회 실행한다.

---

# 3. KIS 조건검색에서 처리 가능한 부분

KIS 공식 해외주식 조건검색 API는 다음 조건을 제공한다.

| KIS 조건 | API Parameter | 본 전략 사용 여부 |
|---|---|---:|
| 현재가 | `CO_YN_PRICECUR` | O |
| 등락률 | `CO_YN_RATE` | X |
| 시가총액 | `CO_YN_VALX` | O |
| 발행주식수 | `CO_YN_SHAR` | X |
| 거래량 | `CO_YN_VOLUME` | 선택 |
| 거래대금 | `CO_YN_AMT` | 선택 |
| EPS | `CO_YN_EPS` | X |
| PER | `CO_YN_PER` | X |

따라서 KIS 조건검색은 **전략 전체를 구현하는 도구가 아니라 1차 후보군을 줄이는 역할**로 사용한다.

---

# 4. KIS 조건검색 설정

미국 거래소는 거래소별로 각각 조회한 뒤 Batch에서 합친다.

```text
NASDAQ = NAS
NYSE   = NYS
AMEX   = AMS
```

## 4.1 현재가

```text
Price >= $5
```

KIS 조건:

```text
CO_YN_PRICECUR = 1
CO_ST_PRICECUR = 5
CO_EN_PRICECUR = API 허용 최대값
```

---

## 4.2 시가총액

```text
Market Cap >= $500M
```

KIS 해외주식 조건검색의 시가총액 단위는 `천` 단위이므로 미국주식 기준 $500M은 다음 값에 해당한다.

```text
$500,000,000 / 1,000
= 500,000
```

따라서 개념적으로:

```text
CO_YN_VALX = 1
CO_ST_VALX = 500000
CO_EN_VALX = API 허용 최대값
```

실제 최대값은 KIS 호출 테스트를 통해 허용 범위를 확인한 뒤 config 값으로 관리한다.

---

# 5. 거래대금 필터 처리

전략의 유동성 조건은:

```text
Dollar Volume >= $5M/day
```

KIS 조건검색에는 `거래대금` 필터가 존재하므로 직접 사용할 수 있다.

```text
CO_YN_AMT = 1
CO_ST_AMT = 5000
```

KIS 거래대금 조건도 `천` 단위이므로 $5M은 `5000`에 해당한다.

다만 **실행 시점에 따라 당일 누적 거래대금 값이 달라지는 문제가 있다.**

예를 들어 미국장 개장 5분 후 배치를 실행하면 정상적으로 유동성이 높은 종목도 아직 거래대금 $5M을 넘지 못할 수 있다.

따라서 운영 방식은 아래 둘 중 하나를 선택한다.

### 권장 방식

거래대금 필터를 KIS 조건검색에서 사용하지 않고 Batch에서 **직전 완료 거래일의 거래대금** 또는 **최근 20거래일 평균 Dollar Volume**으로 계산한다.

```text
AVG_DOLLAR_VOLUME_20D >= $5M
```

### 단순 방식

미국장 종료 이후 종목 선정 배치를 수행한다면 KIS 조건검색의 거래대금 조건을 그대로 사용한다.

MVP에서는 어느 방식을 사용하는지 config로 선택 가능하게 한다.

```yaml
liquidity:
  mode: avg_20d
  minDollarVolume: 5000000
```

권장 기본값은 `avg_20d`이다.

---

# 6. KIS 조건검색에서 처리할 수 없는 부분

다음은 해외주식 조건검색 API 파라미터에 존재하지 않는다.

| 조건 | KIS 조건검색 | 처리 위치 |
|---|---:|---|
| 보통주 여부 | X | Batch + KIS Master |
| ETF/ETN/ETP 제외 | X | Batch + KIS Master |
| ADR/DR 제외 | X | Batch + KIS Master |
| 금융주 제외 | X | Batch |
| EBITDA TTM | X | Batch + Fundamentals Provider |
| Total Debt | X | Batch + Fundamentals Provider |
| Cash | X | Batch + Fundamentals Provider |
| Enterprise Value | X | Batch 계산 |
| EV/EBITDA | X | Batch 계산 |
| EV/EBITDA 정렬 | X | Batch |
| Top 25 | X | Batch |
| 동일가중 | X | Batch |
| 현재 포트폴리오 비교 | X | Batch + KIS Account API |
| 매수/매도 수량 계산 | X | Batch |

---

# 7. KIS 해외종목 Master 활용

KIS 해외종목 마스터에는 다음 정보가 있다.

```text
Security type
DR 여부
업종분류코드
ETF/ETN 구분코드
거래소
Symbol
```

따라서 KIS 조건검색 결과와 Master를 JOIN하여 정적 필터를 적용한다.

## 7.1 보통주만 선택

KIS Master 기준:

```text
Security type = 2
```

만 허용한다.

제외:

```text
1 = Index
3 = ETP / ETF
4 = Warrant
```

---

## 7.2 DR 제외

```text
DR 여부 == N
```

만 허용한다.

즉 ADR을 포함한 DR 상품은 제거한다.

---

## 7.3 ETF / ETN 추가 검증

가능하면 Security Type 검사와 함께 구분코드도 검사한다.

```text
001 = ETF
002 = ETN
003 = ETC
```

해당 타입은 후보에서 제거한다.

---

# 8. 금융주 제외

KIS 조건검색 자체에서는 금융 섹터 제외 조건을 줄 수 없다.

Batch에서 처리한다.

우선순위는 다음과 같다.

```text
1. Fundamentals Provider의 표준 Sector
2. KIS Master의 업종분류코드
```

Fundamentals Provider가 다음과 같이 표준화된 sector를 제공하면 가장 간단하다.

```text
Financial Services
Financials
Banks
Insurance
Capital Markets
```

금융업 분류에 포함되면 제외한다.

구현에서는 문자열 직접 비교보다 내부 enum으로 정규화한다.

```ts
enum Sector {
  Financials,
  Technology,
  Healthcare,
  Consumer,
  Industrial,
  Energy,
  Utilities,
  RealEstate,
  Materials,
  Communication,
  Unknown,
}
```

```text
sector === Financials
→ 제외
```

KIS Master의 업종분류코드는 보조 데이터로 사용하고, 실제 금융 섹터 매핑 테이블은 별도 config 또는 metadata module로 관리한다.

---

# 9. EBITDA / EV 데이터

KIS 해외주식 조건검색에서는 EBITDA나 EV/EBITDA를 직접 필터링할 수 없다.

따라서 Batch에 별도의 Fundamentals Adapter를 둔다.

예시 인터페이스:

```ts
interface Fundamentals {
  symbol: string;
  asOfDate: string;

  ebitdaTtm: number | null;
  totalDebt: number | null;
  cashAndEquivalents: number | null;

  sector?: string;
}

interface FundamentalsProvider {
  get(symbols: string[]): Promise<Fundamentals[]>;
}
```

Provider 구현체는 추후 교체 가능하게 한다.

```text
Batch Logic
     |
     +-- KIS
     |
     +-- FundamentalsProvider
              |
              +-- Provider A
              +-- Provider B
              +-- Local DB
```

Batch 핵심 로직이 특정 데이터 업체 API에 직접 의존하지 않도록 한다.

---

# 10. Enterprise Value 계산

기본 계산식:

```text
EV = Market Cap
     + Total Debt
     - Cash & Cash Equivalents
```

가능한 데이터가 있으면 다음 항목까지 포함할 수 있다.

```text
EV = Market Cap
   + Total Debt
   + Preferred Stock
   + Minority Interest
   - Cash & Cash Equivalents
```

하지만 백테스트와 실거래 구현의 정의가 달라지면 결과가 달라지므로 **한 번 정의하면 동일 공식을 계속 사용해야 한다.**

MVP 기본값:

```text
EV = MarketCap + TotalDebt - Cash
```

Market Cap은 KIS 현재 데이터를 사용한다.

---

# 11. EV/EBITDA 계산

Batch에서:

```ts
const ev = marketCap + totalDebt - cash;
const evEbitda = ev / ebitdaTtm;
```

다음 데이터는 제외한다.

```text
EBITDA <= 0
EV <= 0
EV/EBITDA <= 0
NaN
Infinity
필수 데이터 Missing
```

---

# 12. 전체 종목 선정 Pipeline

```text
KIS NAS 조건검색
      +
KIS NYS 조건검색
      +
KIS AMS 조건검색
      |
      v
Merge + Deduplicate
      |
      v
KIS Master Join
      |
      +-- Common Stock only
      +-- ETF/ETN/ETP 제거
      +-- DR 제거
      |
      v
Liquidity Filter
      |
      v
Fundamentals 조회
      |
      +-- Financials 제거
      +-- EBITDA TTM > 0
      |
      v
EV 계산
      |
      v
EV/EBITDA 계산
      |
      +-- EV > 0
      +-- EV/EBITDA > 0
      |
      v
EV/EBITDA ASC 정렬
      |
      v
TOP 25
      |
      v
Equal Weight Target
```

---

# 13. Batch 실행 Flow

Batch 엔트리포인트 예시:

```text
rebalance
```

전체 흐름:

```text
1. 실행 가능일 확인
2. KIS 인증
3. KIS Master 최신화
4. NAS / NYS / AMS 후보 조회
5. 후보 Merge
6. Security Type / DR 필터
7. Liquidity 계산 및 필터
8. Fundamentals 조회
9. 금융주 제외
10. EBITDA > 0 필터
11. EV 계산
12. EV/EBITDA 계산
13. EV/EBITDA ASC
14. TOP 25
15. KIS 현재 보유종목 조회
16. 현재 평가금액 / 현금 조회
17. Target Portfolio 계산
18. 주문 Diff 생성
19. 매도 실행
20. 체결 확인 / 잔고 갱신
21. 매수 실행
22. 결과 저장
23. 종료
```

---

# 14. 리밸런싱 날짜

분기 시작 월:

```text
January
April
July
October
```

단순히 날짜 `1일`을 기준으로 실행하면 주말/휴장일 문제가 있으므로 Batch 내부에서 미국장 거래일을 확인한다.

권장 규칙:

```text
해당 월의 첫 번째 미국 거래일
```

실거래에서 장 초반 당일 거래대금을 유동성 조건으로 사용하지 않기 위해, 유동성 필터는 직전 완료일 또는 20일 평균 데이터로 계산한다.

---

# 15. 포트폴리오 Target 계산

Top 25를 동일가중한다.

```text
TARGET_INVESTMENT_RATIO = 0.99
TARGET_COUNT = 25
```

따라서:

```text
targetWeight = 0.99 / 25
             = 0.0396
             = 3.96%
```

계좌 총 평가자산:

```text
NAV = Cash + Stock Market Value
```

종목별 목표 금액:

```text
targetValue = NAV * 0.0396
```

주문 수량:

```text
quantity = floor(targetValue / currentPrice)
```

잔여 현금은 다음 분기까지 유지한다.

---

# 16. 주문 Diff

현재 포트폴리오:

```text
Current
```

목표 포트폴리오:

```text
Target
```

Batch가 차이를 계산한다.

## Case 1. 기존 보유 + Target 제외

```text
SELL ALL
```

## Case 2. 기존 보유 + Target 유지

```text
Target Quantity - Current Quantity
```

차이만큼 매수/매도한다.

## Case 3. 신규 Target

```text
BUY Target Quantity
```

---

# 17. 주문 순서

권장:

```text
1. 제거 종목 매도
2. 비중 축소 종목 매도
3. 매도 체결 확인
4. 계좌 잔고 재조회
5. 신규/비중 증가 종목 매수
```

매도를 먼저 수행하여 매수 가능 현금을 확보한다.

---

# 18. KIS Adapter 구조

기존 프로그램의 KIS wrapper가 있다면 다음 역할만 보장하면 된다.

```ts
interface KisClient {
  searchUSStocks(condition: KisSearchCondition): Promise<KisStock[]>;

  getUSMaster(): Promise<KisMasterStock[]>;

  getDailyPrices(
    exchange: string,
    symbol: string,
    days: number,
  ): Promise<DailyPrice[]>;

  getHoldings(): Promise<Holding[]>;

  getBalance(): Promise<AccountBalance>;

  getPrice(exchange: string, symbol: string): Promise<number>;

  sell(order: SellOrder): Promise<OrderResult>;

  buy(order: BuyOrder): Promise<OrderResult>;
}
```

---

# 19. Strategy Layer

KIS API 호출과 전략 로직을 분리한다.

```text
KisClient
   |
   v
UniverseService
   |
   v
FundamentalService
   |
   v
EvEbitdaStrategy
   |
   v
PortfolioService
   |
   v
OrderService
```

각 책임:

### UniverseService

```text
KIS 조건검색
Master Join
ETF/DR 제거
Liquidity Filter
```

### FundamentalService

```text
EBITDA
Debt
Cash
Sector
```

### EvEbitdaStrategy

```text
EV 계산
EV/EBITDA 계산
Ranking
Top 25
```

### PortfolioService

```text
Equal Weight
Current vs Target Diff
수량 계산
```

### OrderService

```text
Sell
Buy
체결 확인
Retry
```

---

# 20. 추천 디렉터리 구조

```text
src/
├── batch/
│   └── rebalance.ts
│
├── kis/
│   ├── kisClient.ts
│   ├── conditionSearch.ts
│   ├── master.ts
│   ├── account.ts
│   └── order.ts
│
├── fundamentals/
│   ├── fundamentalsProvider.ts
│   └── provider.ts
│
├── strategy/
│   └── evEbitdaStrategy.ts
│
├── universe/
│   └── universeService.ts
│
├── portfolio/
│   └── portfolioService.ts
│
├── order/
│   └── orderService.ts
│
├── config/
│   └── strategy.ts
│
└── model/
    ├── stock.ts
    ├── fundamentals.ts
    └── portfolio.ts
```

기존 프로젝트 구조가 이미 있다면 디렉터리 자체를 맞출 필요는 없고 책임 분리만 유지한다.

---

# 21. Strategy Config

전략 값은 코드에 박지 않고 config로 분리한다.

```ts
export const EV_EBITDA_STRATEGY = {
  exchanges: ["NAS", "NYS", "AMS"],

  minPrice: 5,
  minMarketCap: 500_000_000,

  liquidity: {
    mode: "avg_20d",
    minDollarVolume: 5_000_000,
    lookbackDays: 20,
  },

  excludeFinancials: true,
  excludeDr: true,
  commonStockOnly: true,

  minEbitda: 0,
  minEvEbitda: 0,

  targetCount: 25,
  investmentRatio: 0.99,

  rebalanceMonths: [1, 4, 7, 10],
};
```

---

# 22. KIS 조건검색 Request Builder

개념적으로 다음 조건만 KIS에 넘긴다.

```ts
function buildCondition(exchange: string) {
  return {
    EXCD: exchange,

    CO_YN_PRICECUR: "1",
    CO_ST_PRICECUR: "5",
    CO_EN_PRICECUR: MAX_PRICE,

    CO_YN_VALX: "1",
    CO_ST_VALX: "500000",
    CO_EN_VALX: MAX_MARKET_CAP,

    // 권장 구현에서는 liquidity를 batch에서 계산
    CO_YN_VOLUME: "",
    CO_YN_AMT: "",

    CO_YN_EPS: "",
    CO_YN_PER: "",
  };
}
```

세 거래소 각각 호출한다.

```ts
const results = await Promise.all([
  kis.searchUSStocks(buildCondition("NAS")),
  kis.searchUSStocks(buildCondition("NYS")),
  kis.searchUSStocks(buildCondition("AMS")),
]);

const universe = deduplicate(results.flat());
```

---

# 23. Ranking 구현

```ts
interface RankedStock {
  symbol: string;
  exchange: string;

  marketCap: number;
  ebitdaTtm: number;
  totalDebt: number;
  cash: number;

  enterpriseValue: number;
  evEbitda: number;
}
```

```ts
const ranked = stocks
  .filter((stock) => stock.ebitdaTtm > 0)
  .map((stock) => {
    const enterpriseValue =
      stock.marketCap + stock.totalDebt - stock.cash;

    return {
      ...stock,
      enterpriseValue,
      evEbitda: enterpriseValue / stock.ebitdaTtm,
    };
  })
  .filter((stock) =>
    Number.isFinite(stock.evEbitda) &&
    stock.enterpriseValue > 0 &&
    stock.evEbitda > 0
  )
  .sort((a, b) => a.evEbitda - b.evEbitda)
  .slice(0, 25);
```

---

# 24. 중요한 데이터 규칙

## 24.1 Fundamentals Missing

다음 중 하나라도 없으면 해당 종목은 제외한다.

```text
EBITDA
Debt
Cash
```

시장 전체를 대상으로 하기 때문에 몇 종목을 억지로 보완하기 위해 추정치를 만들 필요가 없다.

---

## 24.2 동일 시점 데이터

가능하면 Fundamentals Provider에서 다음 값을 보존한다.

```text
asOfDate
reportedDate / filedDate
```

실행 로그에도 저장한다.

```text
AAPL
EBITDA = ...
asOf = 2026-06-30
reported = 2026-08-01
```

백테스트와 실거래 전략 정의를 비교할 때 매우 중요하다.

---

## 24.3 Market Cap

EV 계산에 들어가는 Market Cap은 Fundamentals Provider의 오래된 값보다 **리밸런싱 시점 KIS Market Cap**을 우선 사용한다.

```text
Market Cap  → KIS
Debt        → Fundamentals
Cash        → Fundamentals
EBITDA TTM  → Fundamentals
```

---

# 25. Survivorship Bias / Corporate Action 관련

이 문서는 **실시간 리밸런싱 프로그램**이므로 survivorship bias는 백테스트와 성격이 다르다.

현재 시점에서 실제 거래 가능한 종목을 고르는 것이 목적이므로 현재 KIS Master를 사용하는 것이 정상이다.

다만 운영 중에는 다음을 지킨다.

```text
매 실행 시 Master 최신화
Symbol 변경 반영
DR/ETF 타입 변경 반영
현재 보유종목은 KIS 계좌 조회를 source of truth로 사용
```

과거 성과 검증은 이 Batch가 아니라 QuantConnect/LEAN 백테스트에서 survivorship bias 및 corporate action 보정을 처리한다.

실거래 Batch와 백테스트는 **동일한 전략 파라미터와 EV 계산식**을 공유하는 것이 중요하다.

---

# 26. Idempotency

Batch는 중복 실행돼도 주문이 중복 발생하면 안 된다.

리밸런싱 Key:

```text
YYYY-QN
```

예:

```text
2026-Q1
2026-Q2
2026-Q3
2026-Q4
```

DB 또는 상태파일에 다음을 저장한다.

```ts
interface RebalanceRun {
  key: string;
  startedAt: string;
  completedAt?: string;

  status:
    | "STARTED"
    | "SELECTED"
    | "SELLING"
    | "BUYING"
    | "COMPLETED"
    | "FAILED";
}
```

이미 `COMPLETED`인 Key는 다시 실행하지 않는다.

---

# 27. Dry Run

실전 주문 전에 반드시 지원한다.

```bash
node dist/rebalance.js --dry-run
```

Dry Run 결과 예시:

```text
Rebalance: 2026-Q4

Candidates after KIS: 1,834
After master filter:   1,612
After liquidity:       1,380
After financial:       1,145
After EBITDA:          1,012

Top 25
--------------------------------
1  ABC   EV/EBITDA 2.91
2  XYZ   EV/EBITDA 3.04
...
25 DEF   EV/EBITDA 4.87

SELL
--------------------------------
AAA 100
BBB  42

BUY
--------------------------------
ABC 31
XYZ 18
```

`--dry-run`에서는 주문 API를 절대 호출하지 않는다.

---

# 28. Logging

최소한 다음을 남긴다.

```text
rebalanceKey
executionTime
candidateCount
filteredCount
selectedCount
selectedSymbols
EV
EBITDA
EV/EBITDA
currentPortfolio
targetPortfolio
sellOrders
buyOrders
KIS order id
fill result
error
```

특히 최종 선정 종목의 계산 근거는 반드시 저장한다.

예:

```json
{
  "symbol": "ABC",
  "marketCap": 12000000000,
  "debt": 2000000000,
  "cash": 1000000000,
  "ebitdaTtm": 3000000000,
  "ev": 13000000000,
  "evEbitda": 4.3333
}
```

나중에 왜 특정 종목을 매수했는지 재현할 수 있어야 한다.

---

# 29. Error Handling

## KIS Condition Search 실패

거래소 하나라도 실패하면 기본적으로 전체 리밸런싱을 중단한다.

```text
NAS success
NYS success
AMS fail

→ Abort
```

부분 Universe로 매수하면 전략이 달라지기 때문이다.

---

## Fundamentals 실패

개별 종목 실패:

```text
해당 종목 제외
```

Provider 전체 장애:

```text
Abort
```

---

## 매도 일부 실패

매수 단계로 바로 넘어가지 않는다.

```text
Sell
→ Fill Check
→ Balance Refresh
→ Buy
```

순서를 유지한다.

---

# 30. 운영 전 검증

## Phase 1 — Universe 확인

주문 없이:

```text
KIS 조건검색
→ Master Filter
→ Fundamentals
→ EV/EBITDA
→ Top 25 출력
```

만 실행한다.

---

## Phase 2 — Dry Run Portfolio

실제 계좌를 조회하되 주문은 하지 않는다.

```text
Current
vs
Target
```

Diff를 확인한다.

---

## Phase 3 — 모의투자

KIS 모의투자에서 주문 Flow를 검증한다.

```text
SELL
→ Fill
→ BUY
```

---

## Phase 4 — 실전

분기 리밸런싱에 적용한다.

---

# 31. 책임 분리 최종 정리

## KIS Condition Search

```text
미국 거래소 후보 조회
Price >= $5
Market Cap >= $500M
```

조건에 따라:

```text
거래대금 조건
```

까지 추가할 수 있다.

---

## KIS Master

```text
보통주 여부
ETF / ETP 여부
DR 여부
거래소
업종 코드
```

---

## Fundamentals Provider

```text
EBITDA TTM
Debt
Cash
Sector
```

---

## Batch Program

```text
NASDAQ + NYSE + AMEX Merge
Master Filter
Liquidity Filter
Financial 제외
EBITDA > 0
EV 계산
EV/EBITDA 계산
EV/EBITDA ASC Ranking
Top 25
Equal Weight
Current vs Target Diff
Sell
Buy
Logging
Idempotency
```

---

# 32. 최종 Architecture

```text
                     +------------------+
                     |   cron / manual  |
                     +--------+---------+
                              |
                              v
                    +-------------------+
                    | Rebalance Batch   |
                    +---------+---------+
                              |
            +-----------------+------------------+
            |                 |                  |
            v                 v                  v
     +-------------+   +--------------+   +-------------+
     | KIS Search  |   | KIS Master   |   | Fundamental |
     | API         |   |              |   | Provider    |
     +------+------+   +------+-------+   +------+------+ 
            |                 |                  |
            +-----------------+------------------+
                              |
                              v
                     +------------------+
                     | Universe Filter  |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     | EV/EBITDA Rank   |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     | TOP 25           |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     | Portfolio Diff   |
                     +--------+---------+
                              |
                              v
              +---------------+---------------+
              |                               |
              v                               v
       +-------------+                 +-------------+
       | KIS Account |                 | KIS Order   |
       +-------------+                 +-------------+
```

---

# 33. 구현 우선순위

기존 뼈대가 존재한다는 전제로 신규 구현은 다음 순서로 진행한다.

### P0

```text
KIS 해외주식 조건검색 Adapter
NASDAQ / NYSE / AMEX Merge
KIS Master Loader
Common Stock / DR / ETF Filter
```

### P1

```text
FundamentalsProvider Interface
EBITDA / Debt / Cash 수집
EV 계산
EV/EBITDA Ranking
Top 25
```

### P2

```text
KIS Balance 조회
Equal Weight
Portfolio Diff
```

### P3

```text
Sell / Buy Order
체결 확인
Retry
```

### P4

```text
Idempotency
Dry Run
Execution Log
분기 실행일 검증
```

---

# 34. 핵심 구현 원칙

이 전략에서 KIS 조건검색은 다음 역할까지만 맡긴다.

```text
"싸고 거래 가능한 미국주식 후보군을 빠르게 줄이는 역할"
```

전략의 Alpha를 결정하는 핵심 로직은 Batch에 둔다.

```text
EBITDA
EV
EV/EBITDA
Ranking
Top 25
```

즉 전체 구조는 다음 한 줄로 정리할 수 있다.

```text
KIS = Universe / Market / Account / Order
Batch = Strategy / Ranking / Rebalancing
Fundamentals Provider = EV/EBITDA 원천 재무데이터
```

이 구조로 구현하면 KIS 조건검색 기능이 변경되거나 Fundamentals 데이터 공급자를 교체하더라도 전략 코어는 유지할 수 있다.
