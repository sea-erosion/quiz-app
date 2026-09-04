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
        correctIndex: 0,
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
        choices: ['親指', '人差し指', '小指', '薬指'],
        correctIndex: 2,
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
        body: '太陽系で一番大きい惑星は？',
        choices: ['地球', '土星', '木星', '海王星'],
        correctIndex: 2,
        timeLimitSec: 15,
        points: 800,
      },
      {
        body: '「情けは人の為ならず」の意味として正しいのは？',
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
        body: '観光名所として知られている、下呂温泉のある都道府県は？',
        choices: ['大分県', '群馬県', '岐阜家', '兵庫県'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: 'この中で二人いないとできないことはどれ？',
        choices: ['拍手', '握手', '手品', 'あやとり'],
        correctIndex: 1,
        timeLimitSec: 15,
        points: 600,
      },
      {
        body: '東京ディズニーランドのシンデレラ城の高さは地上から何メートル？',
        choices: ['約31M', '約41M', '約51M', '約61M'],
        correctIndex: 2,
        timeLimitSec: 15,
        points: 500,
      },
      {
        body: '恥をかかせることを「何に泥を塗る」という？',
        choices: ['面', '頭', '服', '顔'],
        correctIndex: 3,
        timeLimitSec: 15,
        points: 700,
      },
      {
        body: '次の世界遺産のうち奈良県にあるものは？',
        choices: ['清水寺', '延暦寺', '法隆寺', '平等院'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 800,
      },
      {
        body: '調味料の「さしすせそ」。「そ」は何を指す？',
        choices: ['塩', '味噌', 'ソイソース', 'ソース'],
        correctIndex: 1,
        timeLimitSec: 15,
        points: 600,
      },
      {
        body: '次のうち羽がないものは？',
        choices: ['餃子', '鶏', '扇風機', 'トビウオ'],
        correctIndex: 3,
        timeLimitSec: 15,
        points: 1100,
      },
      {
        body: '京都の金閣寺は何層建て？',
        choices: ['一層', '二層', '三層', '四層'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 800,
      },
      {
        body: '次のうち、実際に眠っていないのは？',
        choices: ['たぬき寝入り','うたたね','まどろみ','仮眠'],
        correctIndex: 0,
        timeLimitSec: 20,
        points: 1000,
      },
      {
        body: '嘘つきかどうかを見分けるというローマにある観光名所は「何の口」？',
        choices: ['誠', '真実', '審判', '偽り'],
        correctIndex: 1,
        timeLimitSec: 15,
        points: 600,
      },      {
        body: 'ドラえもんに出てくる「どこでもドア」の限界移動距離は？',
        choices: ['1000光年', '100万キロ', '1光年', '10光年'],
        correctIndex: 3,
        timeLimitSec: 25,
        points: 1200,
      },      {
        body: 'クレヨンしんちゃんにでてくる「シロ」の特技は？',
        choices: ['綿あめ', 'おまわり', '鼻', 'ちんちん'],
        correctIndex: 0,
        timeLimitSec: 20,
        points: 1000,
      },      {
        body: '日本で一番売れている漫画はONE PIECEですが、二番目に売れている漫画は？',
        choices: ['ゴルゴ13', 'ドラゴンボール', '鬼滅の刃', '名探偵コナン'],
        correctIndex: 0,
        timeLimitSec: 15,
        points: 900,
      },      {
        body: 'ファイナルファンタジーを作ったゲーム会社は？',
        choices: ['SEGA', '任天堂', 'スクウェア・エニックス', 'CAPCOM'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 800,
      },      {
        body: '次のうち一番面積の大きい大陸は？',
        choices: ['オーストラリア大陸', '南アメリカ大陸', '北アメリカ大陸', '南極大陸'],
        correctIndex: 2,
        timeLimitSec: 25,
        points: 1000,
      },      {
        body: '「荒城の月」の作曲者は？',
        choices: ['滝廉太朗', '滝廉太郎', '滝廉大郎', '米津玄師'],
        correctIndex: 1,
        timeLimitSec: 25,
        points: 1200,
      },      {
        body: '瀬戸内海にある女木島。御伽噺でも知られるこの島の別名は？',
        choices: ['常世の国', 'マボロシじま', '竜宮城', '鬼ヶ島'],
        correctIndex: 3,
        timeLimitSec: 20,
        points: 900,
      },
      {
        body: 'あまり見ることのない2000円札に描かれている肖像画にいない人物は？',
        choices: ['首里城', '紫式部', '冷泉院', '光源氏'],
        correctIndex: 0,
        timeLimitSec: 25,
        points: 1000,
      },
      {
        body: '寿司屋ではお茶のこと、すごろくではゴールを意味する言葉は何？',
        choices: ['しゃり', 'あがり', 'むらさき', 'おわり'],
        correctIndex: 1,
        timeLimitSec: 25,
        points: 600,
      },
      {
        body: '30歳はみそじ、40歳はよそじ、では50歳は何という？',
        choices: ['あかじ', 'ごそじ', 'ほそじ', 'いそじ'],
        correctIndex: 3,
        timeLimitSec: 15,
        points: 700,
      },
      {
        body: '自分自身の美しさを感じたり酔いしれたりする人のことをギリシャ神話の登場人物にちなんで何という？',
        choices: ['イキリスト', 'エゴイスト', 'ナルシスト', 'アナリスト'],
        correctIndex: 2,
        timeLimitSec: 20,
        points: 1000,
      }, 
   ],
  },
];
