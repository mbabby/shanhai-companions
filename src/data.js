// Original game adaptations; numbers are first-playable tuning, not mythology claims.
export const CREATURES = [
  {id:'fox',role:'高速灼伤',name:'小绒',species:'九尾狐',element:'火',hp:112,attack:31,defense:12,speed:58,description:'九条绒尾藏着暖火，喜欢暖光与轻轻靠近的脚步。',moves:[
    {id:'fox-basic',name:'尾火',description:'火属性普通攻击，无冷却。',power:24,cooldown:0},
    {id:'fox-skill',name:'流焰',description:'火属性攻击，灼伤三次，每次损失最大生命的 6%。',power:32,cooldown:2,effect:{type:'burn',value:3}},
    {id:'fox-guard',name:'绒尾屏',priority:1,description:'优先出手，获得 28 点护盾，抵挡直接伤害。',power:0,cooldown:3,effect:{type:'shield',value:28}}]},
  {id:'turtle',role:'厚甲蓄势',name:'砚砚',species:'旋龟',element:'水',hp:145,attack:25,defense:23,speed:30,description:'鸟首探出墨色龟甲，听见水声便轻轻摆尾。',moves:[
    {id:'turtle-basic',name:'水弹',description:'水属性普通攻击，无冷却。',power:25,cooldown:0},
    {id:'turtle-skill',name:'回潮',description:'强力水属性攻击。',power:43,cooldown:2},
    {id:'turtle-guard',name:'玄甲',priority:1,description:'优先出手，获得 36 点护盾，抵挡直接伤害。',power:0,cooldown:3,effect:{type:'shield',value:36}}]},
  {id:'deer',role:'克土续航',name:'阿蜀',species:'鹿蜀',element:'木',hp:122,attack:28,defense:15,speed:48,description:'白首虎纹的小马循歌踏叶，赤尾拂过青苔。',moves:[
    {id:'deer-basic',name:'叶蹄',description:'木属性普通攻击，无冷却。',power:25,cooldown:0},
    {id:'deer-skill',name:'青枝',description:'强力木属性攻击。',power:43,cooldown:2},
    {id:'deer-guard',name:'林息',description:'恢复自身 35 点生命，不超过上限。',power:0,cooldown:3,effect:{type:'heal',value:35}}]},
  {id:'boar',role:'土系重击',name:'团掘',species:'狸力',element:'土',hp:138,attack:30,defense:20,speed:26,description:'圆滚滚的掘土小兽用足爪修整山径。',moves:[
    {id:'boar-basic',name:'碎土',description:'土属性普通攻击，无冷却。',power:25,cooldown:0},
    {id:'boar-skill',name:'震岩',description:'强力土属性攻击。',power:44,cooldown:2},
    {id:'boar-guard',name:'垒石',priority:1,description:'优先出手，获得 32 点护盾，抵挡直接伤害。',power:0,cooldown:3,effect:{type:'shield',value:32}}]},
  {id:'ape',role:'高速干扰',name:'白耳',species:'狌狌',element:'金',hp:108,attack:30,defense:12,speed:64,description:'白耳幼猿攀岩如飞，爱把清响的小石排成一列。',moves:[
    {id:'ape-basic',name:'鸣石',description:'金属性普通攻击，无冷却。',power:24,cooldown:0},
    {id:'ape-skill',name:'断响',description:'金属性攻击，让对方接下来两回合速度减半。',power:32,cooldown:2,effect:{type:'slow',value:3}},
    {id:'ape-guard',name:'石环',priority:1,description:'优先出手，获得 26 点护盾，抵挡直接伤害。',power:0,cooldown:3,effect:{type:'shield',value:26}}]},
  {id:'fish',role:'水系减速',name:'游角',species:'鯥',element:'水',hp:116,attack:32,defense:13,speed:44,description:'小牛般的水兽展开短翼，蛇尾在溪中画着圈。',moves:[
    {id:'fish-basic',name:'跃浪',description:'水属性普通攻击，无冷却。',power:25,cooldown:0},
    {id:'fish-skill',name:'寒流',description:'水属性攻击，让对方接下来两回合速度减半。',power:34,cooldown:2,effect:{type:'slow',value:3}},
    {id:'fish-guard',name:'水幕',priority:1,description:'优先出手，获得 28 点护盾，抵挡直接伤害。',power:0,cooldown:3,effect:{type:'shield',value:28}}]}
];
