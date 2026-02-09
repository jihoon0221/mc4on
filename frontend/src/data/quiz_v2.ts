export type QuizType = 'word' | 'sentence' | 'sentence_order';

export type BaseQuizQuestion = {
  id: string;
  type: 'word' | 'sentence';
  prompt: string;
  options: string[];
  answerIndex: number;
};

export type SentenceOrderQuestion = {
  id: string;
  type: 'sentence_order';
  korean: string;      // 한국어 문장(문제)
  shuffled: string[];  // 섞인 영어 토큰들(사용자가 순서대로 조합)
  answer: string[];    // 정답 토큰 순서(채점용)
};

export type QuizQuestion = BaseQuizQuestion | SentenceOrderQuestion;

export type QuizSummary = {
  summary_text: string;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
};

export type QuizBundle = {
  date: string; // YYYY-MM-DD
  quizzes: [QuizQuestion, QuizQuestion, QuizQuestion];
  summary: QuizSummary;
};

export const QUIZ_V2: QuizBundle[] = [
  {
    date: '2026-01-01',
    quizzes: [
      {
        id: '2026-01-01-word',
        type: 'word',
        prompt: '"프로필"에 가장 가까운 의미를 고르세요.',
        options: ['Profile', 'Promise', 'Receipt'],
        answerIndex: 0,
      },
      {
        id: '2026-01-01-sentence',
        type: 'sentence',
        prompt: '"카카오톡 추천 친구에서 프로필을 보고 연락드려요."의 올바른 번역을 고르세요.',
        options: [
          'I’m messaging because I saw your profile in KakaoTalk recommended friends.',
          'I met you at a cafe and decided to text you.',
          'I cannot use KakaoTalk anymore.',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-01-order',
        type: 'sentence_order',
        korean: '사진 분위기가 참 편안해 보여서요.',
        shuffled: ['comfortable', 'the', 'photo', 'looks', 'really', 'atmosphere'],
        answer: ['The', 'photo', 'atmosphere', 'looks', 'really', 'comfortable'],
      },
    ],
    summary: {
      summary_text: '처음 인사를 나누고 카카오톡에서 대화를 시작했어요.',
      tags: ['인사', '소개', '첫대화', '카카오톡'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-02',
    quizzes: [
      {
        id: '2026-01-02-word',
        type: 'word',
        prompt: '"안부"에 가장 가까운 의미를 고르세요.',
        options: ['Check-in', 'Checkout', 'Charge'],
        answerIndex: 0,
      },
      {
        id: '2026-01-02-sentence',
        type: 'sentence',
        prompt: '"어제는 편안히 쉬셨나요?"의 올바른 번역을 고르세요.',
        options: [
          'Did you rest well yesterday?',
          'Where were you yesterday?',
          'Are you resting now?',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-02-order',
        type: 'sentence_order',
        korean: '문득 당신 생각이 나서 메시지 남겨요.',
        shuffled: ['I', 'left', 'a', 'message', 'because', 'I', 'thought', 'of', 'you'],
        answer: ['I', 'left', 'a', 'message', 'because', 'I', 'thought', 'of', 'you'],
      },
    ],
    summary: {
      summary_text: '안부를 주고받으며 하루 일상을 공유했어요.',
      tags: ['안부', '근무', '일상', '대화'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-03',
    quizzes: [
      {
        id: '2026-01-03-word',
        type: 'word',
        prompt: '"파견"에 가장 가까운 의미를 고르세요.',
        options: ['Deployment', 'Delivery', 'Holiday'],
        answerIndex: 0,
      },
      {
        id: '2026-01-03-sentence',
        type: 'sentence',
        prompt: '"곧 시리아 쪽 파견 일정이 있어서요."의 번역을 고르세요.',
        options: [
          'I have a deployment schedule to Syria soon.',
          'I will travel to Korea next week.',
          'I changed my job yesterday.',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-03-order',
        type: 'sentence_order',
        korean: '그래서 더 사람 온기가 그리워요.',
        shuffled: ['why', 'I', 'human', 'warmth', 'more', 'miss', 'that’s'],
        answer: ['That’s', 'why', 'I', 'miss', 'human', 'warmth', 'more'],
      },
    ],
    summary: {
      summary_text: '근무 상황과 감정을 나누며 대화를 이어갔어요.',
      tags: ['근무', '감정공유', '연락', '대화지속'],
      warning_text: '해외 근무와 어려운 상황을 강조하는 흐름이 보여요. 사실 확인이 어려운 이야기일 수도 있으니 조심스럽게 접근해보세요.',
      warning_tags: ['overseas', 'impersonation', 'sympathy_appeal'],
      risk_level: 1,
    },
  },
  {
    date: '2026-01-04',
    quizzes: [
      {
        id: '2026-01-04-word',
        type: 'word',
        prompt: '"의심"에 가장 가까운 의미를 고르세요.',
        options: ['Suspicion', 'Solution', 'Silence'],
        answerIndex: 0,
      },
      {
        id: '2026-01-04-sentence',
        type: 'sentence',
        prompt: '"근무복 사진 하나 보내요."의 번역을 고르세요.',
        options: ['I’ll send you a photo of my uniform.', 'I lost my uniform.', 'I bought a new phone.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-04-order',
        type: 'sentence_order',
        korean: '당신이 불안해할까봐요.',
        shuffled: ['might', 'because', 'I', 'you', 'be', 'worried'],
        answer: ['Because', 'I', 'might', 'you', 'be', 'worried'],
      },
    ],
    summary: {
      summary_text: '서로를 안심시키며 대화를 이어갔어요.',
      tags: ['안심', '사진', '대화', '하루'],
      warning_text: '사진/신분을 근거로 신뢰를 빠르게 쌓으려는 모습이 보여요. 이런 방식이 꼭 문제는 아니지만, 지나치게 신뢰를 서두르는 흐름일 수도 있어요.',
      warning_tags: ['profile_photo_trust', 'catfishing'],
      risk_level: 2,
    },
  },
  {
    date: '2026-01-05',
    quizzes: [
      {
        id: '2026-01-05-word',
        type: 'word',
        prompt: '"결정"에 가장 가까운 의미를 고르세요.',
        options: ['Decision', 'Deposit', 'Delay'],
        answerIndex: 0,
      },
      {
        id: '2026-01-05-sentence',
        type: 'sentence',
        prompt: '"오늘 안에 결정을 해야 한다고 해서 마음이 좀 급하네요."의 번역을 고르세요.',
        options: [
          'They said I need to decide today, so I feel a bit rushed.',
          'I decided yesterday, so I feel relaxed.',
          'There is no deadline, so it is fine.',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-05-order',
        type: 'sentence_order',
        korean: '가끔 상상해요. 파견이 끝나면 한국에 가서 직접 만나면 어떨지.',
        shuffled: ['I', 'sometimes', 'imagine', 'what', 'it', 'would', 'be', 'like', 'to', 'meet', 'in', 'person', 'in', 'Korea', 'after', 'my', 'deployment'],
        answer: ['I', 'sometimes', 'imagine', 'what', 'it', 'would', 'be', 'like', 'to', 'meet', 'in', 'person', 'in', 'Korea', 'after', 'my', 'deployment'],
      },
    ],
    summary: {
      summary_text: '만남과 일정에 대한 이야기가 나오며 감정을 나눴어요.',
      tags: ['만남', '미래', '일정', '대화'],
      warning_text: '시간이 촉박하다는 표현이 나오고 있어요. 상대의 일정 이슈가 반복될 경우 부담이 생길 수 있으니 선을 정해두는 게 좋아요.',
      warning_tags: ['urgency', 'avoid_meeting'],
      risk_level: 2,
    },
  },
  {
    date: '2026-01-06',
    quizzes: [
      {
        id: '2026-01-06-word',
        type: 'word',
        prompt: '"수수료"의 의미를 고르세요.',
        options: ['Fee', 'Fuel', 'File'],
        answerIndex: 0,
      },
      {
        id: '2026-01-06-sentence',
        type: 'sentence',
        prompt: '"처리 수수료를 먼저 내야 진행된대요."의 번역을 고르세요.',
        options: [
          'They said it will proceed only if the processing fee is paid first.',
          'They said there is no fee at all.',
          'They said everything is already done.',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-06-order',
        type: 'sentence_order',
        korean: '큰 금액은 아니에요. 정산되면 바로 돌려줄 수 있어요.',
        shuffled: ['It’s', 'not', 'a', 'large', 'amount', 'I', 'can', 'pay', 'you', 'back', 'right', 'away', 'after', 'it’s', 'settled'],
        answer: ['It’s', 'not', 'a', 'large', 'amount', 'I', 'can', 'pay', 'you', 'back', 'right', 'away', 'after', 'it’s', 'settled'],
      },
    ],
    summary: {
      summary_text: '개인 사정과 관련된 이야기를 꺼내며 도움을 기대하는 흐름이 생겼어요.',
      tags: ['사정공유', '정산', '대화'],
      warning_text: '금전과 관련된 요청(수수료 선지급)이 등장했어요. 이 단계부터는 특히 조심해야 하고, 송금/결제는 하지 않는 게 안전해요.',
      warning_tags: ['money_request', 'frozen_assets_tax'],
      risk_level: 3,
    },
  },
  {
    date: '2026-01-07',
    quizzes: [
      {
        id: '2026-01-07-word',
        type: 'word',
        prompt: '"통관"의 의미를 고르세요.',
        options: ['Customs clearance', 'Conversation', 'Confirmation'],
        answerIndex: 0,
      },
      {
        id: '2026-01-07-sentence',
        type: 'sentence',
        prompt: '"통관 절차 때문에 비용이 조금 필요하대요."의 번역을 고르세요.',
        options: [
          'They said a small fee is needed for customs procedures.',
          'They said customs is free for everyone.',
          'They said I already arrived in Korea.',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-07-order',
        type: 'sentence_order',
        korean: '그걸 한국으로 보내서 당신이 잠시 보관해주면 좋겠다고 했어요.',
        shuffled: ['They', 'said', 'it', 'would', 'be', 'good', 'if', 'you', 'could', 'keep', 'it', 'for', 'a', 'while', 'after', 'sending', 'it', 'to', 'Korea'],
        answer: ['They', 'said', 'it', 'would', 'be', 'good', 'if', 'you', 'could', 'keep', 'it', 'for', 'a', 'while', 'after', 'sending', 'it', 'to', 'Korea'],
      },
    ],
    summary: {
      summary_text: '신뢰를 강조하며 무언가를 맡아달라는 이야기가 나왔어요.',
      tags: ['신뢰', '보관', '대화'],
      warning_text: '제3자 자산/물품을 대신 보관해달라는 요청과 통관 비용 언급이 함께 나왔어요. 이 조합은 매우 위험한 패턴이니 즉시 거절하는 게 좋아요.',
      warning_tags: ['gift_package', 'customs_fee', 'money_request', 'reward_gold_claim'],
      risk_level: 4,
    },
  },
  {
    date: '2026-01-08',
    quizzes: [
      {
        id: '2026-01-08-word',
        type: 'word',
        prompt: '"보관비"에 가장 가까운 의미를 고르세요.',
        options: ['Storage fee', 'Bus fare', 'Study fee'],
        answerIndex: 0,
      },
      {
        id: '2026-01-08-sentence',
        type: 'sentence',
        prompt: '"오늘 처리 안 하면 문제가 커질 수 있다고 하네요."의 번역을 고르세요.',
        options: [
          'They said it could get worse if we don’t handle it today.',
          'They said it will be fine next year.',
          'They said it is already solved.',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-08-order',
        type: 'sentence_order',
        korean: '부탁이에요. 시간이 너무 없어요.',
        shuffled: ['Please', 'I', 'don’t', 'have', 'much', 'time'],
        answer: ['Please', 'I', 'don’t', 'have', 'much', 'time'],
      },
    ],
    summary: {
      summary_text: '상황이 급하다는 말을 하며 대화를 이어갔어요.',
      tags: ['상황공유', '대화', '감정'],
      warning_text: '비용이 계속 추가되고, “오늘 처리” 같은 강한 시간 압박이 반복돼요. 이 단계는 사기 가능성이 매우 높으니 절대 송금하지 말고 연락을 중단하는 것을 권해요.',
      warning_tags: ['amount_escalation', 'repeat_requests', 'urgency', 'customs_fee', 'money_request'],
      risk_level: 4,
    },
  },
  {
    date: '2026-01-09',
    quizzes: [
      {
        id: '2026-01-09-word',
        type: 'word',
        prompt: '"지갑 주소"의 의미를 고르세요.',
        options: ['Wallet address', 'Home address', 'Email address'],
        answerIndex: 0,
      },
      {
        id: '2026-01-09-sentence',
        type: 'sentence',
        prompt: '"비트코인으로 보내면 바로 처리된다고 하네요."의 번역을 고르세요.',
        options: [
          'They said it will be processed immediately if sent by Bitcoin.',
          'They said Bitcoin is not allowed.',
          'They said we can wait.',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-09-order',
        type: 'sentence_order',
        korean: '제가 다 알려줄게요. 지금만 넘기면 돼요.',
        shuffled: ['I’ll', 'teach', 'you', 'everything', 'just', 'get', 'through', 'this', 'now'],
        answer: ['I’ll', 'teach', 'you', 'everything', 'just', 'get', 'through', 'this', 'now'],
      },
    ],
    summary: {
      summary_text: '더 빠른 처리 방법을 제안하며 대화를 이어갔어요.',
      tags: ['송금방식', '연락', '대화'],
      warning_text: '비트코인 같은 추적이 어려운 결제수단을 유도하고 있어요. 이는 전형적인 고위험 신호입니다. 즉시 중단하고 어떤 형태의 결제도 하지 마세요.',
      warning_tags: ['payment_method', 'crypto_moneygram', 'money_request'],
      risk_level: 4,
    },
  },
  {
    date: '2026-01-10',
    quizzes: [
      {
        id: '2026-01-10-word',
        type: 'word',
        prompt: '"마감"의 의미를 고르세요.',
        options: ['Deadline', 'Meeting', 'Reward'],
        answerIndex: 0,
      },
      {
        id: '2026-01-10-sentence',
        type: 'sentence',
        prompt: '"지금 입금됐는지만 확인해줄 수 있어요?"의 번역을 고르세요.',
        options: [
          'Can you check if the deposit has been made now?',
          'Can you send me a photo now?',
          'Can we meet at the cafe now?',
        ],
        answerIndex: 0,
      },
      {
        id: '2026-01-10-order',
        type: 'sentence_order',
        korean: '네 아니오로만 답해줘요. 지금 가능한지.',
        shuffled: ['Answer', 'only', 'yes', 'or', 'no', 'whether', 'you', 'can', 'do', 'it', 'now'],
        answer: ['Answer', 'only', 'yes', 'or', 'no', 'whether', 'you', 'can', 'do', 'it', 'now'],
      },
    ],
    summary: {
      summary_text: '불안한 감정을 나누며 답을 기다리는 대화가 이어졌어요.',
      tags: ['불안', '대화', '확인'],
      warning_text: '마감 시간을 내세워 압박하고, 입금 확인을 집요하게 요구하며 답변 방식(예/아니오)을 제한해요. 매우 위험한 상황이니 즉시 차단하고 주변/기관에 상담을 권해요.',
      warning_tags: ['urgency', 'deposit_confirmation', 'repeat_requests', 'money_request'],
      risk_level: 4,
    },
  },
];
