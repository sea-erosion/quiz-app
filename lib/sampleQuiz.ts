// 動作確認用のサンプルクイズ。
// 本来はJSON/TSVアップロードで登録する想定だが、
// まずはこの固定データでロビー〜出題の流れを作る。
export const sampleQuiz = {
  title: 'サンプルクイズ',
  authorName: '開発用',
  description: '動作確認用の4問クイズ',
  shuffle: false,
  questions: [
    {
      body: '日本の首都は?',
      choices: ['大阪', '東京', '京都', '名古屋'],
      correctIndex: 1,
      timeLimitSec: 20,
      points: 1000,
    },
    {
      body: '1 + 1 は?',
      choices: ['1', '2', '3', '4'],
      correctIndex: 1,
      timeLimitSec: 10,
      points: 500,
    },
    {
      body: '富士山がある都道府県の組み合わせは?',
      choices: ['山梨県と静岡県', '長野県と山梨県', '静岡県と愛知県', '山梨県のみ'],
      correctIndex: 0,
      timeLimitSec: 20,
      points: 1000,
    },
  ],
};
