// 出題用の「問題プール」を複数用意しておく。
// 本来はJSON/TSVアップロードで登録する想定だが、
// まずはこの固定データでロビー〜出題の流れを作る。
// ホスト側の「ルームを作る」画面で、この中から使うプールと出題数を選べるようにする。

export type QuizPool = {
  id: string;
  title: string;
  authorName: string;
  description: string;
  isTutorial?: boolean; // trueの場合、ホスト側で出題数選択を1問固定にし、各画面に説明を表示する
  questions: {
    body: string;
    choices: string[];
    correctIndex: number;
    timeLimitSec: number;
    points: number;
  }[];
};

// チュートリアルモード用の1問だけのプール。
// ゲームの流れ(予告→出題→結果発表→終了)を実際に体験しながら理解してもらうためのもの。
export const tutorialPool: QuizPool = {
  id: 'tutorial',
  title: 'チュートリアル(ゲームの流れを説明)',
  authorName: '開発用',
  description: '1問だけの練習用。画面の流れを説明しながら進みます',
  isTutorial: true,
  questions: [
    {
      body: 'これはチュートリアル問題です。「クイズ」を選んでください',
      choices: ['クイズ', 'アンケート', '宿題', '面接'],
      correctIndex: 0,
      timeLimitSec: 20,
      points: 1000,
    },
  ],
};
 

