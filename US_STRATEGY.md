# 미국주식 EV/EBITDA 저평가 전략

## Universe

KIS 해외주식 조건검색 API로 서버사이드 필터링 후, 추가 조건은 코드에서 처리한다.

```
KIS 조건검색 API (inquire-search)
  조건: Price >= $5, Market Cap >= $500M
    ↓
보통주 필터 (코드) — ETF/ETN/ADR/Warrant/Preferred 등 제외
    ↓
금융주 제외 (코드)
    ↓
유동성 필터 (코드) — 20일 평균 거래대금 >= $5M/day
    ↓
Ranking
```

## 필터 상세

| 조건 | 처리 위치 | 기준 |
|---|---|---|
| Price | KIS API | >= $5 |
| Market Cap | KIS API | >= $500M |
| 보통주 | 코드 | ETF/ETN/ETP/ADR/DR/Warrant/Preferred 이름 패턴 제외 |
| 금융주 | 코드 | Financial 섹터 제외 |
| Liquidity | 코드 | >= $5M/day (20일 평균) |
| EBITDA TTM | 코드 (랭킹 단계) | > 0 |
| EV/EBITDA | 코드 (랭킹 단계) | > 0 |

## Enterprise Value 계산

```
EV = Market Cap + Total Debt - Cash
```

- Market Cap은 리밸런싱 시점 KIS 실시간 데이터를 사용한다.
- Total Debt, Cash는 Fundamentals Provider에서 조회한다.

## Ranking

```
EV/EBITDA 오름차순 (저평가 우선)
```

다음에 해당하면 제외한다:

- EBITDA <= 0
- EV <= 0
- EV/EBITDA <= 0
- 필수 데이터(EBITDA, Debt, Cash) 중 하나라도 Missing

## Portfolio

- **종목 수**: 25
- **가중 방식**: 동일가중
- **투자 비중**: 전체 자산의 99%
- **현금**: 1%
- **종목당 비중**: 99% / 25 = 3.96%
