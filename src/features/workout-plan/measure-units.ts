// 기록 항목 종류. model.ts가 이 타입을 다시 export하므로 기존 import 경로
// (@/features/workout-plan/model)는 그대로 쓸 수 있다 — 정의를 여기(의존성이
// 없는 leaf 모듈)에 두는 이유는 model.ts와 서로 import하는 순환이 생기면
// 런타임에 한쪽 바인딩이 비어(ReferenceError) 실제로 깨지기 때문이다.
export type GoalType = "time" | "distance" | "reps" | "sets";

// UI/도메인 모델과 API wire 포맷의 단위가 다르다. 이 경계를 여기 한 곳에서만
// 넘는다 — 화면/상태는 계속 분·km로 다루고, 서버로 나가는 DTO
// (ExerciseMeasuresDto)만 초·m를 쓴다.
//
//   UI/도메인            API wire
//   time     분      →   duration  초
//   distance km      →   distance  m
//   reps     회      →   count     회 (그대로)
//   sets     세트    →   sets      세트 (그대로)
//
// UI 모델 자체를 초/m로 바꾸지 않는다(스테퍼 step/min/max, 표시 포맷이 전부
// 분·km 기준이다).

export function minutesToApiSeconds(minutes: number): number {
  return Math.round(minutes * 60);
}

export function apiSecondsToMinutes(seconds: number): number {
  return seconds / 60;
}

// 0.1km 단위 입력이 부동소수점 오차로 2999.9999...m가 되지 않도록 정수 m로
// 반올림해 보낸다.
export function kmToApiMeters(km: number): number {
  return Math.round(km * 1000);
}

export function apiMetersToKm(meters: number): number {
  return meters / 1000;
}

// GoalType 하나의 UI 값을 API 값으로. 위 스칼라 변환의 얇은 래퍼라, 항목별로
// 어떤 단위를 쓰는지 호출부가 다시 판단하지 않아도 된다.
export function toApiMeasureValue(type: GoalType, uiValue: number): number {
  if (type === "time") return minutesToApiSeconds(uiValue);
  if (type === "distance") return kmToApiMeters(uiValue);
  return uiValue;
}

// toApiMeasureValue의 역변환 — 서버 응답을 UI 모델로 되돌릴 때 쓴다.
export function fromApiMeasureValue(type: GoalType, apiValue: number): number {
  if (type === "time") return apiSecondsToMinutes(apiValue);
  if (type === "distance") return apiMetersToKm(apiValue);
  return apiValue;
}
