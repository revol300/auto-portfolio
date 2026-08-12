# 한국주식 멀티팩터 ISA 분기 리밸런싱 시스템 기획서

## 1. 실행 구조 변경

본 시스템은 웹 서버를 운영하지 않는다.

**Node.js + TypeScript 기반의 일회성 Batch/CLI 프로그램**으로 구현한다.

```text
crontab
   ↓
npx tsx src/index.ts rebalance
   ↓
KIS 인증
   ↓
종목/재무/가격 데이터 조회
   ↓
Universe 생성
   ↓
Factor Ranking
   ↓
Target Portfolio 생성
   ↓
ISA 현재 보유종목 조회
   ↓
Rebalance Plan 생성
   ↓
결과 저장
   ↓
프로세스 종료
```

프로그램은 실행이 끝나면 즉시 종료한다.

상시 실행 프로세스, Express 서버, HTTP Endpoint는 사용하지 않는다.

## 2. 실행 방식

기본 명령어:

```bash
npm run rebalance
```

또는:

```bash
npx tsx src/index.ts rebalance
```

dry-run:

```bash
npx tsx src/index.ts rebalance --dry-run
```

향후 자동 주문:

```bash
npx tsx src/index.ts rebalance --execute
```

기본값은 항상:

```text
dryRun = true
```

로 한다.

`--execute`를 명시적으로 전달한 경우에만 실제 주문이 가능하도록 한다.

## 3. 스케줄

리밸런싱:

```text
3월
6월
9월
12월
```

분기 마지막 거래일을 기준으로 실행한다.

다만 cron이 한국 거래소 휴장일을 판단하도록 만들지 않는다.

예를 들어:

```cron
30 16 28-31 3,6,9,12 * cd /app/quant && npm run rebalance
```

처럼 월말 며칠 동안 실행시키고 프로그램 내부에서:

```typescript
if (!isRebalanceMonth(today)) {
  return;
}

if (!await isLastTradingDay(today)) {
  return;
}
```

를 검사한다.

따라서 실제 리밸런싱은 **분기 마지막 거래일에 단 한 번만 수행**된다.

중복 실행 방지를 위해 해당 분기의 성공 실행 기록이 존재하면 종료한다.

```typescript
if (await alreadyRebalanced(currentQuarter)) {
  return;
}
```

## 4. 전략

전략 자체는 기존 설계를 유지한다.

```text
KOSPI + KOSDAQ

↓

거래불가/특수종목 제거

↓

유동성 필터

20일 평균 거래대금 >= 5억원

↓

시가총액 하위 20%

↓

Factor Ranking
```

Factor:

```text
Value                30%
Quality              30%
Earnings Momentum    30%
Price Momentum       10%
```

최종:

```text
FINAL_SCORE =
VALUE × 0.30
+ QUALITY × 0.30
+ EARNINGS × 0.30
+ MOMENTUM × 0.10
```

## 5. Value

사용 지표:

```text
PER
PBR
PSR
PCR
```

각 지표를 Universe 내 percentile rank로 변환한다.

낮을수록 좋은 값이므로 역순으로 점수를 부여한다.

```text
VALUE_SCORE =
(
  PER_SCORE
  + PBR_SCORE
  + PSR_SCORE
  + PCR_SCORE
) / 4
```

## 6. Quality

사용 지표:

```text
GP/A
ROA
Asset Growth
Debt Ratio
```

방향:

```text
GP/A          높을수록 좋음
ROA           높을수록 좋음
Asset Growth  낮을수록 좋음
Debt Ratio    낮을수록 좋음
```

최종:

```text
QUALITY_SCORE =
(
  GPA_SCORE
  + ROA_SCORE
  + ASSET_GROWTH_SCORE
  + DEBT_SCORE
) / 4
```

## 7. Earnings Momentum

사용 지표:

```text
영업이익 YoY
순이익 YoY
```

가능하면 단일 분기보다 누적 YoY를 사용한다.

```text
EARNINGS_SCORE =
(
  OPERATING_PROFIT_GROWTH_SCORE
  + NET_INCOME_GROWTH_SCORE
) / 2
```

## 8. Price Momentum

최근 한 달을 제외한다.

```text
12-1 Momentum
```

공식:

```text
가격(t - 1개월)
/
가격(t - 12개월)
- 1
```

전체 Factor 중 10%만 반영한다.

## 9. Portfolio

최종:

```text
20종목
동일가중
```

목표 투자비중:

```text
전체 자산의 98%
```

현금:

```text
2%
```

따라서 종목당:

```text
98% / 20 = 4.9%
```

를 목표로 한다.

## 10. 종목 교체 규칙

Turnover를 줄이기 위해 Buffer를 사용한다.

```text
신규 진입 = Rank 1~20

기존 보유 유지 = Rank 1~30

매도 = Rank 31 이하
```

Universe 자체에서 탈락한 경우에는 순위에 관계없이 매도 대상으로 지정한다.

## 11. 프로그램 실행 단계

