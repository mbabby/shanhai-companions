import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterView} from '../src/chapter-view.js';
import {freshChapter,chooseStarter,visitNode,interactNode,openParty,setTeam} from '../src/chapter.js';
test('habitat map distinguishes clues from remaining contracts',()=>{
 let run=visitNode(chooseStarter(freshChapter(),'fox'),'forest');({run}=interactNode(run,'roots'));run.phase='map';
 const html=chapterView(run,{});assert.match(html,/线索已记录 · 结契 1\/4/);
});
test('party follows actual battle order and offers return to location',()=>{
 let run=visitNode(chooseStarter(freshChapter(),'fox'),'ridge');run.owned=['fox','deer','turtle'];run=openParty(setTeam(run,['deer','fox','turtle']));
 const html=chapterView(run,{});assert.ok(html.indexOf('<h3>阿蜀')<html.indexOf('<h3>小绒'));assert.match(html,/返回鸣石隘/);assert.match(html,/当前同行 3\/3/);
});
