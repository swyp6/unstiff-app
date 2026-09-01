export type ImageOptimizeOptions = {
  width?: number;
  height?: number;
  crop?: string; // 지정했을 때만 c_ 파라미터가 붙는다 (예: 'fill', 'limit')
};

// q_auto/f_auto는 표시용으로만 사용하고, 서버에 저장/전송하는 URL은
// 항상 변환 파라미터가 섞이지 않은 원본 secure_url을 그대로 써야 한다.
export function getOptimizedImageUrl(
  secureUrl: string,
  options: ImageOptimizeOptions = {},
): string {
  const { width, height, crop } = options;
  const sizeParams: string[] = [];
  if (width) sizeParams.push(`w_${width}`);
  if (height) sizeParams.push(`h_${height}`);
  if (crop) sizeParams.push(`c_${crop}`);
  const sizeSegment = sizeParams.length > 0 ? `${sizeParams.join(",")}/` : "";
  return secureUrl.replace("/upload/", `/upload/${sizeSegment}q_auto/f_auto/`);
}

export const CloudinaryImage = {
  /** 크기 변경 없이 최적화만 적용 */
  optimized: (url: string) => getOptimizedImageUrl(url),
  /** 너비 최대 100px, 원본이 더 작으면 확대하지 않음 (비율 유지) */
  w100: (url: string) =>
    getOptimizedImageUrl(url, { width: 100, crop: "limit" }),
  /** 너비 최대 200px, 원본이 더 작으면 확대하지 않음 (비율 유지) */
  w200: (url: string) =>
    getOptimizedImageUrl(url, { width: 200, crop: "limit" }),
  /** 200x200 정사각형 크롭 (프로필 썸네일 등) */
  w200_h200: (url: string) =>
    getOptimizedImageUrl(url, { width: 200, height: 200, crop: "fill" }),
};
