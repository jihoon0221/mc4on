export type QuizType = 'word' | 'sentence' | 'pronunciation';

export type QuizQuestion = {
  id: string;
  type: QuizType;
  prompt: string;
  options: string[];
  answerIndex: number;
};

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

export const QUIZ_V1: QuizBundle[] = [
  {
    date: '2026-01-01',
    quizzes: [
      {
        id: '2026-01-01-word',
        type: 'word',
        prompt: '"날씨"에 가장 가까운 의미를 고르세요.',
        options: ['Weather', 'Time', 'Mood'],
        answerIndex: 0,
      },
      {
        id: '2026-01-01-sentence',
        type: 'sentence',
        prompt: '"오늘 날씨가 추워졌어."의 올바른 번역을 고르세요.',
        options: ['It got cold today.', 'It is raining today.', 'It is late today.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-01-pron',
        type: 'pronunciation',
        prompt: '"coffee"의 발음과 가장 가까운 것을 고르세요.',
        options: ['커피', '코피', '카페'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '날씨와 출근 이야기를 하며 하루를 시작했어요.',
      tags: ['날씨', '출근', '일상', '안부', '연인'],
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
        prompt: '"점심"의 의미를 고르세요.',
        options: ['Lunch', 'Dinner', 'Breakfast'],
        answerIndex: 0,
      },
      {
        id: '2026-01-02-sentence',
        type: 'sentence',
        prompt: '"새로 생긴 식당에 갔어."의 번역을 고르세요.',
        options: ['I went to a new restaurant.', 'I cooked at home.', 'I skipped lunch.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-02-pron',
        type: 'pronunciation',
        prompt: '"restaurant"의 발음과 가장 가까운 것을 고르세요.',
        options: ['레스토랑', '레스토', '레스턴트'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '점심 식사와 함께 다음 만남을 기대하는 이야기를 나눴어요.',
      tags: ['점심', '식당', '사진', '기대', '일상'],
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
        prompt: '"야근"의 의미를 고르세요.',
        options: ['Overtime', 'Holiday', 'Trip'],
        answerIndex: 0,
      },
      {
        id: '2026-01-03-sentence',
        type: 'sentence',
        prompt: '"오늘은 야근이 있어."의 번역을 고르세요.',
        options: ['I have overtime today.', 'I am on vacation today.', 'I am sick today.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-03-pron',
        type: 'pronunciation',
        prompt: '"overtime"의 발음과 가장 가까운 것을 고르세요.',
        options: ['오버타임', '오브타임', '오터타임'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '야근 일정과 서로를 배려하는 대화를 나눴어요.',
      tags: ['야근', '일', '배려', '연락', '하루'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-04',
    quizzes: [
      {
        id: '2026-01-04-word',
        type: 'word',
        prompt: '"피곤"에 가장 가까운 의미를 고르세요.',
        options: ['Tired', 'Hungry', 'Busy'],
        answerIndex: 0,
      },
      {
        id: '2026-01-04-sentence',
        type: 'sentence',
        prompt: '"오늘 하루가 길었어."의 번역을 고르세요.',
        options: ['It was a long day.', 'It was a short day.', 'It was a fun trip.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-04-pron',
        type: 'pronunciation',
        prompt: '"voice"의 발음과 가장 가까운 것을 고르세요.',
        options: ['보이스', '보이시', '보이즈'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '하루의 피로를 나누며 서로에게 위로가 되었어요.',
      tags: ['피곤', '통화', '위로', '하루마무리'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-05',
    quizzes: [
      {
        id: '2026-01-05-word',
        type: 'word',
        prompt: '"주말"의 의미를 고르세요.',
        options: ['Weekend', 'Weekday', 'Holiday'],
        answerIndex: 0,
      },
      {
        id: '2026-01-05-sentence',
        type: 'sentence',
        prompt: '"늦잠을 잤어."의 번역을 고르세요.',
        options: ['I slept in.', 'I woke up early.', 'I stayed up all night.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-05-pron',
        type: 'pronunciation',
        prompt: '"market"의 발음과 가장 가까운 것을 고르세요.',
        options: ['마켓', '마키트', '마켙'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '각자의 주말 일상을 편안하게 공유했어요.',
      tags: ['주말', '늦잠', '시장', '휴식'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-06',
    quizzes: [
      {
        id: '2026-01-06-word',
        type: 'word',
        prompt: '"드라마"의 의미를 고르세요.',
        options: ['Drama', 'Movie', 'News'],
        answerIndex: 0,
      },
      {
        id: '2026-01-06-sentence',
        type: 'sentence',
        prompt: '"추천해준 드라마를 봤어."의 번역을 고르세요.',
        options: ['I watched the drama you recommended.', 'I read a book.', 'I watched the news.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-06-pron',
        type: 'pronunciation',
        prompt: '"episode"의 발음과 가장 가까운 것을 고르세요.',
        options: ['에피소드', '에피소트', '에피소드르'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '추천한 콘텐츠를 함께 이야기하며 공감을 나눴어요.',
      tags: ['드라마', '추천', '공감', '취미'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-07',
    quizzes: [
      {
        id: '2026-01-07-word',
        type: 'word',
        prompt: '"보고 싶다"와 가장 가까운 의미를 고르세요.',
        options: ['Miss', 'Meet', 'Call'],
        answerIndex: 0,
      },
      {
        id: '2026-01-07-sentence',
        type: 'sentence',
        prompt: '"괜히 더 보고 싶어."의 번역을 고르세요.',
        options: ['I miss you for no reason.', 'I am angry.', 'I am busy.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-07-pron',
        type: 'pronunciation',
        prompt: '"miss"의 발음과 가장 가까운 것을 고르세요.',
        options: ['미스', '마이스', '메스'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '거리 때문에 생기는 그리움을 솔직하게 표현했어요.',
      tags: ['그리움', '거리', '연인', '감정'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-08',
    quizzes: [
      {
        id: '2026-01-08-word',
        type: 'word',
        prompt: '"사진"의 의미를 고르세요.',
        options: ['Photo', 'Letter', 'Map'],
        answerIndex: 0,
      },
      {
        id: '2026-01-08-sentence',
        type: 'sentence',
        prompt: '"사진을 찍어 보냈어."의 번역을 고르세요.',
        options: ['I took a photo and sent it.', 'I deleted the photo.', 'I lost my phone.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-08-pron',
        type: 'pronunciation',
        prompt: '"street"의 발음과 가장 가까운 것을 고르세요.',
        options: ['스트리트', '스트릿', '스트레이트'],
        answerIndex: 1,
      },
    ],
    summary: {
      summary_text: '해외 풍경 사진을 공유하며 일상을 연결했어요.',
      tags: ['사진', '거리풍경', '공유', '일상'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-09',
    quizzes: [
      {
        id: '2026-01-09-word',
        type: 'word',
        prompt: '"연락"의 의미를 고르세요.',
        options: ['Contact', 'Meeting', 'Gift'],
        answerIndex: 0,
      },
      {
        id: '2026-01-09-sentence',
        type: 'sentence',
        prompt: '"그냥 연락하고 싶었어."의 번역을 고르세요.',
        options: ['I just wanted to message you.', 'I needed money.', 'I was angry.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-09-pron',
        type: 'pronunciation',
        prompt: '"message"의 발음과 가장 가까운 것을 고르세요.',
        options: ['메시지', '메세지', '메사지'],
        answerIndex: 0,
      },
    ],
    summary: {
      summary_text: '특별한 이유 없이 서로를 떠올리며 연락했어요.',
      tags: ['연락', '생각', '일상', '관계'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
  {
    date: '2026-01-10',
    quizzes: [
      {
        id: '2026-01-10-word',
        type: 'word',
        prompt: '"거리"의 의미를 고르세요.',
        options: ['Distance', 'Street', 'Time'],
        answerIndex: 0,
      },
      {
        id: '2026-01-10-sentence',
        type: 'sentence',
        prompt: '"거리 있어도 괜찮아."의 번역을 고르세요.',
        options: ['It’s okay even with the distance.', 'I want to stop.', 'This is difficult.'],
        answerIndex: 0,
      },
      {
        id: '2026-01-10-pron',
        type: 'pronunciation',
        prompt: '"distance"의 발음과 가장 가까운 것을 고르세요.',
        options: ['디스턴스', '디스탄스', '다이슨스'],
        answerIndex: 1,
      },
    ],
    summary: {
      summary_text: '장거리 연애에 대한 신뢰와 안정감을 확인했어요.',
      tags: ['거리', '신뢰', '장거리연애', '안정'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
];