```text
START

↓

환경변수 읽기

↓

실행 가능 날짜 확인

↓

이미 해당 분기 리밸런싱했는지 확인

↓

KIS Access Token 발급

↓

ISA 현재 잔고 조회

↓

KOSPI/KOSDAQ Universe 생성

↓

제외 조건 적용

↓

20일 평균 거래대금 필터

↓

시가총액 하위 20% 추출

↓

재무 데이터 조회

↓

주가 데이터 조회

↓

Value 계산

↓

Quality 계산

↓

Earnings Momentum 계산

↓

Price Momentum 계산

↓

Percentile Ranking

↓

Final Score 계산

↓

기존 Portfolio에 Hold Buffer 적용

↓

Target 20종목 결정

↓

목표 수량 계산

↓

현재 보유수량과 비교

↓

Rebalance Plan 생성

↓

JSON / DB 저장

↓

결과 출력

↓

END
```

## 12. 디렉터리 구조

```text
src/
├── index.ts
│
├── config/
│   └── strategy.ts
│
├── kis/
│   ├── client.ts
│   ├── auth.ts
│   ├── stock.ts
│   ├── finance.ts
│   ├── price.ts
│   ├── account.ts
│   └── order.ts
│
├── universe/
│   ├── buildUniverse.ts
│   └── filters.ts
│
├── factors/
│   ├── value.ts
│   ├── quality.ts
│   ├── earnings.ts
│   ├── momentum.ts
│   ├── percentile.ts
│   └── finalScore.ts
│
├── portfolio/
│   ├── buildPortfolio.ts
│   ├── rebalance.ts
│   └── positionSizing.ts
│
├── scheduler/
│   ├── tradingDay.ts
│   └── duplicateGuard.ts
│
├── storage/
│   ├── database.ts
│   └── repository.ts
│
└── report/
    └── report.ts
```

## 13. Entry Point

`src/index.ts`

역할은 orchestration만 담당한다.

개념적으로:

```typescript
async function main() {
  const options = parseArgs();

  await validateExecutionDate();

  const kis = await createKisClient();

  const account = await kis.getBalance();

  const stocks = await buildUniverse(kis);

  const fundamentals = await collectFundamentals(kis, stocks);
  const prices = await collectPrices(kis, stocks);

  const scores = calculateFactorScores({
    fundamentals,
    prices,
  });

  const currentPortfolio = account.positions;

  const targetPortfolio = buildTargetPortfolio({
    scores,
    currentPortfolio,
  });

  const plan = createRebalancePlan({
    account,
    targetPortfolio,
  });

  await saveResult(plan);

  printReport(plan);

  if (options.execute) {
    await executeRebalance(kis, plan);
  }
}
```

## 14. DB

상시 서버가 아니므로 DB도 복잡하게 만들 필요가 없다.

개인 운용 목적이라면 **SQLite로 충분하다.**

```text
quant.db
```

저장할 핵심 데이터:

```text
rebalance_runs
factor_scores
portfolios
fundamental_snapshots
```

이 정도면 된다.

PostgreSQL 서버를 별도로 띄울 필요도 없다.

## 15. 실행 결과

실행할 때마다 사람이 바로 확인할 수 있는 결과물을 생성한다.

예:

```text
output/
└── 2026-Q3/
    ├── ranking.csv
    ├── target-portfolio.csv
    ├── rebalance.csv
    └── result.json
```

`rebalance.csv` 예:

| 종목 | 현재 | 목표 | Action | 주문수량 |
|---|---:|---:|---|---:|
| 삼성전자 | 0 | 35 | BUY | +35 |
| ABC | 50 | 50 | HOLD | 0 |
| XYZ | 80 | 0 | SELL | -80 |

따라서 자동주문을 사용하지 않더라도 이 파일만 보고 한국투자 앱에서 그대로 주문할 수 있다.

## 16. 추천 실행 형태

구조는 최종적으로:

```text
Git Repository
       +
TypeScript
       +
Node.js
       +
SQLite
       +
KIS Open API
       +
cron
```

이면 충분하다.

Docker조차 필수는 아니다.

```bash
git pull
npm ci
npm run rebalance
```

만 가능한 환경이면 된다.

## 17. 자동 주문 단계

처음에는:

```env
AUTO_TRADE=false
```

로 운용한다.

실행 결과만 생성:

```text
ranking.csv
target-portfolio.csv
rebalance.csv
```

몇 번 실제 리밸런싱 결과를 확인한 다음:

```env
AUTO_TRADE=true
```

로 전환할 수 있다.

자동화하면:

```text
계산
↓
매도 주문
↓
체결 확인
↓
예수금 확인
↓
매수 주문
↓
체결 확인
↓
최종 잔고 저장
↓
프로세스 종료
```

로 확장한다.

## 18. 최종 시스템 정의

이 프로젝트는 **서버가 아니라 분기별 실행되는 Quant Rebalancing Batch Program**이다.

```text
분기에 한 번 실행
        ↓
한국투자증권 + 시장 데이터 조회
        ↓
한국형 멀티팩터 전략 계산
        ↓
20개 종목 선정
        ↓
현재 ISA Portfolio 비교
        ↓
분기 리밸런싱 주문안 생성
        ↓
종료
```

상시 서버 운영 비용과 관리 포인트 없이 동일한 전략을 반복 실행하는 것을 목표로 한다.
