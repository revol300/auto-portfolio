# 미국주식 EV/EBITDA 저평가 전략

## Universe

- 미국 NASDAQ / NYSE / AMEX
- 보통주만 포함
- ETF / ETN / ETP 제외
- ADR/DR 제외
- 금융주 제외

## 필터

| 조건 | 기준 |
|---|---|
| Price | >= $5 |
| Market Cap | >= $500M |
| Liquidity | >= $5M/day (20일 평균) |
| EBITDA TTM | > 0 |
| EV/EBITDA | > 0 |

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