export const quizPools: QuizPool[] = [
  {
    id: 'general-20',
    title: '一般常識クイズ(20問プール)',
    authorName: '開発用',
    description: '雑学・一般常識を中心にした20問のプール',
    questions: [
    {
        body: '現在の形態のものは1946年に埼玉県蕨町で行われた「青年祭」が起源とされる、一般に1月の第2月曜日に行われる20歳を迎えた人々を祝うイベントは何でしょう？',
        choices: ['結婚式', 'バレンタインデー', '成人式', 'ハロウィン'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: 'アニメ『それいけ！アンパンマン』で、ジャムおじさんが飼っている犬の名前は何でしょう？',
        choices: ['名犬チーズ', '名犬ジャム', '名犬アンパン', '名犬バタコ'],
        correctIndex: 0,
        timeLimitSec: 10,
        points: 500,
      },
      {
        body: '1853年生まれのポスト印象派の画家で、『アルルの跳ね橋』や『ひまわり』などで知られる人物は誰でしょう？',
        choices: ['モネ', 'セザンヌ', 'ゴーギャン', 'ゴッホ'],
        correctIndex: 3,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: '記号「dB」で表される、主に騒音のレベルを示す際などに用いられる単位は何でしょう？',
        choices: ['デシベル', 'キロメートル', 'メートル', 'キログラム'],
        correctIndex: 0,
        timeLimitSec: 15,
        points: 1000,
      },
      {
        body: 'わずかな元手で大きな利益を得ることを俗に「海老で何を釣る」というでしょう？',
        choices: ['さめ', 'たい', 'しらす', 'まぐろ'],
        correctIndex: 1,
        timeLimitSec: 10,
        points: 500,
      },
      {
        body: '前身となった組織・社団法人東京放送局の事業を継承する形で、1950年に放送法に基づき設立された、日本の公共放送機関である「日本放送協会」のことを、アルファベット3文字の略称で何というでしょう？',
        choices: ['NHK', 'BCC', 'CBC', 'ABC'],
        correctIndex: 0,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '元々は麦わらを利用していたことからその名前が付けられた、容器に入った飲料を飲む際に使われる細い管状の道具は何でしょう？',
        choices: ['コップ', 'ストロー', 'グラス', 'マドラー'],
        correctIndex: 1,
        timeLimitSec: 10,
        points: 500,
      },
      {
        body: '東京都千代田区永田町1丁目にある、かつての名称を「帝国議会議事堂」といった建物は何でしょう？',
        choices: ['国会議事堂', '東京駅', '日本銀行本店', '新宿迎賓館赤坂離宮'],
        correctIndex: 0,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: '「メディア良化法」が制定された架空の日本で、図書館の役割と本の自由を守るために戦う図書隊の姿が描かれた、有川ひろの連作小説は何シリーズでしょう？',
        choices: ['図書館難民', '図書館抗争', '図書館戦隊', '図書館戦争'],
        correctIndex: 3,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '北米大陸にあるスペリオル湖、ミシガン湖、ヒューロン湖、エリー湖、オンタリオ湖の5つの湖を総称して一般に何と呼ぶでしょう？',
        choices: ['五連湖', '五湖', '五大湖', '五小湖'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: '自らが大切に世話をしたり育てたりすることを、ある調味料の名前を使って「何に掛ける」というでしょう？',
        choices: ['手塩', '天塩', 'みりん', '天つゆ'],
        correctIndex: 1,
        timeLimitSec: 25,
        points: 1200,
      },
      {
        body: '葛飾北斎の『富嶽三十六景』において、あとから追加された10枚のことを、初めに摺られた「表富士」に対して何というでしょう？',
        choices: ['鏡富士', '裏富士', '二番富士', '続富士'],
        correctIndex: 1,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: 'その名はギリシャ語で「新しい」を意味する言葉に由来し、看板などに使われる放電管の封入ガスとして用いられる、原子番号10、元素記号Neの元素は何でしょう？',
        choices: ['ネオン', 'アルゴン', 'キセノン', 'アセチレン'],
        correctIndex: 0,
        timeLimitSec: 20,
        points: 1200,
      },
      {
        body: 'ゲームジャンルの1つ「RPG」とは、何という言葉の略でしょう？',
        choices: ['Role-Playing Game', 'Real Playing Game', 'Rapid Play Game', 'Remote Play Game'],
        correctIndex: 0,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '東京ディズニーリゾートに来園する人々のことを、従業員を指す「キャスト」に対する表現で何というでしょう？',
        choices: ['ゲスト', 'ファン', '訪問者', '利用者'],
        correctIndex: 0,
        timeLimitSec: 10,
        points: 300,
      },
      {
        body: '一般に、「ピンキーリング」はどの指にはめる指輪でしょう？',
        choices: ['親指', '人差し指', '中指', '薬指'],
        correctIndex: 3,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '1つの物事に関連して多くの物事が次から次へと明らかになる様子を、ある植物にたとえて「何式」というでしょう？',
        choices: ['かずら式', '芋づる式', '桜式', '竹式'],
        correctIndex: 1,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '日本の数の単位で「兆」の1万倍を表す単位は何でしょう？',
        choices: ['兆', '京', '億', '垓'],
        correctIndex: 1,
        timeLimitSec: 10,
        points: 300,
      },
      {
        body: '太陽系で一番大きい惑星は?',
        choices: ['地球', '土星', '木星', '海王星'],
        correctIndex: 2,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '「情けは人の為ならず」の意味として正しいのは?',
        choices: [
        '情けをかけると相手のためにならない',
        '情けをかけると巡り巡って自分にも良いことがある',
        '情けをかけるべきではない',
        '人に情けは不要だ',
        ],
        correctIndex: 1,
        timeLimitSec: 25,
        points: 1200,
      },
    ],
  },
  {
    id: 'science-tech-12',
    title: '理科・IT雑学クイズ(12問プール)',
    authorName: '開発用',
    description: '理科やIT・数学寄りの雑学を集めた12問のプール',
    questions: [
      {
        body: '人間の体温は平熱でだいたい何度?',
        choices: ['32〜33度', '34〜35度', '36〜37度', '39〜40度'],
        correctIndex: 2,
        timeLimitSec: 15,
        points: 500,
      },
      {
        body: 'コンピューターの頭脳と呼ばれる部品の略称は?',
        choices: ['CPU', 'USB', 'RAM', 'SSD'],
        correctIndex: 0,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: 'インターネットで使われる「Wi-Fi」は何の略に由来する語感を意図して名付けられた?',
        choices: ['Wireless Fidelity', 'Wide Fiber', 'Wire Free', 'World Field'],
        correctIndex: 0,
        timeLimitSec: 25,
        points: 1200,
      },
      {
        body: '元素記号「Fe」が表す元素は?',
        choices: ['金', '銀', '鉄', '銅'],
        correctIndex: 2,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '光と音、伝わる速さが速いのはどちら?',
        choices: ['光', '音', '同じ速さ', '状況による'],
        correctIndex: 0,
        timeLimitSec: 10,
        points: 500,
      },
      {
        body: '1バイトは何ビット?',
        choices: ['4ビット', '8ビット', '16ビット', '32ビット'],
        correctIndex: 1,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '植物が光合成をする際に主に吸収する気体は?',
        choices: ['酸素', '窒素', '二酸化炭素', '水素'],
        correctIndex: 2,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '人体で一番大きい臓器は?',
        choices: ['肝臓', '肺', '皮膚', '脳'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: 'プログラミングで「バグ」の語源になったとされる出来事は?',
        choices: [
          '実際にコンピューターに虫が入り込んだ',
          '開発者の名前がバグさんだった',
          'バグという名前の会社が最初に発見した',
          '特に由来はない',
        ],
        correctIndex: 0,
        timeLimitSec: 25,
        points: 1200,
      },
      {
        body: '地球から一番近い恒星(太陽以外)を含む系は?',
        choices: ['シリウス', 'ケンタウルス座アルファ星系', '北極星', 'ベガ'],
        correctIndex: 1,
        timeLimitSec: 25,
        points: 1200,
      },
      {
        body: '2進数の「1111」を10進数にすると?',
        choices: ['12', '14', '15', '16'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: '水が凍る温度(セ氏)は?',
        choices: ['-10度', '0度', '4度', '10度'],
        correctIndex: 1,
        timeLimitSec: 10,
        points: 300,
      },
    ],
  },
];
