import { CREATURES } from './data.js';
import { createBattle, validateBattle } from './battle.js';
import { awardExperience, validateProgress } from './progression.js';
export const STARTERS = ['fox','turtle','deer'];
const ids=CREATURES.map(c=>c.id);
const check=(ok,message)=>{if(!ok) throw new Error(message);};
const clone=value=>structuredClone(value);
const add=(list,value)=>{if(!list.includes(value)) list.push(value);};
const node=(id,name,subtitle,description,speaker,text,species,actions,optional=false)=>({id,name,subtitle,description,dialogue:[{speaker,text}],species,actions:actions.map(([id,label,description])=>({id,label,description})),optional});
export const NODES = [
 node('village','谷口村','第一缕无水的晨光','石渠干了第三日。你带着空白手记来到谷口，发现异兽的足迹都指向同一座山。','守渠人阿榆','往年溪水唱着歌进村，如今只有石头响。别急着责怪山里的伙伴，先听听它们为什么迁来。',[],[['listen','听守渠人讲述','展开旧水图，记下源头、苇泽和石隘的位置。']]),
 node('forest','听叶林','在足迹之间放慢脚步','折断的根须横在旧渠上，泥土却是湿的。幼兽挤在林间高处，像在躲避某种声音。','录灵手记','每一道足迹都有自己的节奏。帮忙整理栖地，比追逐更容易赢得信任。',['fox','deer','boar','ape'],[['roots','扶正倒伏的幼木','根下露出一段旧石渠：水并未消失，而是被改了方向。']]),
 node('creek','回声溪','水面还留着答案','水只剩薄薄一线，枯叶绕着同一块石头打转。循着安静的水声，你能找到旋龟与鯥。','录灵手记','把枯叶移开后，水从石缝里向山上回旋。逆流留下的银白水痕，是寻找真正源头的线索。',['turtle','fish'],[['clear','清理浅滩枯叶','疏开一小段浅水，记录逆向的银白水痕。']]),
 node('ridge','鸣石隘','第一道守望','狌狌把石片排成环，狸力守着最窄的山路。它们不是袭击村落，而是在阻止更多伙伴踏入失稳的山体。','守隘的狌狌','石响时收住脚步，石静时再前行。让我们看看，你是否能带伙伴平安穿过。',[],[['listen','分辨石环的节拍','单数回合石环护体，伤害会减轻。利用防守与换位等待空隙。']]),
 node('marsh','迷苇泽','第二道回流','越过山隘，苇叶竟朝上游伏倒。守泽伙伴用身体挡住混浊的回流，彼此却被水声扰乱。','守泽的旋龟','急水会夺走脚下的节奏。看清下一阵水什么时候来，再决定谁站到前面。',[],[['measure','在苇杆刻下水位','偶数回合急流压低我方速度；优先护盾和适时换兽仍能争取主动。']]),
 node('shrine','旧泉祠','听见自己的回声','祠中没有供奉胜利者，只刻着六种足迹。石壁写道：同行不是命令，是听懂彼此再迈出一步。','泉祠留字','把同行的记忆留在泉石里。成熟不由战绩独断；愿意回应伙伴的呼唤，才有新的形貌。',[],[['attune','与伙伴共鸣 · 获得成长','为已结契的九尾狐、旋龟和鹿蜀补足至 90 经验；进化仍需你单独确认。']]),
 node('source','归泉眼','最后一道守护','你终于看见堵住泉眼的旧闸。守源的三兽以为关闸能保护下游，却不知裂隙把水送进了空山。','录灵手记','用水痕与泉音指出真正的流向，再通过最后的试炼。我们要共同打开旧闸，而不是赶走守护者。',[],[['trace','对照水痕与泉音','每第三回合泉压增强敌方直接攻击。提前护盾、调整出场伙伴，度过喷涌。']]),
 node('overlook','望岚台','支线 · 一页未干的画','小路尽头是能看见整条河谷的石台。有人用矿色画下水盛时的青岚谷，画边留了一枚空白叶签。','旧画背面的字','若有一天泉声回来，请在这里留下新伙伴的名字。山川很大，记得为同行者留一个位置。',[],[['sketch','画下今天的谷景','收好一枚青岚叶签；它没有战力，却记住了这次停留。']],true),
];
const habit=(clue,a,b)=>({clue,steps:[{prompt:'先让它感到安心',options:[{id:'gentle',label:a},{id:'rush',label:'快步靠近，伸手抱起'}],answer:'gentle',success:'它不再躲闪，开始留意你的动作。'},{prompt:'回应它的习性',options:[{id:'noise',label:'大声呼喊，催它跟上'},{id:'respond',label:b}],answer:'respond',success:'它主动靠近，你们的契印亮了起来。'}],mistake:'它退后半步。先前的信任没有消失：再读一遍习性，用温和的方式重试。'});
export const HABITS = {
 fox:habit('它循暖光而来，却怕急促的脚步。','在石边点一盏暖灯','放轻脚步，等它靠近'),
 turtle:habit('它在平稳浅水里歇息，听见轻轻水声便探头。','清理浅滩上的碎枝','用指尖轻点水面'),
 deer:habit('它寻觅嫩叶，耳朵跟着悠长平缓的歌声转动。','放下一束鲜嫩草叶','轻轻哼一段悠长小调'),
 boar:habit('它努力松土，遇到硬石会停下来挠头。','移开挡路的石块','帮它松开一小片泥土'),
 ape:habit('它喜欢模仿动作，突然伸手会让它躲进枝叶。','隔着树枝缓缓挥手','放下果子，后退一步'),
 fish:habit('它张开短翼，只愿靠近清澈而安静的水面。','捞起水面的枯叶','静静等待它游近'),
};
export const ENCOUNTERS = {
 ridge:{id:'ridge',node:'ridge',name:'鸣石守隘',description:'听懂石环的起伏，证明你能护送伙伴。',team:['ape','boar','fox'],hint:'单数回合敌方石甲减伤 8；偶数回合寻找进攻机会。',reward:30,item:'ridge-seal'},
 marsh:{id:'marsh',node:'marsh',name:'回流守泽',description:'在失去速度优势的急流里协调出场伙伴。',team:['fish','turtle','deer'],hint:'偶数回合我方速度减半。护盾优先级和换位可以帮助渡过急流。',reward:30,item:'marsh-seal'},
 source:{id:'source',node:'source',name:'归泉守望',description:'与三位守源者完成试炼，一同疏开泉眼。',team:['boar','ape','fish'],hint:'每第三回合敌方直接攻击增加 8 点；提前准备护盾或换上合适伙伴。',reward:30,item:'spring-heart'},
};
export const ENDING={title:'泉声归来，同行未止',paragraphs:['泉闸松开的那一刻，最先响起的不是欢呼，而是细小的水声。狸力拨开最后一块碎石，鯥顺着新水道滑向谷口。','守源者退开半步，为村落也为山野留出同一条河。阿榆在渠边插下一根新柳枝：这一回，人和异兽一起记住水从哪里来。','你在手记末尾写下：不是征服一座山，而是学会与山中的生命同行。青岚谷第一章至此完成；仍可拜访旧友、收集六兽、进化伙伴和重温三场试炼。']};
export function freshChapter(){return {chapter:1,phase:'choose',starter:null,team:[],owned:[],discovered:[],evolved:[],node:null,visited:[],completed:[],clues:[],items:[],interactions:[],bonds:{},encounter:null,bond:0,note:'',battle:null,battleId:null,milestones:[],rewardClaimed:false,gains:[],endingSeen:false};}
const free=run=>check(run.phase!=='battle','请先完成当前战斗');
const selected=run=>check(run.starter,'请先选择初始伙伴');
export function chooseStarter(run,id){check(run.phase==='choose'&&STARTERS.includes(id),'初始伙伴无效');const n=clone(run);Object.assign(n,{phase:'map',starter:id,team:[id],owned:[id],discovered:[id]});n.bonds[id]=2;return n;}
export function nodeStatus(run,id){check(NODES.some(n=>n.id===id),'未知地点');let reason='';if(!run.starter)reason='请先选择初始伙伴';else if(['marsh','shrine'].includes(id)&&!run.milestones.includes('ridge'))reason='先通过鸣石隘试炼';else if(id==='source'&&(!run.milestones.includes('marsh')||!run.items.includes('spring-tone')))reason='先通过迷苇泽，并在旧泉祠完成共鸣';return {unlocked:!reason,reason,completed:run.completed.includes(id)};}
export function visitNode(run,id){free(run);const status=nodeStatus(run,id);check(status.unlocked,status.reason);const n=returnToMap(run);n.phase='node';n.node=id;add(n.visited,id);for(const species of NODES.find(x=>x.id===id).species)add(n.discovered,species);return n;}
export function returnToMap(run){free(run);selected(run);check(!run.battle||run.rewardClaimed,'请先结算试炼');const n=clone(run);Object.assign(n,{phase:'map',encounter:null,bond:0,battle:null,battleId:null,rewardClaimed:false,gains:[],note:''});return n;}
export function openParty(run){const n=returnToMap(run);n.phase='party';return n;}
export function setTeam(run,team){free(run);selected(run);check(Array.isArray(team)&&team.length>=1&&team.length<=3&&new Set(team).size===team.length&&team.every(id=>run.owned.includes(id)),'队伍须由一至三只不同的已结契伙伴组成');const n=run.phase==='end'?returnToMap(run):clone(run);n.team=[...team];return n;}
export function bondStatus(run,id){check(ids.includes(id),'未知异兽');let reason='';if(run.phase!=='node'||!NODES.find(n=>n.id===run.node)?.species.includes(id))reason='请先到它栖息的地点观察';else if(!run.owned.includes(id)){if(run.node==='forest'&&!run.interactions.includes('forest:roots'))reason='先扶正倒伏的幼木，整理伙伴的栖地';if(run.node==='creek'&&!run.interactions.includes('creek:clear'))reason='先清理浅滩枯叶，让水面恢复安静';}return {unlocked:!reason,reason,completed:run.owned.includes(id)};}
export function startBond(run,id){const status=bondStatus(run,id);check(status.unlocked,status.reason);check(run.phase==='node'&&NODES.find(n=>n.id===run.node)?.species.includes(id),'此处没有这只异兽');const n=clone(run);if(n.owned.includes(id)){n.note='它已经与你结契，正在队伍或后备中等候。';return n;}n.encounter=id;n.bond=n.bonds[id]??0;n.note=HABITS[id].clue;return n;}
export function answerBond(run,optionId){check(run.phase==='node'&&run.encounter&&HABITS[run.encounter],'请先观察一只异兽');const n=clone(run),id=n.encounter,habit=HABITS[id],step=habit.steps[n.bond];check(step?.options.some(o=>o.id===optionId),'未知互动选项');if(optionId!==step.answer){n.note=habit.mistake;return n;}n.bond++;n.bonds[id]=n.bond;n.note=step.success;if(n.bond===2){add(n.owned,id);if(n.team.length<3)add(n.team,id);n.encounter=null;n.note=`${CREATURES.find(c=>c.id===id).name}已结契！${n.team.includes(id)?`已加入同行，当前队伍 ${n.team.length}/3。`:'已加入后备，可在「同行队伍」中替换上阵。'}`;}return n;}
export function interactNode(run,actionId,progress={}){check(run.phase==='node','请先进入地点');validateProgress(progress);const current=NODES.find(n=>n.id===run.node),action=current?.actions.find(a=>a.id===actionId);check(action,'此处没有这项互动');const n=clone(run),p=clone(progress),key=`${current.id}:${actionId}`;add(n.interactions,key);n.note=action.description;const rewards={listen:['valley-map','old-waterway'],roots:[null,'root-channel'],clear:[null,'water-trace'],measure:[null,'reverse-tide'],attune:['spring-tone',null],trace:[null,'spring-gate'],sketch:['leaf-bookmark','valley-picture']};const [item,clue]=rewards[actionId]??[];if(current.id==='ridge'){add(n.clues,'stone-rhythm');}else {if(item)add(n.items,item);if(clue)add(n.clues,clue);}if(actionId==='attune')for(const id of STARTERS)if(n.owned.includes(id))p[id]=90;if(!ENCOUNTERS[current.id])add(n.completed,current.id);return {run:n,progress:p};}
export function evolveCompanion(run,progress,id){free(run);validateProgress(progress);check(run.phase==='node'&&run.node==='shrine'&&run.completed.includes('shrine'),'请在旧泉祠共鸣后确认进化');check(STARTERS.includes(id)&&run.owned.includes(id)&&(progress[id]??0)>=90,'进化需要已结契的初始种族伙伴达到 90 经验');const n=clone(run);add(n.evolved,id);n.note='泉音与脚步重合，伙伴回应了你的呼唤。新的形态将在下一场试炼中展现力量。';return n;}
export function encounterStatus(run,id){check(ENCOUNTERS[id],'未知试炼');let {reason}=nodeStatus(run,id);if(!reason&&run.team.length!==3)reason='请先组成三只伙伴的队伍';if(!reason&&id==='source'&&!run.clues.includes('water-trace'))reason='先到回声溪清理枯叶，记录水痕';return {unlocked:!reason,reason,completed:run.milestones.includes(id)};}
export function beginEncounter(run,progress,id){free(run);validateProgress(progress);const s=encounterStatus(run,id);check(s.unlocked,s.reason);check(run.node===id&&['node','end'].includes(run.phase),'请先来到试炼地点');check(!run.battle||run.rewardClaimed,'请先结算上次试炼');const n=clone(run);Object.assign(n,{phase:'battle',encounter:null,bond:0,battleId:id,rewardClaimed:false,gains:[],note:''});n.battle=createBattle(n.team,ENCOUNTERS[id].team,{playerProgress:progress,playerEvolved:n.evolved,encounterId:id});return n;}
export function recordBattle(run,battle){check(run.phase==='battle','当前没有进行中的战斗');validateBattle(battle);check(battle.player.team.map(a=>a.id).join()===run.team.join()&&battle.enemy.team.map(a=>a.id).join()===ENCOUNTERS[run.battleId].team.join()&&battle.encounterId===run.battle.encounterId,'战斗队伍或试炼不匹配');const n=clone(run);n.battle=clone(battle);n.phase=battle.winner?'end':'battle';return n;}
export function settleEncounter(run,progress){check(run.phase==='end'&&run.battle?.winner,'战斗尚未结束');validateProgress(progress);validateBattle(run.battle);const n=clone(run);let p=clone(progress);if(n.rewardClaimed)return {run:n,progress:p};n.gains=[];if(n.battle.winner==='player'&&!n.milestones.includes(n.battleId)){const reward=awardExperience(p,n.team,'player');p=reward.progress;n.gains=reward.gains;add(n.milestones,n.battleId);add(n.items,ENCOUNTERS[n.battleId].item);add(n.completed,n.battleId);n.note='试炼完成，伙伴们记住了这次同行。';}else n.note=n.battle.winner==='player'?'重温试炼完成，首次奖励已经领取。':'伙伴已回到安全处。可调整队伍再试，所有结契与线索都会保留。';n.rewardClaimed=true;return {run:n,progress:p};}
export function showEnding(run){free(run);check(run.milestones.includes('source'),'请先完成归泉试炼');const n=returnToMap(run);n.phase='ending';n.endingSeen=true;return n;}
export function chapterNextStep(run) {
 const step=(text,action,label,id='')=>({text,action,label,id});
 if(!run.starter)return step('选择一位初始伙伴',null,'');
 if(run.milestones.includes('source'))return run.endingSeen
   ? step('泉声已归来：补全六兽手记，或重温试炼','bestiary','查看六兽手记')
   : step('泉声已归来，听听青岚谷的尾声','ending','听见归来的水声');
 if(run.owned.length<3){const node=NODES.find(n=>n.species.some(id=>!run.owned.includes(id)));return step(`已结契 ${run.owned.length}/3，走访林溪结识伙伴`,'visit',`前往${node.name}`,node.id);}
 if(run.team.length<3)return step(`当前同行 ${run.team.length}/3，请从后备补齐队伍`,'party','调整同行队伍');
 if(!run.milestones.includes('ridge'))return step('组成三兽队伍，挑战鸣石隘','visit','前往鸣石隘','ridge');
 if(!run.items.includes('spring-tone'))return step('到旧泉祠共鸣，让伙伴成长并确认进化','visit','前往旧泉祠','shrine');
 if(run.owned.some(id=>STARTERS.includes(id)&&!run.evolved.includes(id)))return step('旧泉祠还有伙伴未进化：建议共鸣后逐一查看；也可从舆图继续试炼','visit','查看祠前进化','shrine');
 if(!run.milestones.includes('marsh'))return step('穿过迷苇泽，查明回流的去向','visit','前往迷苇泽','marsh');
 if(!run.clues.includes('water-trace'))return step('回声溪的枯叶下还藏着水痕','visit','前往回声溪','creek');
 return step('挑战归泉守望，与守源者一起开闸','visit','前往归泉眼','source');
}
export const chapterObjective=run=>chapterNextStep(run).text;
export function validateChapter(run,progress={}){
 validateProgress(progress);check(run&&typeof run==='object'&&run.chapter===1,'章节记录无效');check(['choose','map','node','party','battle','end','ending'].includes(run.phase),'章节阶段无效');
 const unique=(value,allowed)=>Array.isArray(value)&&new Set(value).size===value.length&&value.every(x=>allowed.includes(x));
 for(const field of ['team','owned','discovered'])check(unique(run[field],ids),`${field} 异兽记录无效`);
 check(run.team.length<=3&&run.team.every(id=>run.owned.includes(id))&&run.owned.every(id=>run.discovered.includes(id)),'队伍或图鉴记录不一致');
 check(unique(run.evolved,STARTERS)&&run.evolved.every(id=>run.owned.includes(id)&&(progress[id]??0)>=90),'进化记录或经验无效');
 const nodeIds=NODES.map(n=>n.id);for(const field of ['visited','completed'])check(unique(run[field],nodeIds),'地点记录无效');
 check(unique(run.milestones,Object.keys(ENCOUNTERS)),'试炼里程碑无效');
 const itemIds=['valley-map','spring-tone','leaf-bookmark',...Object.values(ENCOUNTERS).map(e=>e.item)];
 check(unique(run.items,itemIds)&&unique(run.clues,['old-waterway','root-channel','water-trace','stone-rhythm','reverse-tide','spring-gate','valley-picture']),'线索或物品记录无效');
 check(unique(run.interactions,NODES.flatMap(n=>n.actions.map(a=>`${n.id}:${a.id}`))),'互动记录无效');
 check(run.bonds&&typeof run.bonds==='object'&&!Array.isArray(run.bonds)&&Object.entries(run.bonds).every(([id,b])=>ids.includes(id)&&Number.isInteger(b)&&b>=0&&b<=2),'结契记录无效');
 check(run.node===null||nodeIds.includes(run.node),'当前地点无效');check(run.encounter===null||ids.includes(run.encounter),'当前踪迹无效');check(Number.isInteger(run.bond)&&run.bond>=0&&run.bond<=2,'信任记录无效');
 check(typeof run.note==='string'&&run.note.length<=2000&&typeof run.rewardClaimed==='boolean'&&typeof run.endingSeen==='boolean'&&Array.isArray(run.gains),'章节显示记录无效');
 if(run.phase==='choose')check(run.starter===null&&run.owned.length===0&&run.team.length===0,'初始阶段记录无效');else check(STARTERS.includes(run.starter)&&run.owned.includes(run.starter)&&run.team.length>=1,'初始伙伴或队伍记录无效');
 check(run.battleId===null||Object.hasOwn(ENCOUNTERS,run.battleId),'试炼标记无效');
 if(['battle','end'].includes(run.phase)){check(run.battle&&run.battleId&&run.node===run.battleId,'战斗记录缺失');validateBattle(run.battle);check(run.battle.player.team.map(a=>a.id).join()===run.team.join()&&run.battle.enemy.team.map(a=>a.id).join()===ENCOUNTERS[run.battleId].team.join(),'战斗队伍记录不一致');check(run.phase==='end'?Boolean(run.battle.winner):!run.battle.winner,'战斗阶段不一致');}else check(run.battle===null&&run.battleId===null,'非战斗阶段不能保留战斗');
 if(run.phase==='node')check(run.node!==null,'地点记录缺失');
 if(run.encounter)check(run.phase==='node'&&NODES.find(n=>n.id===run.node)?.species.includes(run.encounter)&&!run.owned.includes(run.encounter)&&run.bond===(run.bonds[run.encounter]??0)&&run.bond<2,'结契进行记录不一致');
 if(run.endingSeen||run.phase==='ending')check(run.milestones.includes('source'),'结局记录无效');
 if(run.milestones.includes('marsh'))check(run.milestones.includes('ridge'),'试炼顺序无效');
 if(run.milestones.includes('source'))check(run.milestones.includes('marsh')&&run.completed.includes('shrine')&&run.items.includes('spring-tone')&&run.clues.includes('water-trace'),'归泉试炼前置记录缺失');
 for(const encounter of Object.values(ENCOUNTERS))if(run.items.includes(encounter.item)||run.completed.includes(encounter.id))check(run.milestones.includes(encounter.id),'试炼奖励缺少里程碑');
 if(run.evolved.length)check(run.completed.includes('shrine')&&run.items.includes('spring-tone'),'进化缺少泉祠共鸣');
 if(run.node!==null)check(run.visited.includes(run.node)&&nodeStatus(run,run.node).unlocked,'当前地点不可访问');
 for(const id of run.completed)check(run.visited.includes(id),'已完成地点未曾访问');
 for(const key of run.interactions)check(run.visited.includes(key.split(':')[0]),'互动缺少地点记录');
 if(run.items.includes('spring-tone'))check(run.interactions.includes('shrine:attune')&&run.completed.includes('shrine')&&run.milestones.includes('ridge'),'泉祠共鸣记录不一致');
 if(run.clues.includes('water-trace'))check(run.interactions.includes('creek:clear'),'水痕线索缺少互动记录');
 if(run.phase==='choose')check(run.visited.length===0&&run.completed.length===0&&run.interactions.length===0&&run.items.length===0&&run.clues.length===0&&run.milestones.length===0&&run.node===null&&run.discovered.length===0,'初始阶段不能保留章节进度');
 for(const id of run.milestones)check(run.items.includes(ENCOUNTERS[id].item)&&run.completed.includes(id),'试炼奖励记录不一致');
 return true;
}
