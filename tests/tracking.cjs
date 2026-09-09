const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const source=fs.readFileSync('daegu-gas.txt','utf8');new vm.Script(source);
for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){if(/src=|ld\+json/.test(m[1]))continue;new vm.Script(m[2],{filename:file});}}
let sent=[],status=200,body={events_received:1},props={},locked=false;
const context={console,Logger:{log(){}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,v)=>[...crypto.createHash('sha256').update(v).digest()]},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true;},releaseLock(){locked=false;}})},UrlFetchApp:{fetch:(url,opt)=>{sent.push(JSON.parse(opt.payload));return{getResponseCode:()=>status,getContentText:()=>JSON.stringify(body)};}}};vm.createContext(context);vm.runInContext(source,context);
for(const p of ['01012345678',1012345678,'010-1234-5678','+82 10 1234 5678','00821012345678'])assert.equal(context.koreanPhone(p),'01012345678');assert.equal(context.koreanPhone('123'),'');assert.equal(context.metaBirth('1998년 5월 3일'),'19980503');assert.equal(context.metaBirth('1998년 2월 30일'),'');
const applicant={name:'테스트',phone:'01012345678',date:'2026-09-11',price:35000,gender:'여성',eventId:'local-test-only',bdate:'1998년 5월 3일'};
context.sendMetaCAPI(applicant);assert.equal(sent[0].data[0].event_id,applicant.eventId);assert.equal(sent[0].data[0].event_name,'Lead');assert.equal(sent[0].data[0].user_data.ph,crypto.createHash('sha256').update('821012345678').digest('hex'));
context.sendMetaCAPIPurchase(applicant);const id=sent.at(-1).data[0].event_id;context.sendMetaCAPIPurchase({...applicant,phone:1012345678});assert.equal(sent.length,2);
status=500;body={error:{code:1}};context.sendMetaCAPIPurchase({...applicant,date:'2026-09-12'});status=200;body={events_received:1};context.sendMetaCAPIPurchase({...applicant,date:'2026-09-12'});assert.equal(sent.length,4);assert.notEqual(sent.at(-1).data[0].event_id,id);assert.equal(sent[2].data[0].event_id,sent[3].data[0].event_id);assert.equal(locked,false);
assert.throws(()=>context.readDaeguStaffRoster('wrong','2026-09-07'));assert.doesNotMatch(fs.readFileSync('daegu-apply.html','utf8'),/fbq\([^\n]*['"]Lead['"]/);
const originalRoster=context.updateRosterSheet;
let updates=0,rejections=0;
context.updateRosterSheet=()=>updates++;
context.sendRejectionSMS=()=>{rejections++;throw Error('mock SMS failure');};
context.console={error(){}};
for(const value of ['불합격','취소'])context.onEdit({value,range:{getSheet:()=>({getName:()=> '신청자'}),getColumn:()=>11,getRow:()=>2}});
assert.equal(updates,2);assert.equal(rejections,1);
context.updateRosterSheet=originalRoster;
for(const statusText of ['불합격✓발송','취소']){
  const rows=[Array(15).fill('')];const a=Array(15).fill('');a[1]='2026-09-11';a[2]='테스트';a[3]='남성';a[6]=1012345678;a[10]=statusText;rows.push(a);
  const grid=Array.from({length:38},()=>Array(5).fill(''));grid[0][4]='__DATE__:2026-09-11';grid[2]=['테스트','01012345678','','',''];grid[3]=['직접추가','01099998888','','',''];
  const roster={getName:()=> '시트1',getLastRow:()=>38,getRange:(r,c,n=1,w=1)=>({getValues:()=>grid.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+w)),setValues:values=>values.forEach((x,i)=>x.forEach((v,j)=>grid[r-1+i][c-1+j]=v)),setFormula(){}})};
  props.rosterColsInit='1';context.SpreadsheetApp={openById:()=>({getSheetByName:name=>name==='신청자'?{getDataRange:()=>({getValues:()=>rows})}:roster})};
  context.updateRosterSheet();assert.equal(grid[2][0],'직접추가');assert.equal(grid[3][0],'');
}
console.log('PASS: syntax, tracking, rejection/cancellation even on SMS failure, last approved applicant removal, phone normalization and manual attendee preservation. No external requests.');
