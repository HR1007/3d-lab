/*
  小遊戲的英文單字：100 個生活單字，10 類各 10 個（國小程度）。[需確認] 單字與中文
  每一筆：en 英文、zh 中文提示（題目卡和顧客的泡泡上顯示）、cat 分類。
  遊戲每一局從這裡隨機抽 15 個不重複的字，挖掉幾個字母讓玩家補上（規則在 scripts/play.js）。
*/

(function () {
  const Lab = (window.Lab = window.Lab || {});

  const LIST = {
    食物飲料: 'bread 麵包, cake 蛋糕, cookie 餅乾, egg 蛋, rice 米飯, milk 牛奶, juice 果汁, water 水, candy 糖果, pizza 披薩',
    蔬果: 'apple 蘋果, banana 香蕉, orange 柳橙, grape 葡萄, lemon 檸檬, peach 桃子, tomato 番茄, carrot 紅蘿蔔, potato 馬鈴薯, corn 玉米',
    動物: 'cat 貓, dog 狗, bird 鳥, fish 魚, rabbit 兔子, bear 熊, fox 狐狸, horse 馬, duck 鴨子, tiger 老虎',
    顏色: 'red 紅色, blue 藍色, green 綠色, yellow 黃色, black 黑色, white 白色, pink 粉紅色, brown 棕色, purple 紫色, gray 灰色',
    數字: 'one 一, two 二, three 三, four 四, five 五, six 六, seven 七, eight 八, nine 九, ten 十',
    身體: 'head 頭, hand 手, foot 腳, eye 眼睛, ear 耳朵, nose 鼻子, mouth 嘴巴, arm 手臂, leg 腿, hair 頭髮',
    家裡: 'house 房子, door 門, window 窗戶, table 桌子, chair 椅子, bed 床, sofa 沙發, lamp 檯燈, clock 時鐘, box 盒子',
    學校: 'book 書, pen 原子筆, pencil 鉛筆, bag 包包, desk 書桌, ruler 尺, eraser 橡皮擦, teacher 老師, student 學生, school 學校',
    衣物: 'hat 帽子, cap 棒球帽, shirt 襯衫, dress 洋裝, skirt 裙子, pants 褲子, shoes 鞋子, socks 襪子, coat 外套, jacket 夾克',
    自然天氣: 'sun 太陽, moon 月亮, star 星星, rain 雨, snow 雪, wind 風, cloud 雲, tree 樹, flower 花, sea 海',
  };

  // 「英文 中文, 英文 中文…」拆成 { en, zh, cat }，資料寫成一行一類，方便直接增減
  Lab.words = Object.entries(LIST).flatMap(([cat, line]) =>
    line.split(',').map((entry) => {
      const [en, zh] = entry.trim().split(' ');
      return { en, zh, cat };
    })
  );
})();
