const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
async function check(result,expected,networkFailure=false){
 const html=fs.readFileSync('daegu-apply.html','utf8');let leads=0,completed=0,requests=0;const nodes={};
 const ctx={terms:[true,true,true],document:{getElementById:id=>nodes[id]||(nodes[id]={disabled:false,style:{},classList:{add(){},remove(){}}})},fd:{phone:'01012345678',name:'TEST',gender:'여성',byear:'1998',bmonth:'5',bday:'3',date:'2026-09-11',eventId:'test-only'},DAEGU_CONFIG:{DAEGU_GAS_URL:'https://example.invalid'},getEffectivePrice:()=>35000,getEffectivePriceDisplay:()=> '35000',getCookie:()=>null,navigator:{userAgent:'mock'},URLSearchParams,setInterval:()=>1,clearInterval(){},setTimeout:cb=>{cb();return 1},fetch:async url=>{if(url.includes('ipify'))return {json:async()=>({})};requests++;if(networkFailure)throw Error('network');return {ok:true,json:async()=>result};},fbq:()=>leads++,goStep:()=>completed++,alert(){}};
 vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('async function submitForm()'),html.indexOf('\nfunction getCookie',html.indexOf('async function submitForm()'))),ctx);
 await ctx.submitForm();assert.equal(leads,expected);assert.equal(completed,expected);if(expected){await ctx.submitForm();assert.equal(requests,1);}
}
(async()=>{
 await check({result:'success'},0);await check({result:'duplicate'},0);await check({result:'error'},0);await check({},0,true);
 const ctx={Logger:{log(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('daegu-gas.txt','utf8'),ctx);let purchases=0,marks=0;ctx.sendSms=()=>{throw Error('SMS network failure')};ctx.sendMetaCAPIPurchase=()=>purchases++;
 const row=Array(15).fill('');row[1]='2026-09-11';row[2]='TEST';row[6]='01012345678';row[8]=35000;
 ctx.sendApprovalSMS({getRange:()=>({getValues:()=>[row],setValue:()=>marks++})},2);assert.equal(purchases,1);assert.equal(marks,0);
 const sheet={getRange:()=>({getValues:()=>[row],setValue:()=>marks++})};
 ctx.sendSms=()=>false;ctx.sendApprovalSMS(sheet,2);assert.equal(purchases,2);assert.equal(marks,0);
 ctx.sendSms=()=>true;ctx.sendApprovalSMS(sheet,2);assert.equal(purchases,3);assert.equal(marks,1);
 const smsCtx={Logger:{log(){}},Utilities:{getUuid:()=> 'test'},UrlFetchApp:{}};vm.createContext(smsCtx);vm.runInContext(fs.readFileSync('daegu-gas.txt','utf8'),smsCtx);smsCtx.buildHmac=()=> 'mock';
 for(const [http,body,expected] of [[200,{messageId:'test'},true],[200,{messageId:'test',statusCode:'3040'},false],[400,{errorCode:'InsufficientBalance'},false],[200,{errorCode:'failure'},false],[200,{},false],[500,{messageId:'test'},false]]){smsCtx.UrlFetchApp.fetch=()=>({getResponseCode:()=>http,getContentText:()=>JSON.stringify(body)});assert.equal(smsCtx.sendSms('01012345678','mock'),expected);}
 const timeLine=fs.readFileSync('daegu-apply.html','utf8').split('\n').find(x=>x.includes('fd.timeStr ='));
 for(const [date,expected] of [['2026-09-24','20:00–23:30'],['2026-09-25','20:00–23:30'],['2026-09-26','19:00–23:30']]){const c={fd:{},dateKey:date,d:new Date(date+'T12:00:00'),DAEGU_CONFIG:{CHUSEOK_DATE:'2026-09-24'}};vm.runInNewContext(timeLine,c);assert.equal(c.fd.timeStr,expected);}
 console.log('PASS: no-cors application dispatch; server-only Lead path; Purchase isolation; SMS acceptance/failure status handling; Chuseok/Friday/Saturday time display. No external requests.');
})().catch(e=>{console.error(e);process.exitCode=1});
