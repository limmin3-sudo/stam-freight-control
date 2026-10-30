import test from 'node:test';
import assert from 'node:assert/strict';
import {destinationGroups,saveDestinationRecipe,fillDestinationRecipes} from '../recipes.mjs';

const mission=(id,pick,drop,scu=[32,32,20])=>({id,company:'레드 윈드 노선화물',title:'대형 신입 화물 계약자 필요 [100-4,000 평판]',cargo:[
 {commodity:'함선 탄약',scu:scu[0],pickupId:pick,dropoffId:drop},{commodity:'수소',scu:scu[1],pickupId:pick,dropoffId:drop},{commodity:'의약용품',scu:scu[2],pickupId:pick,dropoffId:drop}]});
const boxes=[{size:16,count:4},{size:2,count:10}];

test('box layout entered once fills later missions of the same type, wherever they go',()=>{
 const first=mission('a','orison','sunset'),recipes=saveDestinationRecipe({},first,destinationGroups(first)[0],boxes,'v1');
 const later=fillDestinationRecipes(recipes,mission('b','lorville','bueno'),'v1');
 assert.deepEqual(later.destinationBoxes,[{pickupId:'lorville',dropoffId:'bueno',boxes,origin:'template'}]);
 // Both destinations of a two-drop contract get the same layout.
 const two={...mission('c','orison','sunset'),cargo:[...mission('c','orison','sunset').cargo,...mission('c','orison','bueno').cargo]};
 assert.equal(fillDestinationRecipes(recipes,two,'v1').destinationBoxes.length,2);
});

test('only the commodity mix matters: another company or title with the same cargo is the same type',()=>{
 const first=mission('a','orison','sunset'),recipes=saveDestinationRecipe({},first,destinationGroups(first)[0],boxes,'v1');
 const other={...mission('b','grimhex','ashland'),company:'데드 세인츠',title:''};
 assert.deepEqual(fillDestinationRecipes(recipes,other,'v1').destinationBoxes[0].boxes,boxes);
});

test('layouts saved under the old version/company/title key are still reused',()=>{
 const old={[JSON.stringify(['destination','4.10',"레드윈드노선화물",'x',[['수소',32,null],['의약용품',20,null],['함선탄약',32,null]]])]:{boxes,savedAt:1}};
 assert.deepEqual(fillDestinationRecipes(old,mission('b','orison','sunset'),'4.11').destinationBoxes[0].boxes,boxes);
});

test('different quantities are a different type and are not filled',()=>{
 const first=mission('a','orison','sunset'),recipes=saveDestinationRecipe({},first,destinationGroups(first)[0],boxes,'v1');
 assert.deepEqual(fillDestinationRecipes(recipes,mission('b','orison','sunset',[24,32,20]),'v1').destinationBoxes,[]);
});

test('after a game version change the newest saved layout is still used',()=>{
 const first=mission('a','orison','sunset'),g=destinationGroups(first)[0];
 let recipes=saveDestinationRecipe({},first,g,[{size:4,count:21}],'old');
 recipes=saveDestinationRecipe(recipes,first,g,boxes,'newer');
 const filled=fillDestinationRecipes(recipes,mission('b','orison','sunset'),'4.11');
 assert.deepEqual(filled.destinationBoxes[0].boxes,boxes);
});
