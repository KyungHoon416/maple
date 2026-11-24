# Matching engine (`src/engine.js`)

1. **검증**: 12자리 A/B 문자열만 허용(구버전 10문항 거부).
2. **사용자 벡터** `u[t] = Σ 선택 가중치[t] / Σ_문항 max(A,B 가중치[t])`. 분모 0인 6개 태그(intercession, reverence, dedication, hesitation, fear, avoidance)는 미측정 → 계산에서 제외.
3. **사건 프로필**: 본문에 기록된 행동 신호(`5B` 등)와 그 신호의 가중치로 만든 특성 벡터(÷3 정규화). 신호가 없는 사건(부정적·기록 부족)은 비교하지 않음.
4. **사건 점수** (0~100, clamp):
   `100 × (0.35·cos + 0.25·behavior + 0.20·coverage + 0.20·specificity) + bonus`
   - cos: 사건이 기록한 측정 특성에서만 가중 코사인(미기록은 마스킹)
   - behavior: 일치한 문항 수 / 사건이 다루는 문항 수
   - coverage: min(1, 일치 문항 수 / 4)
   - specificity: 일치 신호의 평균 IDF(대표·보조 사건 중 그 신호의 드묾) / 최대 IDF — 흔한 행동만 맞는 사건의 대량 동점을 줄이기 위해 추가
   - bonus: 복합 규칙 R1~R6, 규칙당 +3, 합계 ±5 제한
5. **후보 조건**: 서로 다른 문항 2개 이상 일치. primary/support 사건만. 대표는 primary 사건 + 인물 자격 + 55점 이상, TOP3는 50점 이상, 인물당 최고 사건 1개, 서로 다른 인물.
6. **동점**: 점수 → 일치 문항 수 → coverage → 규칙 수 → ID. 1·2위 차이 < 0.5면 “함께 가까운 인물” 안내.
7. **설명**: 일치한 신호마다 “Qnn에서 ‘선택 문구’ → 장절에도 ~한 모습” 문장을 템플릿으로 생성.

## 선택지 가중치 (초기값, 명세 표 그대로)
Q01 A trust2 petition3 / B application2 · Q02 A discernment3 study1 / B obedience2 application3 · Q03 A study3 questioning1 / B application3 · Q04 A study2 discernment2 / B questioning3 fellowship2 · Q05 A honest_prayer3 / B prayer_routine3 · Q06 A honest_prayer2 / B perseverance3 prayer_routine2 · Q07 A attention3 receptivity2 / B praise3 · Q08 A attention2 receptivity1 / B application3 · Q09 A repentance2 application2 / B discernment2 · Q10 A fellowship3 / B discernment2 · Q11 A compassion3 fellowship1 / B service3 · Q12 A reconciliation2 compassion2 / B discernment2

## 복합 규칙
| ID | 조건 | 대상 사건 | 근거 |
|---|---|---|---|
| R1 | 5B+6B | 안나, 다니엘 6:10, 고넬료, 한나 실로 | 정해진 기도의 자리 |
| R2 | 5A+9A | 다윗(나단), 베드로(요21), 삼손 | 고백 후 회복 |
| R3 | 3B+11B | 다비다, 삭개오, 요셉(기근 대비) | 말씀→섬김 |
| R4 | 11A+12A | 바나바(사울), 아나니아(형제 사울아), 요셉(화해) | 격려·화해 |
| R5 | 7A+3A | 마리아(베다니), 예레미야(토기장이) | 들음·묵상 |
| R6 | 2A+4B | 니고데모, 사마리아 여인, 도마, 빌립 | 묻고 대화 |

## 한계
- 4,096 조합 중 대표 인물 38명만 등장, 최다 인물 비율 12.3%. 3~4개 신호 사건이 coverage에서 유리하고, 2개 신호 사건은 다른 인물의 더 넓은 사건에 밀림. 균등화는 명세상 금지라 하지 않았고, 원인은 `qa-exhaustive.json`의 unexposed에 기록.
- 사건이 많은 인물이 유리할 수 있음(인물별 최고 사건만 사용해도 후보 수가 많음). 콘텐츠 검수 시 중복 사건 통합 검토 필요.
- 가중치·임계값은 경험적 설정이며 검증된 척도가 아님.
