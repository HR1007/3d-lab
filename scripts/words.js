/*
  小遊戲的英文單字題庫，分三個等級（每局依序出 5 個初級、5 個中級、5 個高級）：
    1 初級  國小程度的生活單字 100 個
    2 中級  國中基礎 1200 單字裡 3–6 個字母的字 676 個
    3 高級  國中基礎 1200 單字裡 7 個字母以上的字 473 個
  中文提示取字表上的第一個解釋，少數改成較常用的意思。[需確認] 由老師或設計師再檢查一次

  題庫正本在 Supabase（專案 3dlab 的 words 資料表），在後台改字、改中文、取消 enabled 就會生效。
  這支檔案底下的 LOCAL 是內建備份：連不上 Supabase（沒網路、直接開檔案、專案被暫停）時改用它，遊戲不會壞。
  備份不會自動跟著後台更新；後台改了很多字之後，可以請人重新匯出一次。

  為什麼用 JS：要從資料庫讀資料只能用 JS；用瀏覽器內建的 fetch 直接讀 Supabase 的 REST API，不需要另外的函式庫。
  publishable key 本來就是給網頁用的公開金鑰，只能讀到「啟用中的單字」，不能改資料（權限設在 Supabase 的 RLS）。

  提供：Lab.wordBank.ready → Promise，解析成 { 1: [{ en, zh }], 2: [...], 3: [...] }
        Lab.wordBank.source → 'supabase' 或 'local'（實際用的是哪一份）
        Lab.wordBank.LEVELS → 等級名稱
*/

