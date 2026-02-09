export type QuizType = 'word' | 'sentence' | 'sentence_order';

export type QuizQuestion = {
  id: string;
  type: QuizType;
  prompt?: string;
  options?: string[];
  answerIndex?: number;
  korean?: string;
  shuffled?: string[];
  answer?: string[];
};

export type QuizSummary = {
  summary_text: string;
  long_summary?: string | null;
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
        id: '2026-01-01-order',
        type: 'sentence_order',
        korean: '출근길에 커피 마시면서 너한테 메시지 보내고 싶었어.',
        shuffled: ['coffee', 'you', 'I', 'message', 'wanted', 'to', 'on', 'my', 'way', 'send', 'work', 'with', 'a'],
        answer: ['I', 'wanted', 'to', 'send', 'you', 'a', 'message', 'on', 'my', 'way', 'to', 'work', 'with', 'coffee'],
      },
    ],
    summary: {
      summary_text: '날씨와 출근 이야기를 하며 하루를 시작했어요.',
      long_summary:
        '날씨 이야기를 계기로 서로의 하루를 떠올리며 대화를 시작했어요.\n출근과 커피 같은 소소한 일상을 공유하며 자연스럽게 안부를 주고받았어요.',
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
        id: '2026-01-02-order',
        type: 'sentence_order',
        korean: '새로 생긴 식당에 가서 점심 먹었어.',
        shuffled: ['lunch', 'new', 'restaurant', 'I', 'had', 'the', 'at'],
        answer: ['I', 'had', 'lunch', 'at', 'the', 'new', 'restaurant'],
      },
    ],
    summary: {
      summary_text: '점심 식사와 함께 다음 만남을 기대하는 이야기를 나눴어요.',
      long_summary:
        '점심에 다녀온 식당 이야기를 나누며 일상의 장면을 공유했어요.\n함께 가고 싶다는 표현과 다음 만남에 대한 기대가 대화 속에 담겼어요.',
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
        id: '2026-01-03-order',
        type: 'sentence_order',
        korean: '오늘은 야근이라 늦게 끝날 것 같아.',
        shuffled: ['work', 'late', 'today', 'I', 'because', 'overtime', 'of', 'will'],
        answer: ['I', 'will', 'work', 'late', 'today', 'because', 'of', 'overtime'],
      },
    ],
    summary: {
      summary_text: '야근 일정과 서로를 배려하는 대화를 나눴어요.',
      long_summary:
        '야근 일정으로 늦어질 수 있다는 상황을 미리 전하며 배려하는 모습을 보였어요.\n서로 무리하지 말라는 말을 건네며 기다림과 응원의 감정을 나눴어요.',
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
        id: '2026-01-04-order',
        type: 'sentence_order',
        korean: '오늘 하루가 길어서 조금 피곤해.',
        shuffled: ['tired', 'a', 'bit', 'today', 'was', 'long', 'I', 'feel', 'because'],
        answer: ['I', 'feel', 'a', 'bit', 'tired', 'because', 'today', 'was', 'long'],
      },
    ],
    summary: {
      summary_text: '하루의 피로를 나누며 서로에게 위로가 되었어요.',
      long_summary:
        '하루의 피로와 감정을 솔직하게 털어놓으며 대화를 이어갔어요.\n통화를 통해 하루를 정리하는 느낌을 공유하며 정서적인 유대가 깊어졌어요.',
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
        id: '2026-01-05-order',
        type: 'sentence_order',
        korean: '주말이라 늦잠을 잤어.',
        shuffled: ['weekend', 'in', 'I', 'slept', 'because', 'was', 'it', 'the'],
        answer: ['I', 'slept', 'in', 'because', 'it', 'was', 'the', 'weekend'],
      },
    ],
    summary: {
      summary_text: '각자의 주말 일상을 편안하게 공유했어요.',
      long_summary:
        '주말의 여유로운 시작과 함께 서로를 가장 먼저 떠올렸다는 이야기를 나눴어요.\n시장에 다녀온 소소한 일상과 영상을 공유하겠다는 말로 친근함을 더했어요.',
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
        id: '2026-01-06-order',
        type: 'sentence_order',
        korean: '추천해준 드라마를 봤어.',
        shuffled: ['drama', 'the', 'watched', 'I', 'recommended', 'you'],
        answer: ['I', 'watched', 'the', 'drama', 'you', 'recommended'],
      },
    ],
    summary: {
      summary_text: '추천한 콘텐츠를 함께 이야기하며 공감을 나눴어요.',
      long_summary:
        '집에서 보낸 하루와 함께 취미 이야기를 나누며 공통의 관심사를 확인했어요.\n추천한 콘텐츠를 함께 즐기는 상상을 하며 다음을 기약하는 분위기가 형성됐어요.',
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
        id: '2026-01-07-order',
        type: 'sentence_order',
        korean: '오늘은 괜히 더 보고 싶어.',
        shuffled: ['you', 'miss', 'reason', 'for', 'today', 'no', 'I', 'more'],
        answer: ['I', 'miss', 'you', 'more', 'today', 'for', 'no', 'reason'],
      },
    ],
    summary: {
      summary_text: '거리 때문에 생기는 그리움을 솔직하게 표현했어요.',
      long_summary:
        '일요일의 감정과 함께 그리움을 솔직하게 표현했어요.\n꾸준히 대화를 이어가는 관계 자체가 서로에게 힘이 된다는 점을 확인했어요.',
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
        id: '2026-01-08-order',
        type: 'sentence_order',
        korean: '사진을 찍어서 바로 보냈어.',
        shuffled: ['photo', 'sent', 'a', 'I', 'and', 'took', 'right', 'away', 'it'],
        answer: ['I', 'took', 'a', 'photo', 'and', 'sent', 'it', 'right', 'away'],
      },
    ],
    summary: {
      summary_text: '해외 풍경 사진을 공유하며 일상을 연결했어요.',
      long_summary:
        '출근길에 받은 사진을 계기로 상대의 일상 공간에 대해 이야기를 나눴어요.\n직접 보여주고 싶다는 말로 거리감을 줄이고 싶은 마음이 드러났어요.',
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
        id: '2026-01-09-order',
        type: 'sentence_order',
        korean: '그냥 연락하고 싶었어.',
        shuffled: ['just', 'wanted', 'to', 'message', 'you', 'I'],
        answer: ['I', 'just', 'wanted', 'to', 'message', 'you'],
      },
    ],
    summary: {
      summary_text: '특별한 이유 없이 서로를 떠올리며 연락했어요.',
      long_summary:
        '특별한 사건 없이도 서로를 떠올리며 연락하게 되는 감정을 공유했어요.\n일상이 자연스럽게 연결된 관계라는 인식이 대화 속에 담겼어요.',
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
        id: '2026-01-10-order',
        type: 'sentence_order',
        korean: '거리 있어도 괜찮아.',
        shuffled: ['okay', 'even', 'with', 'the', 'distance', 'It', 'is'],
        answer: ['It', 'is', 'okay', 'even', 'with', 'the', 'distance'],
      },
    ],
    summary: {
      summary_text: '장거리 연애에 대한 신뢰와 안정감을 확인했어요.',
      long_summary:
        '열흘간 이어진 대화를 돌아보며 관계의 흐름을 함께 정리했어요.\n거리와 시간의 제약이 있어도 현재의 속도를 긍정적으로 받아들이는 분위기였어요.',
      tags: ['거리', '신뢰', '장거리연애', '안정'],
      warning_text: null,
      warning_tags: [],
      risk_level: 0,
    },
  },
];
