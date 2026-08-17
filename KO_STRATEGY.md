# 한국주식 멀티팩터 전략

## Universe

HTS(eFriend Expert) 조건검색식으로 서버사이드 필터링 후, 시가총액 컷오프만 코드에서 처리한다.

```
HTS 조건검색식 (psearch API)
  조건: 스팩/리츠/ETF/ETN/우선주 제외
        20일 평균 거래대금 >= 5억원
    ↓
시가총액 하위 20% 제거 (코드)
    ↓
Factor Ranking
```

### HTS 조건식 설정

1. eFriend Expert → 조건검색 메뉴
2. 아래 조건 설정:
   - 종목유형 제외: 스팩, 리츠, ETF, ETN, 우선주(우, 우B, 우C)
   - 20일 평균 거래대금 >= 5억원
3. 조건식 저장
4. `.env`에 `KIS_KO_CONDITION_SEQ=<seq번호>` 설정

## Factor 가중치

```
Value                30%
Quality              30%
Earnings Momentum    30%
Price Momentum       10%
```

최종 스코어:

```
FINAL_SCORE = VALUE × 0.30 + QUALITY × 0.30 + EARNINGS × 0.30 + MOMENTUM × 0.10
```

## Value

사용 지표: PER, PBR, PSR, PCR

각 지표를 Universe 내 percentile rank로 변환한다. 낮을수록 좋은 값이므로 역순으로 점수를 부여한다.

```
VALUE_SCORE = (PER_SCORE + PBR_SCORE + PSR_SCORE + PCR_SCORE) / 4
```

## Quality

| 지표 | 방향 |
|---|---|
| GP/A | 높을수록 좋음 |
| ROA | 높을수록 좋음 |
| Asset Growth | 낮을수록 좋음 |
| Debt Ratio | 낮을수록 좋음 |

```
QUALITY_SCORE = (GPA_SCORE + ROA_SCORE + ASSET_GROWTH_SCORE + DEBT_SCORE) / 4
```

## Earnings Momentum

사용 지표: 영업이익 YoY, 순이익 YoY

가능하면 단일 분기보다 누적 YoY를 사용한다.

```
EARNINGS_SCORE = (OPERATING_PROFIT_GROWTH_SCORE + NET_INCOME_GROWTH_SCORE) / 2
```

## Price Momentum

12-1 Momentum — 최근 1개월을 제외한 12개월 수익률.

```
가격(t - 1개월) / 가격(t - 12개월) - 1
```

전체 Factor 중 10%만 반영한다.

## Portfolio

- **종목 수**: 20
- **가중 방식**: 동일가중
- **투자 비중**: 전체 자산의 98%
- **현금**: 2%
- **종목당 비중**: 98% / 20 = 4.9%

## 종목 교체 규칙

Turnover를 줄이기 위해 Hold Buffer를 사용한다.

| 조건 | 처리 |
|---|---|
| Rank 1~20 | 신규 진입 |
| Rank 1~30 (기존 보유) | 유지 |
| Rank 31~ | 매도 |

Universe 자체에서 탈락한 경우에는 순위에 관계없이 매도 대상으로 지정한다.
