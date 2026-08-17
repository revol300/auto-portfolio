# auto-portfolio 통합 아키텍처

## 개요

한국주식(KO)과 미국주식(US) 분기 리밸런싱을 하나의 Batch 프로그램으로 통합한다.

Strategy Pattern으로 전략별 로직을 분리하며, `--market ko|us` 옵션으로 실행 시 선택한다.

## 핵심 원칙

1. **Stateless**: 모든 실행은 독립적. KIS API에서 현재 자산/보유종목을 매번 조회. 로컬 DB나 상태 파일 없음.
2. **Strategy Pattern**: `RebalanceStrategy` 인터페이스를 통해 전략별 로직을 캡슐화.
3. **공통 인프라 공유**: KIS 인증, 포지션 사이징, 리밸런스 플랜 생성, 리포트 출력은 공통.

## CLI

```bash
# 한국주식 멀티팩터
pnpm run rebalance:ko

# 미국주식 EV/EBITDA
pnpm run rebalance:us

# 옵션
--execute    # 실제 주문 실행
--force      # 날짜 검사 무시
```

## Strategy 인터페이스

```typescript
interface RebalanceStrategy {
  config: StrategyConfig;
  buildUniverse(): Promise<UniverseStock[]>;
  fetchScoringData(universe): Promise<unknown>;
  rankStocks(data): RankedStock[];
  buildTargetPortfolio(ranked, positions, totalAssets): TargetPortfolioItem[];
  fetchAccountBalance(): Promise<AccountBalance>;
  fetchPrices(codes): Promise<PriceData[]>;
  executeOrders(actions): Promise<void>;
}
```

## 실행 흐름

```
CLI --market 옵션
  ↓
createStrategy(marketId)
  ↓
날짜 검사 (리밸런싱 월, 거래일)
  ↓
strategy.fetchAccountBalance()
  ↓
strategy.buildUniverse()
  ↓
strategy.fetchScoringData()
  ↓
strategy.rankStocks()
  ↓
strategy.buildTargetPortfolio()
  ↓
calculateTargetQuantities()     ← 공통
  ↓
createRebalancePlan()           ← 공통
  ↓
printReport() + saveReport()    ← 공통
  ↓
strategy.executeOrders()        ← --execute 시
```

## 디렉터리 구조

```
src/
  index.ts                    # 통합 CLI + orchestrator
  types.ts                    # 공통 타입

  strategy/
    types.ts                  # RebalanceStrategy 인터페이스
    factory.ts                # createStrategy()
    ko/                       # → KO_STRATEGY.md
    us/                       # → US_STRATEGY.md

  kis/
    auth.ts, client.ts        # 공통 인증
    domestic/                 # 국내주식 API
    overseas/                 # 해외주식 API

  portfolio/                  # 공통 포트폴리오 로직
  scheduler/                  # 공통 스케줄링
  report/                     # 공통 리포트
```

## 전략별 상세

- [KO_STRATEGY.md](KO_STRATEGY.md) — 한국주식 멀티팩터 (Value·Quality·Earnings·Momentum)
- [US_STRATEGY.md](US_STRATEGY.md) — 미국주식 EV/EBITDA 저평가

## 전략 추가 방법

1. `src/strategy/<id>/` 디렉터리 생성
2. `RebalanceStrategy` 구현 클래스 작성
3. `src/strategy/factory.ts`에 등록
4. 필요 시 `src/kis/` 하위에 API 모듈 추가
