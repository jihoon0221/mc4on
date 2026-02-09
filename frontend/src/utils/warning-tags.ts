const WARNING_TAG_LABELS: Record<string, string> = {
  overseas: '해외 체류 언급',
  impersonation: '신분 사칭 의심',
  sympathy_appeal: '동정/호소',
  profile_photo_trust: '프로필 사진 신뢰 유도',
  catfishing: '사기(캣피싱) 의심',
  urgency: '긴급/압박',
  avoid_meeting: '만남 회피',
  money_request: '금전 요청',
  frozen_assets_tax: '동결 자산/세금',
  gift_package: '선물/택배',
  customs_fee: '통관 비용',
  reward_gold_claim: '보상/수수료 요구',
  amount_escalation: '요구 금액 증가',
  repeat_requests: '반복 요청',
  payment_method: '결제 수단 유도',
  crypto_moneygram: '가상화폐/송금',
  deposit_confirmation: '입금 확인 집요함',
};

export function mapWarningTag(tag: string): string {
  return WARNING_TAG_LABELS[tag] ?? tag;
}

export function mapWarningTags(tags: string[] = []): string[] {
  return tags.map(mapWarningTag);
}
