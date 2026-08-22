# 미국주식 EV/EBITDA Momentum Rotation 전략 백테스트 정리

## 1. 목적

미국 상장주식을 대상으로 **EV/EBITDA Value Factor**와 **Price Momentum**을 결합하여 포트폴리오를 구성하고, 모멘텀이 충분하지 않은 구간에는 **IEF(미국 7~10년 국채 ETF)**로 잔여 비중을 대체하는 전략

전략은 크게 두 단계로 구성된다.

```text
분기별
EV/EBITDA가 가장 낮은 종목 Top 50 선정

        ↓

월별
Top 50 내부에서 Momentum 재평가

        ↓

Momentum 상위 25종목 중
양(+)의 Momentum 종목만 보유

        ↓

비어 있는 Portfolio Slot은
IEF로 대체
```

핵심 아이디어는 다음과 같다.

> **시장 전체에서 저평가된 종목을 먼저 고른 뒤, 그중 실제 가격 추세가 강한 종목만 보유한다.  
> 충분한 종목이 없을 때는 억지로 주식을 채우지 않고 국채 ETF인 IEF로 이동한다.**

------------------------------------------------------------------------

## 2. 전략 개요

전략 구조:

```text
미국주식 Universe
        ↓
기본 거래 가능 종목 필터
        ↓
금융주 제외
        ↓
EV/EBITDA 계산
        ↓
EV/EBITDA가 낮은 Top 50 선정
        ↓
분기 동안 Value Universe 유지
        ↓
매월 Momentum 계산
        ↓
Momentum 내림차순 정렬
        ↓
양(+)의 Momentum 종목만 선택
        ↓
최대 25종목 보유
        ↓
부족한 Slot은 IEF 배분
        ↓
다음 달 Momentum 재평가
```

EV/EBITDA는 **낮을수록 저평가**, Momentum은 **높을수록 추세가 강한 것**으로 판단한다.

------------------------------------------------------------------------

## 3. 투자 Universe

기본 대상은 미국 거래소에 상장된 주식이다.

주요 대상:

```text
NYSE
NASDAQ
NYSE American
```

기본적으로 보통주를 중심으로 구성하며, 실제 구현에서는 ETF, ETN, Preferred Stock, Warrant 등 비정상적인 Security Type을 제외하는 것이 권장된다.

------------------------------------------------------------------------

## 4. 금융주 제외

EV/EBITDA는 금융회사에 그대로 적용하기 어렵기 때문에 금융주를 제외한다.

예:

```text
Bank
Insurance
Broker
Financial Services
REIT 금융성 기업
```

금융회사는 일반 제조업·서비스업과 달리 부채가 영업구조의 일부이며, EBITDA 자체도 기업가치 평가 지표로 적합하지 않은 경우가 많다.

따라서:

```text
Financial Sector = 제외
```

를 기본 조건으로 사용한다.

------------------------------------------------------------------------

## 5. 기본 종목 필터

백테스트에서는 다음 조건을 적용하였다.

```text
주가 >= $5

Market Cap >= $500M

Daily Dollar Volume >= $5M
```

거래대금은 일반적으로 다음과 같이 계산할 수 있다.

```text
DAILY_DOLLAR_VOLUME =
Price × Volume
```

또는 실제 구현에서는 최근 일정 기간 평균을 사용하는 방식이 더 안정적이다.

예:

```text
AVG_DOLLAR_VOLUME_20D =
mean(close × volume, 20 trading days)
```

이 조건들은 Alpha Factor가 아니라 **실제 거래 가능성이 낮은 초소형·저유동성 종목을 제거하기 위한 필터**다.

------------------------------------------------------------------------

## 6. Enterprise Value

EV는 기업 전체의 경제적 가치를 나타낸다.

기본 계산식:

```text
EV =
Market Capitalization
+ Total Debt
- Cash & Cash Equivalents
```

보다 상세한 데이터가 있다면 다음 항목을 추가할 수 있다.

```text
EV =
Market Cap
+ Total Debt
+ Preferred Stock
+ Minority Interest
- Cash
```

API 로 제공이 가능하다면 그걸 사용하자

------------------------------------------------------------------------

## 7. EBITDA

EBITDA:

```text
EBITDA =
Earnings
Before
Interest
Taxes
Depreciation
Amortization
```

즉:

```text
이자
세금
감가상각
무형자산상각
```

이전의 영업 수익성을 나타낸다.

본 전략에서는 일반적으로 **TTM(Trailing Twelve Months) EBITDA**를 사용하는 것이 적절하다.
EBITDA의 경우에는 최근 4분기 자료로 계산한다

------------------------------------------------------------------------

## 8. EV/EBITDA

전략의 핵심 Value Factor:

```text
EV_EBITDA =
Enterprise Value
/
EBITDA
```

해석:

```text
낮을수록 저평가
높을수록 고평가
```

예:

```text
기업 A = 5.2x
기업 B = 8.4x
기업 C = 15.7x
```

다른 조건이 동일하다면:

```text
A
↓
B
↓
C
```

순서로 A가 가장 저평가된 것으로 판단한다.

------------------------------------------------------------------------

## 9. EV/EBITDA 유효성 필터

비정상적인 EV/EBITDA가 포함되는 것을 막기 위해 최소 다음 조건을 적용하는 것이 좋다.

```text
Enterprise Value > 0

EBITDA > 0

EV/EBITDA > 0
```

특히:

```text
EBITDA <= 0
```

인 기업은 EV/EBITDA Ranking에서 제외한다.