(function () {
  const Lab = (window.Lab = window.Lab || {});

  const SUPABASE_URL = 'https://bivekbujidtxdwzyeyvp.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_oPlBBaMRu8c6vwjZjvAEyQ_YU5C4oEC';
  const TIMEOUT = 5000; // 5 秒還讀不到就用內建備份

  const LEVELS = { 1: '初級', 2: '中級', 3: '高級' };
  const MIN_PER_LEVEL = 5; // 一個等級至少要有一局的量，不夠就用內建備份
  const WORD = /^[a-z]{3,}$/; // 字母只有 a–z（店裡只賣這 26 個字母）

  // 內建備份：每個字是「英文 中文」，用 | 隔開
  const LOCAL = {
    1: [
      'bread 麵包|cake 蛋糕|cookie 餅乾|egg 蛋|rice 米飯|milk 牛奶|juice 果汁|water 水|candy 糖果|pizza 披薩',
      'apple 蘋果|banana 香蕉|orange 柳橙|grape 葡萄|lemon 檸檬|peach 桃子|tomato 番茄|carrot 紅蘿蔔|potato 馬鈴薯|corn 玉米',
      'cat 貓|dog 狗|bird 鳥|fish 魚|rabbit 兔子|bear 熊|fox 狐狸|horse 馬|duck 鴨子|tiger 老虎',
      'red 紅色|blue 藍色|green 綠色|yellow 黃色|black 黑色|white 白色|pink 粉紅色|brown 棕色|purple 紫色|gray 灰色',
      'one 一|two 二|three 三|four 四|five 五|six 六|seven 七|eight 八|nine 九|ten 十',
      'head 頭|hand 手|foot 腳|eye 眼睛|ear 耳朵|nose 鼻子|mouth 嘴巴|arm 手臂|leg 腿|hair 頭髮',
      'house 房子|door 門|window 窗戶|table 桌子|chair 椅子|bed 床|sofa 沙發|lamp 檯燈|clock 時鐘|box 盒子',
      'book 書|pen 原子筆|pencil 鉛筆|bag 包包|desk 書桌|ruler 尺|eraser 橡皮擦|teacher 老師|student 學生|school 學校',
      'hat 帽子|cap 棒球帽|shirt 襯衫|dress 洋裝|skirt 裙子|pants 褲子|shoes 鞋子|socks 襪子|coat 外套|jacket 夾克',
      'sun 太陽|moon 月亮|star 星星|rain 雨|snow 雪|wind 風|cloud 雲|tree 樹|flower 花|sea 海',
    ],
    2: [
      'abroad 國外|absent 缺席的|accept 接受|across 橫過|act 行動|action 動作|active 活躍的|actor 男演員|add 添加|admire 欽佩',
      'admit 承認|adopt 收養|adult 成人|adverb 副詞|advice 勸告|advise 勸告|affair 事情|affect 影響|ahead 在前|aid 幫助',
      'aim 瞄準|alarm 警報|album 相簿|alike 同樣的|alive 活著的|alley 弄|allow 允許|alone 單獨的|aloud 出聲地|among 在…之中',
      'amount 合計|angel 天使|anger 憤怒|ankle 踝|ant 螞蟻|anyway 無論如何|apply 申請|area 地區|argue 爭論|army 軍隊',
      'arrest 逮捕|artist 藝術家|asleep 睡覺的|assume 假定|attack 攻擊|attend 出席|avoid 避免|awake 喚醒|aware 意識到|bake 烘',
      'banker 銀行家|bar 條|basis 基礎|barber 理髮師|bark 吠|base 基地|basic 基本的|bat 蝙蝠|bean 豆|beard 鬍鬚',
      'beat 打|beer 啤酒|behave 行為|being 存在|belief 信任|bench 長凳|best 最好的|better 較好的|beyond 超出|bill 帳單',
      'bit 一點|bitter 痛苦的|blame 責備|blank 空的|blood 血液|blouse 女式襯衫|board 木板|boil 沸騰|bomb 炸彈|bone 骨',
      'bother 打擾|bow 弓|brain 腦袋|branch 樹枝|brave 勇敢的|brick 磚|brief 摘要|broad 寬的|brunch 早午餐|bucket 水桶',
      'buffet 自助餐廳|bug 蟲|bun 小圓麵包|bundle 包|burger 口漢堡|burst 爆裂|button 鈕扣|cable 纜線|cage 籠|calm 平靜的',
      'campus 校園|cancel 取消|cancer 癌|candle 蠟燭|career 事業|carpet 地毯|cash 現金|castle 城堡|cause 原因|cell 單元',
      'cereal 穀物|charge 索價|chart 海圖|chase 追趕|chess 西洋棋|chief 首領|chin 下巴|choice 選擇|choose 選擇|chubby 胖嘟嘟的',
      'claim 聲稱|clap 拍手|clerk 店員|clever 聰明的|closet 壁櫥|cloth 布|coach 長途公共汽車|coast 海岸|coin 硬幣|comb 梳子',
      'corner 角|cotton 棉花|cough 咳嗽|county 縣|couple 夫妻|course 課程|court 庭院|crab 蟹|crayon 有色粉筆|cream 奶油',
      'create 創造|crime 犯罪|crisis 危機|crowd 群|cruel 殘酷的|cure 治癒|curve 曲線|custom 風俗習慣|daily 每日的|damage 毀壞',
      'danger 危險|data 資料|dawn 黎明|deaf 聾的|deal 給予|death 死|debate 辯論|debt 債務|deep 深的|deer 鹿',
      'degree 程度|delay 推遲|deny 否認|depend 依靠|desert 沙漠|design 設計|desire 願望|detect 發覺|dial 撥號盤|diary 日記',
      'diet 通常所吃的食物|direct 直接的|divide 分|dizzy 暈眩的|donkey 驢子|dot 點|double 兩倍的|doubt 懷疑|dragon 龍|drama 戲劇',
      'drawer 付款人|drinks 飲料|drug 藥|drum 鼓|dryer 烘乾機|dumb 啞的|duty 職責|eagle 鷹|earn 賺得|edge 邊',
      'effect 結果|effort 努力|elder 年齡大的|elect 選舉|employ 雇用|empty 空的|enemy 敵人|energy 精力|engine 引擎|entire 全部的',
      'envy 羡慕|equal 相等的|error 錯誤|event 事件|evil 壞的|exact 精確的|exam 考試|excite 使興奮|exist 存在|exit 出口',
      'expect 預料|extra 額外的|fail 失敗|fair 公平的|fancy 奇特的|far 遠|faucet 龍頭|fault 過失|favor 好感|fear 害怕',
      'fellow 人|fence 柵欄|fever 發燒|field 田地|fight 作戰|figure 數字|film 電影|final 最後的|firm 商行|fit 適合',
      'flag 旗幟|flat 平的|flight 飛翔|flour 麵粉|flow 流動|flu 流行性感冒|flute 笛|focus 使聚焦|fog 霧|foggy 多霧的',
      'fool 蠢人|force 強迫|forest 森林|form 形式|former 在前的|frank 率直的|frog 青蛙|fry 煎|gain 獲得|garage 車庫',
      'gate 大門|gather 聚集|gentle 和藹的|ghost 鬼|gloves 手套|glue 膠水|goal 球門|god 神上帝|gold 金|golden 金黃色的',
      'golf 高爾夫|goose 鵝|grand 盛大的|greedy 貪食的|greet 問候|guard 看守|guava 蕃石榴|guest 客人|guide 嚮導|guitar 吉他',
      'gun 槍|guy 男人|gym 體操房|hall 大廳|hammer 槌|handle 柄|hang 懸掛|hanger 掛衣架|hardly 簡直不|heater 加熱器',
      'height 高|hen 母雞|hero 英雄|hey 嘿|hike 遠足|hiking 步行|hip 臀部|hippo 河馬|hire 雇傭|hole 洞',
      'honey 蜂蜜|hop 單腳跳|host 主人|huge 巨大的|human 人的|humble 謙遜的|humid 有濕氣的|humor 幽默|hunger 饑餓|hunt 狩獵',
      'hunter 獵人|ill 有病的|inch 英寸|income 收入|ink 墨水|insect 昆蟲|insist 堅持|invent 發明|invite 邀請|iron 鐵',
      'jam 果醬|jar 甕|jazz 爵士樂|jeep 吉普車|joke 笑話|judge 法官|kitten 小貓|kitty 小貓|koala 無尾熊|lack 缺乏',
      'lady 淑女|lamb 小羊肉|lane 小路|law 法律|lawyer 律師|lay 放|leaf 葉子張|length 長度|level 水平|lid 蓋子',
      'lift 提|limit 限度|link 鏈環|liquid 液體的|loaf 一條塊麵包|local 本地的|lock 鎖|locker 小櫥櫃|loser 失敗者|loss 遺失',
      'lot 許多|lovely 可愛的|lychee 荔枝|mad 發病的|main 主要的|major 較大的|male 雄的|mall 散步式商店街|mango 芒果|manner 禮貌',
      'marker 作記號的人|marry 結婚|mask 面具|mass 眾多|master 主人|mat 席子|match 火柴|melon 瓜|member 成員|memory 記憶',
      'metal 金屬的|meter 米|method 方法|middle 中間|minor 較小的|minus 減|mirror 鏡子|mix 混合|model 模型|mop 拖把',
      'motion 運動|mud 泥|nail 釘子|napkin 餐巾|narrow 狹窄的|nation 國家|nature 大自然|nearly 幾乎|needle 針|nephew 侄子',
      'nest 巢|niece 侄女|noisy 喧鬧的|none 沒有一人|nor 也不|note 便條|nut 堅果|obey 順從|object 物體|occur 發生',
      'ocean 洋|offer 給予|omit 省略|onion 洋蔥|oops 噢！|oven 烤爐|owner 所有人|pain 疼痛|pale 蒼白的|pan 平底鍋',
      'panda 熊貓|papaya 木瓜樹|pardon 原諒|parrot 鸚鵡|paste 糊狀物|path 小路|pause 暫停|peace 和平|pear 梨|pepper 胡椒粉',
      'period 時間|photo 相片|pigeon 鴿子|pile 一堆|pillow 枕頭|pin 大頭針|pipe 管子|plain 平原|plant 植物|plate 盤子',
      'plus 加|pocket 衣袋|poem 詩|poison 毒|pond 池塘|pool 水池|port 港口|post 張貼|pot 罐|power 權力',
      'praise 稱讚|pray 請求|prefer 更喜歡|press 壓|priest 神父|prince 王子|print 印刷|prison 監獄|prize 獎賞|prove 證明',
      'pump 抽水機|punish 懲罰|puppy 小狗|purse 錢包|puzzle 使迷惑使為難|quit 停止|quiz 測驗|race 比賽|raise 舉起|rapid 快的',
      'rare 稀有的|rat 鼠|rather 相當|reach 到達|reason 理由|recent 新近的|record 記錄|refuse 拒絕|regard 看待|regret 遺憾',
      'reject 拒絕|remind 提醒|rent 租金|repair 修理|reply 回答|report 報告書|result 結果|return 返回|review 評論|revise 修訂',
      'rise 起立|rob 搶劫|robot 機器人|rock 岩石|role 角色|roll 滾動|roof 屋頂|root 根部|rope 繩|row 一排',
      'rub 摩擦|rubber 橡皮|rude 無禮的|rush 衝|safety 安全|sail 帆|sailor 水手|sample 樣品|sand 沙子|saucer 碟子',
      'scared 驚嚇的|scarf 圍巾|scene 一場|score 得分|screen 螢幕|search 搜尋|secret 秘密的|seed 種子|seek 尋找|seem 好像',
      'seesaw 蹺蹺板|select 挑選|sense 感言|serve 服務|set 一套|shake 搖動|shark 鯊魚|sharp 鋒利的|sheet 一張|shelf 棚',
      'shine 照耀|shock 震動|shoot 嫩枝|shore 岸|shorts 短褲|shot 射擊|shout 呼喊|shower 陣雨|shrimp 小蝦|shut 關閉',
      'sight 視力|sign 標記|silent 寂靜的|silly 傻的|silver 銀色的|simply 簡單地|single 單一的|sink 沉|skate 溜冰鞋|ski 滑雪',
      'skiing 滑雪|skill 技能|skin 皮膚|skinny 皮的|sleepy 困乏的|slide 滑行|slim 苗條的|snail 蝸牛|sneaky 鬼祟的|snowy 下雪的',
      'soap 肥皂|soccer 足球|social 社交的|soda 汽水|soft 軟的|solve 解釋|sort 種類|soul 靈魂|sour 酸的|speech 說話',
      'speed 速度|spider 蜘蛛|spirit 精神|sport 運動|spread 推開|stage 階段|stairs 樓梯|stamp 郵票|state 狀態|steal 偷',
      'steam 蒸汽|step 步|stick 捧|stingy 吝嗇的|stone 石頭|storm 暴風雨|stormy 暴風雨的|stove 爐|straw 稻草|stream 小河',
      'strike 打|style 作風|subway 地鐵|such 這樣的|sudden 突然的|suit 合適|supper 晚餐|surf 海浪|swan 天鵝|sweep 打掃',
      'swing 搖擺|symbol 象徵|tail 尾巴|tank 槽|task 任務|teapot 茶壺|tear 眼淚|temple 寺廟|tent 帳蓬|term 學期',
      'thick 厚的|thief 小偷|throat 咽喉|throw 扔|thumb 拇指|thus 如此|tidy 整潔的|tie 拴|till 直到|tiny 極小的',
      'tip 頂|title 標題|toast 烤麵包片|toe 腳趾|tofu 豆腐|toilet 浴室|tongue 舌頭|tool 工具|top 頂端|topic 題目',
      'total 總計|tour 旅行|toward 朝|tower 塔樓|trace 追蹤|track 跑道|trade 貿易|trap 陷阱|travel 旅行|treat 對待',
      'trick 欺詐|trust 信任|truth 真相|tub 桶|tummy 肚子|tunnel 隧道|turkey 火雞|turtle 海龜|twice 兩倍|type 類型',
      'ugly 醜陋的|unique 唯一的|unit 單位|upon 在…上|used 用過的|usual 通常的|valley 山谷|value 價值|verb 動詞|vest 背心',
      'violin 小提琴|vote 投票|voter 投票者|waist 腰|wallet 錢包|war 戰爭|waste 浪費|wave 揮動|weight 重量|whale 鯨魚',
      'wheel 輪|while 當…的時候|whole 全部的|whom 誰|wide 寬闊的|wild 野生的|wine 酒|wing 翅膀|winner 贏家|within 在…之內',
      'wolf 狼|wonder 感到驚訝|wood 木材|wooden 木製的|woods 樹林|worth 值得|wound 創傷|wow 哎喲|wrist 手腕|yard 院子',
      'youth 青春|yucky 令人厭惡的|yummy 好吃的|zebra 斑馬|zero 零|false 假的',
    ],
    3: [
      'ability 能力|accident 意外的事|achieve 完成|activity 活動|actress 女演員|addition 加|address 地址|adjective 形容詞的|advance 前進|advantage 優勢',
      'advertisement 廣告|against 違反|aircraft 飛行器|airline 航線|airmail 航空信|alphabet 字母|altogether 總共|ambulance 救護車|ancient 已往的|anywhere 任何地方',
      'apologize 道歉|appearance 出現|appreciate 瞭解|armchair 扶手椅|arrange 安排|article 文章|assistant 助手|attention 注意|audience 聽眾|auxiliary 輔助的',
      'available 可利用的|badminton 羽毛球|balcony 陽臺|balloon 氣球|backward 向後地|barbecue 吃烤燒肉的野餐|basement 地下室|beautifully 美麗地|beginner 初學者|beginning 開始',
      'besides 除此之外|biology 生物學|blanket 毯子|bookcase 書櫥|bowling 保齡球|boyfriend 男朋友|broadcast 廣播|building 建築物|butterfly 蝴蝶|cabbage 甘藍菜',
      'cabinet 櫥櫃美內閣|cafeteria 自助餐廳|calendar 月曆|camping 露營|captain 船長|carefully 小心地|careless 不注意的|cartoon 政治性漫畫|cassette 卡式盒匣|ceiling 天花板',
      'centimeter 釐米|central 中央的|century 世紀|certain 確定的|certainly 的確|chairman 主席|channel 海峽|chapter 章|character 性格|cheerleader 啦啦隊隊長',
      'chemical 化學的|childhood 孩童時期|childish 孩子氣的|childlike 孩子似的|children 一個以上的孩童|citizen 公民|classic 傑作|classical 古典的|climate 氣候|climbing 攀登',
      'clothing 衣服|cockroach 蟑螂|collection 收藏|college 大學|comfortably 舒適地|command 命令|comment 註釋|company 公司|compare 比較|complain 抱怨',
      'complete 完全的|concern 關心|confident 自信的|confirm 證實|conflict 衝突|confuse 使混亂|congratulation 祝賀|connective 連結的|consider 認為|contain 包含',
      'continue 繼續|contract 合同|control 控制|conversation 談話|cookies 餅乾|cooking 烹調|countryside 農村|courage 勇氣|crowded 擁擠的|culture 文化',
      'curious 好奇的|current 水流|curtain 簾|customer 顧客|dancing 跳舞|decision 決定|decorate 裝飾|deliver 投遞|democracy 民主政治|democratic 民主的',
      'dentist 牙醫|department 部門|describe 形容|dessert 甜點|determine 決定|determiner 限定詞|develop 發展|diamond 鑽石|difference 差別|difficulty 困難',
      'diligent 勤奮的|dinosaur 恐龍|diplomat 外交官|direction 方向|director 指導者|disappear 消失|discover 發現|discuss 討論|discussion 討論|dishonest 不誠實的',
      'distance 距離|division 分開|document 公文|dolphin 海豚|doughnut 甜甜圈|downstairs 樓下的|downtown 往市中心|drawing 畫畫|dresser 碗櫃|drugstore 藥局',
      'dumpling 餃子|earrings 耳環|eastern 東方的|education 教育|effective 有效的|eighteenth 第十八|election 選舉|electric 電的|electricity 電|element 要素',
      'eleventh 第十一|emotion 情感|emphasize 強調|encourage 鼓勵|engineer 工程師|entrance 入口|envelope 信封|environment 環境|especially 特別|everywhere 到處',
      'examine 檢查|exercising 運動|explain 解釋|express 表示|eyebrow 眉毛|failure 失敗|fantastic 幻想的|fashionable 流行的|feather 羽毛|feeling 感覺',
      'fifteenth 第十五|fishing 釣魚|flashlight 手電筒|foolish 愚蠢的|football 足球|forgive 原諒|forward 向前的|fourteenth 第十四|freedom 自由|freezer 冷凍裝置',
      'freezing 結冰的|friendship 友誼|frighten 使驚嚇|function 官能|furniture 傢俱|general 一般的|generally 一般地|generation 代|generous 慷慨的|gentleman 先生',
      'geographical 地理學的|geography 地理學|gesture 姿勢|girlfriend 女朋友|glasses 眼鏡|goodness 善良|government 政府|granddaughter 孫女|grandson 孫子|grapefruit 葡萄柚樹',
      'haircut 理髮|hairdresser 美髮師|handkerchief 手帕|helicopter 直升飛機|highway 公路|hippopotamus 河馬|homesick 想家的|honesty 正直|horrible 恐怖的|housewife 家庭婦女',
      'housework 家務勞動|humorous 幽默的|imagine 料想|impolite 無禮的|importance 重要|impossible 不可能的|improve 改善|include 包括|increase 增加|indefinite 不確定的',
      'independent 獨立的|industry 工業|influence 影響|information 消息|inspire 鼓舞|instant 瞬間|instrument 器械|intelligent 有智力的|international 國際的|interrupt 打斷',
      'interview 接見|introduce 介紹|invitation 邀請|jealous 妒忌的|jogging 慢跑|journalist 新聞工作者|kangaroo 袋鼠|ketchup 蕃茄醬|kilometer 公里|kindergarten 幼稚園',
      'kingdom 王國|lantern 燈籠|lettuce 萵苣|lightning 閃電|location 場所|magazine 雜誌|magician 魔法師|manager 管理者|marriage 結婚|material 材料',
      'maximum 最大限度|meaning 意義|measure 量|measurement 測量|mechanic 機械工|message 訊息|microwave 微波|midnight 午夜|missing 失去的|monster 怪物',
      'mosquito 蚊子|movement 運動|musician 音樂家|nationality 國民性|natural 自然的|naughty 調皮的|necessary 必要的|necklace 項圈|necktie 領帶|negative 負的',
      'neighbor 鄰居|neither 也不|nervous 神經緊張的|newspaper 報紙|nineteenth 第十九|ninetieth 第九十|noodles 麵條|northern 北方的|occupation 職業|official 官方的',
      'oneself 自己|operate 運行|operation 運轉|opinion 意見|ordinary 一般的|organize 組織|overpass 陸橋|overseas 在海外的|painful 疼痛的|painter 畫家',
      'pajamas 睡衣|particular 特定的|partner 搭檔|passenger 乘客|patient 忍耐的|pattern 型|peaceful 和平的|perfect 完美的|personal 個人的|photograph 照片',
      'photographer 攝影師|pineapple 鳳梨|pingpong 乒乓球|plastic 塑膠的|platform 月臺|pleasant 令人愉快的|pleased 滿意的|pleasure 高興|policeman 警察|pollute 弄髒',
      'pollution 污染|population 人口|position 位置|positive 確信的|possessive 擁有的|precious 珍貴的|preposition 介系詞|president 總統|primary 第一的|princess 公主',
      'principal 校長|printer 印表機|prisoner 囚犯|private 私人的|probably 大概|produce 生產|product 產品|production 生產|professor 教授|progress 前進',
      'project 專案|promise 允諾|pronoun 代名詞|pronounce 發音|protect 保護|provide 供給|pumpkin 南瓜|purpose 目的|quality 品質|quarter 四分之一',
      'quickly 快|railroad 鐵路|raincoat 雨衣|reading 閱讀|realize 了解|receive 接見|recover 重新獲得|rectangle 長方形|recycle 使再迴圈|reflexive 反身代名詞',
      'regular 有規律的|relative 相對的|require 需要|respect 尊敬|responsible 有責任的|running 奔跑的|sailing 航行|salesman 銷售員|satisfied 滿意的|satisfy 使滿意',
      'schoolmate 校友|science 科學|scientist 科學家|seafood 海鮮|secondary 第二的|secretary 秘書|section 切斷|selfish 自私的|semester 學期|separate 分離的',
      'servant 僕人|service 服務|seventeenth 第十七|shopping 購物|silence 寂靜|similar 相似的|sincere 真誠的|singing 歌唱|sixteenth 第十六|skating 滑冰',
      'skillful 靈巧的|slender 細長的|slippers 拖鞋|sneakers 膠底運動鞋|snowman 雪人|society 社會|softball 壘球|soldier 士兵|southern 南方的|spaghetti 義大利麵條',
      'speaker 說話者|standard 標準|stationery 文具|stomachache 肚子痛|straight 直的|strawberry 草莓|struggle 鬥爭|subject 主題|submarine 潛艇|succeed 成功',
      'success 成就|successfully 成功地|suddenly 突然地|suggest 建議|suitcase 衣箱|support 支援|surface 表面|surfing 衝浪|survive 活下來|swallow 吞咽',
      'swimming 游泳|swimsuit 游泳衣|tableware 餐具|talkative 多嘴的|tangerine 椪柑|temperature 溫度|terrible 可怕的|terrific 極好的|textbook 教科書|thanksgiving 感謝',
      'therefore 因此|thirteenth 第十三|thirtieth 第三十|thought 思想|through 穿過|throughout 遍及|thunder 雷|toothache 牙痛|toothbrush 牙刷|tradition 傳統',
      'traditional 傳統的|transportation 運輸|traveling 旅行的|treasure 財寶|triangle 三角板|trousers 褲子|trumpet 喇叭|twelfth 第十二|twentieth 第二十|typewriter 打字機',
      'underlie 位於下面|underpass 地道|underwear 內衣|unfriendly 不友善地|universe 宇宙|university 大學|upstairs 在樓上|valuable 貴重的|victory 勝利|village 村莊',
      'vinegar 醋|visitor 參觀者|vocabulary 字彙|volleyball 排球|walkman 隨身聽|waterfall 瀑布|watermelon 西瓜|wedding 婚禮|weekday 平日|western 西的',
      'whatever 無論什麼|willing 願意的|worried 煩惱的',
    ],
  };

  const parse = (rows) =>
    rows
      .join('|')
      .split('|')
      .map((item) => {
        const [en, zh] = item.split(' ');
        return { en, zh };
      });
  const local = Object.fromEntries(Object.entries(LOCAL).map(([level, rows]) => [level, parse(rows)]));

  // 從 Supabase 讀一個等級（Supabase 一次最多回 1000 筆，所以分等級讀）
  async function fetchLevel(level, signal) {
    const url = `${SUPABASE_URL}/rest/v1/words?select=en,zh&enabled=eq.true&level=eq.${level}`;
    const response = await fetch(url, { headers: { apikey: SUPABASE_KEY }, signal });
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const rows = await response.json();
    const words = rows.filter((w) => WORD.test(w.en) && typeof w.zh === 'string' && w.zh.trim());
    if (words.length < MIN_PER_LEVEL) throw new Error(`等級 ${level} 只有 ${words.length} 個字`);
    return words.map((w) => ({ en: w.en, zh: w.zh.trim() }));
  }

  const bank = { LEVELS, source: 'local', ready: null };

  bank.ready = (async () => {
    if (location.protocol === 'file:') return local;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const levels = await Promise.all([1, 2, 3].map((level) => fetchLevel(level, controller.signal)));
      bank.source = 'supabase';
      return { 1: levels[0], 2: levels[1], 3: levels[2] };
    } catch (error) {
      console.warn('[單字題庫] 讀不到 Supabase，改用內建備份：', error.message);
      return local;
    } finally {
      clearTimeout(timer);
    }
  })();

  Lab.wordBank = bank;
})();