적자기업이나 구조조정 기업의 음수 EV/EBITDA가 단순 Ranking에서 가장 저평가된 종목처럼 보이는 오류를 방지하기 위한 것이다.

------------------------------------------------------------------------

## 10. 분기별 Value Universe 선정

EV/EBITDA Ranking은 매일 재계산하지 않고 **분기 단위**로 수행하나 조건식으로 받을 수 있다면 저장하지 않는다.

예:

```text
3월
6월
9월
12월
```

또는:

```text
1월
4월
7월
10월
```

처럼 구현할 수 있다.

핵심은 일정한 3개월 주기를 유지하는 것이다.

분기 리밸런싱 시점마다:

```text
전체 Universe

↓

기본 필터

↓

금융주 제외

↓

EV/EBITDA 계산

↓

EV/EBITDA 오름차순

↓

Top 50
```

을 선정한다.

------------------------------------------------------------------------

## 11. Value Top 50

최종 Value Candidate:

```text
EV/EBITDA Rank <= 50
```

즉, 전체 시장에서 절대적인 EV/EBITDA 기준을 사용하는 것이 아니라 **상대 Ranking**을 사용한다.

예:

```text
EV/EBITDA < 8
```

같은 고정 조건을 쓰는 것이 아니라:

```text
해당 시점에서 가장 싼 50종목
```

을 선택한다.

이를 통해 시장 전체 Valuation 수준이 변하더라도 항상 상대적으로 저평가된 기업군을 유지한다.

------------------------------------------------------------------------

## 12. 분기 Value + 월간 Momentum

Value Universe는 분기마다 갱신하지만 Momentum은 매월 다시 계산한다.

구조:

```text
Quarter 1

Value Top 50 확정
        ↓
1월 Momentum Ranking
        ↓
2월 Momentum Ranking
        ↓
3월 Momentum Ranking

        ↓

Quarter 2

EV/EBITDA Top 50 재선정
```

즉:

> **Value Factor는 느리게 움직이고 Momentum Factor는 빠르게 움직이도록 설계한다.**

------------------------------------------------------------------------

## 13. Momentum 계산

Value Top 50 종목에 대해서 Price Momentum을 계산한다.

구체적인 Lookback 기간은 1년전으로 12개월 전 가격과 비교한다.

12개월 Momentum:

```text
MOMENTUM_12M =
AdjustedPrice(t)
/
AdjustedPrice(t - 12 months)
- 1
```

------------------------------------------------------------------------

## 14. Momentum Ranking

Value Top 50을 Momentum 기준 내림차순 정렬한다.

```text
Momentum Rank 1
Momentum Rank 2
Momentum Rank 3
...
Momentum Rank 50
```

가장 강한 Momentum을 가진 종목부터 선택한다.

단, 단순히 Top 25를 무조건 보유하지 않는다.

추가 조건:

```text
Momentum > 0
```

을 적용한다.

------------------------------------------------------------------------

## 15. Positive Momentum Filter

본 전략의 중요한 특징이다.

최종 후보는:

```text
Value Top 50

AND

Momentum Rank <= 25

AND

Momentum > 0
```

조건을 모두 만족해야 한다.

예:

```text
Momentum 양수 종목 = 25개 이상

→ 주식 25개 보유
```

반면:

```text
Momentum 양수 종목 = 17개

→ 주식 17개
→ 나머지 8개 Slot은 IEF
```

으로 구성한다.

------------------------------------------------------------------------

## 17. Fixed Slot 방식

Portfolio Size:

```text
25 Slots
```

각 Slot의 기본 비중:

```text
1 / 25 = 4%
```

예:

```text
Positive Momentum Stock = 25

Stock = 25 × 4% = 100%
IEF = 0%
```

또는:

```text
Positive Momentum Stock = 15

Stock = 15 × 4% = 60%
IEF = 40%
```

즉, 주식 종목 수가 줄었다고 남은 주식의 비중을 다시 100%로 확대하지 않는다.

------------------------------------------------------------------------

## 18. IEF 대체 규칙

주식으로 채우지 못한 Slot은 IEF로 이동한다.

수식:

```text
STOCK_WEIGHT =
PositiveMomentumCount / 25
```

```text
IEF_WEIGHT =
1 - STOCK_WEIGHT
```

예:

```text
PositiveMomentumCount = 20

STOCK_WEIGHT = 20 / 25 = 80%

IEF_WEIGHT = 20%
```

따라서 시장의 Momentum 환경이 악화될수록 자동으로 국채 비중이 높아진다.

------------------------------------------------------------------------

## 19. 전략의 Risk-On / Risk-Off 구조

본 전략은 별도의 시장 타이밍 지표를 사용하지 않아도 Momentum 종목 수에 따라 자연스럽게 Risk Exposure가 변한다.

강세장:

```text
Positive Momentum 종목 증가

↓

주식 비중 증가

↓

IEF 감소
```

약세장:

```text
Positive Momentum 종목 감소

↓

주식 비중 감소

↓

IEF 증가
```

즉:

> **개별 종목 Momentum 신호의 집합이 시장 Risk-On / Risk-Off 신호 역할도 수행한다.**

------------------------------------------------------------------------

## 20. 리밸런싱 구조

전략에는 두 종류의 재평가가 존재한다.

### 분기 리밸런싱

```text
EV/EBITDA Ranking 재계산

↓

Value Top 50 재선정
```

### 월간 리밸런싱

```text
Value Top 50 유지

↓

Momentum 재계산

↓

Top 25 Positive Momentum 재선정

↓

Stock / IEF 비중 조정
```

따라서:

```text
Value = Quarterly

Momentum = Monthly
```

구조다.
