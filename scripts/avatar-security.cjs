/* global __dirname */
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), ts = require(path.join(root, "node_modules/typescript"));
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
 compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
const sharp = require(path.join(root, "node_modules/sharp"));
fs.mkdirSync(path.join(root, ".local"), {recursive:true});
const fixture = fs.mkdtempSync(path.join(root, ".local/avatar-security-"));
process.chdir(fixture); fs.mkdirSync(".local"); fs.writeFileSync(".local/explore-services.json",'{"enabled":true}');
fs.cpSync(path.join(root,"server-assets"),"server-assets",{recursive:true});
process.env.NODE_ENV="development"; process.env.AVATAR_ENABLED="true"; process.env.OPENAI_API_KEY="test-only-avatar-secret-canary";
const mod = p => require(path.join(root,p));
const session=mod("src/app/api/local-explore/session+api.ts"), route=mod("src/app/api/local-explore/avatar/jobs+api.ts");
const status=mod("src/app/api/local-explore/avatar/status+api.ts"), ownerRoute=mod("src/app/api/local-explore/owner+api.ts");
const store=mod("src/server/local-explore/store.ts"), jobs=mod("src/server/avatar/jobs.ts"), ledger=mod("src/server/avatar/ledger.ts");
const images=mod("src/server/avatar/images.ts"), schema=mod("src/utils/avatar-schema.ts"), food=mod("src/state/food-schema.ts");
const report={checks:[],paidNetworkCalls:0,liveProviderTested:false}; let calls=[], mode="success", release, output, photo, token, owner;
const body=id=>({photo,requestId:id,consent:mod("src/types/avatar.ts").avatarConsentVersion});
async function call(r,method,t,value,query="",extra={},host="http://localhost") {
 const response=await r[method](new Request(host+"/api/local-explore/avatar/jobs"+query,{method,
 headers:{"X-QuinTaste-Client":"explore","X-QuinTaste-Owner":"guest","X-QuinTaste-Native":"1",...(t?{Authorization:"Bearer "+t}:{}),"Content-Type":"application/json",...extra},
 ...(value===undefined?{}:{body:JSON.stringify(value)})}));
 return {status:response.status,body:await response.json(),headers:response.headers};
}
async function check(name,fn){await fn();report.checks.push(name);console.info("PASS "+name)}
async function settle(id) { for(let i=0;i<1000;i++){const j=jobs.getAvatarJob(owner,id);if(j.status!=="working")return j;await new Promise(r=>setTimeout(r,10))}throw Error("job did not settle");}
async function reset() { jobs.discardOwnerAvatars(owner);await store.withLocalStore(s=>{delete s.avatarLedger});calls=[];mode="success";release=undefined;global.qtAvatarCancelled.clear(); }
global.fetch=async(url,options)=>{
 assert.equal(url,"https://api.openai.com/v1/images/edits");assert.equal(options.redirect,"error");
 assert.equal(options.headers.Authorization,"Bearer test-only-avatar-secret-canary");
 const form=options.body;calls.push({model:form.get("model"),prompt:form.get("prompt"),n:form.get("n"),images:form.getAll("image[]").length});
 if(mode==="hold") await new Promise((resolve,reject)=>{release=resolve; options.signal.addEventListener("abort",()=>reject(Error("aborted")),{once:true})});
 if(options.signal.aborted)throw Error("aborted");
 if(mode==="fail")return new Response("sensitive-provider-error",{status:500});
 return Response.json({data:[{b64_json:output.toString("base64")}]});
};
(async()=>{try{
 output=fs.readFileSync(path.join(root,"assets/avatar/sample-base.webp"));
 const input=await sharp({create:{width:256,height:256,channels:3,background:"#aaa"}}).jpeg().withExif({IFD0:{Artist:"PRIVATE-METADATA"}}).toBuffer();
 photo="data:image/jpeg;base64,"+input.toString("base64");
 token=(await call(session,"POST")).body.token;owner=store.tokenHash(token);process.env.AVATAR_ALLOWED_OWNERS=owner;
 await check("Fail closed: no key, disabled, invalid model, production, CSRF, missing/wrong owner and non-TLS LAN",async()=>{
  assert.equal((await call(route,"POST",null,body("gated-request-0001"))).status,401);
  assert.equal((await call(route,"POST",token,body("gated-request-0001"),"",{Origin:"https://attacker.example"})).status,403);
  assert.equal((await call(route,"POST",token,body("gated-request-0001"),"",{"X-QuinTaste-Owner":"profile"})).status,401);
  assert.equal((await call(route,"POST",token,body("gated-request-0001"),"",{},"http://192.168.0.9")).status,403);
  for(const [key,value] of [["OPENAI_API_KEY",""],["AVATAR_ENABLED","false"],["AVATAR_IMAGE_MODEL","client-selected"],["NODE_ENV","production"],["AVATAR_ALLOWED_OWNERS",""]]){
   // eslint-disable-next-line expo/no-dynamic-env-var -- Node-only configuration matrix.
   const previous=process.env[key];process.env[key]=value;const r=await call(route,"POST",token,body("gated-request-0001"));assert.ok([403,503].includes(r.status));
   if(previous===undefined)delete process.env[key];else process.env[key]=previous;
  }
  assert.equal(calls.length,0);const s=await call(status,"GET",token);assert.equal(s.body.available,true);assert.equal(s.headers.get("cache-control"),"no-store");assert.equal(JSON.stringify(s.body).includes(process.env.OPENAI_API_KEY),false);
 });
 await check("Uploads reject SVG, URL, bad base64, broken images, oversized bodies, missing consent and pixel bombs; strip metadata",async()=>{
  for(const p of ["https://example.com/portrait.jpg","data:image/svg+xml;base64,PHN2Zz4=","data:image/png;base64,aGVsbG8="]){
   assert.equal((await call(route,"POST",token,{...body("upload-request-0001"),photo:p})).status,400);
  }
  assert.equal((await call(route,"POST",token,{...body("upload-request-0001"),consent:false})).status,400);
  assert.equal((await call(route,"POST",token,{...body("upload-request-0001"),photo:"x".repeat(5700001)})).status,413);
  const huge=await sharp({create:{width:6000,height:6000,channels:3,background:"white"}}).png().toBuffer();
  await assert.rejects(images.normalizeSelfie("data:image/png;base64,"+huge.toString("base64")),e=>e.status===400);
  const clean=await images.normalizeSelfie(photo);assert.equal((await sharp(clean).metadata()).exif,undefined);assert.equal(calls.length,0);
  await assert.rejects(images.avatarFrame(await sharp({create:{width:128,height:128,channels:3,background:"white"}}).png().toBuffer()),e=>e.status===502);
 });
 await check("Concurrent submissions reserve once, fixed four-frame recipe, owner-only recovery, no photo persistence",async()=>{
  const id="success-request-0001";
  const results=await Promise.all([call(route,"POST",token,body(id)),call(route,"POST",token,body(id))]);
  assert.equal(results[0].status,202);assert.equal(results[1].status,202);assert.equal(results[0].body.id,results[1].body.id);assert.equal((await call(route,"POST",token,body("parallel-request-0002"))).status,429);
  const done=await settle(id);assert.equal(done.status,"complete");assert.equal(calls.length,4);assert.deepEqual(calls.map(c=>c.images),[3,1,1,1]);assert.ok(calls.every(c=>c.n==="1"&&c.model==="gpt-image-2.5-sunburst"));
  assert.equal((await call(route,"GET",token,undefined,"?requestId="+id)).body.avatar.id,done.id);
  const other=(await call(session,"POST")).body.token;
  assert.equal((await call(route,"GET",other,undefined,"?requestId="+id)).status,404);
  await call(route,"DELETE",other,undefined,"?requestId="+id);assert.equal(jobs.getAvatarJob(owner,id).status,"complete");
  assert.equal(global.qtAvatarCancelled.has(store.tokenHash(other)+":"+id),false);
  assert.equal(schema.readAvatar(done.avatar).frames.base,done.avatar.frames.base);
  const record=fs.readFileSync(".local/explore-service/records.json","utf8");assert.equal(record.includes(input.toString("base64")),false);assert.equal(record.includes("data:image"),false);
  assert.equal(JSON.stringify(schema.avatarExport(done.avatar)).includes("base64"),false);
  const merged=food.mergeFoodDocuments(food.emptyFoodDocument(),{...food.emptyFoodDocument(),avatar:done.avatar});
  assert.equal(merged.avatar,null);
  await call(route,"DELETE",token,undefined,"?requestId="+id);
  assert.equal((await call(route,"POST",token,body(id))).status,409);assert.equal(calls.length,4);
 });
 await reset();
 await check("Provider errors are sanitized, never retried, and never publish partial frames",async()=>{
  mode="fail";await call(route,"POST",token,body("failure-request-0001"));const failed=await settle("failure-request-0001");
  assert.equal(failed.status,"failed");assert.equal(calls.length,1);assert.equal(failed.avatar,undefined);
  assert.equal(JSON.stringify(failed).includes("sensitive-provider"),false);
  const l=await store.withLocalStore(s=>s.avatarLedger,false);assert.equal(l.global,4);
 });
 await reset();
 await check("Cancellation before upload and during a provider call stops remaining frames",async()=>{
  await call(route,"DELETE",token,undefined,"?requestId=cancel-before-0001");
  assert.equal((await call(route,"POST",token,body("cancel-before-0001"))).status,409);assert.equal(calls.length,0);
  mode="hold";await call(route,"POST",token,body("cancel-active-0001"));while(!release)await new Promise(r=>setTimeout(r,5));
  for(let i=0;i<500;i++)global.qtAvatarCancelled.set("fixture-"+i,Date.now()+60000);
  assert.equal((await call(route,"DELETE",token,undefined,"?requestId=cancel-active-0001")).status,200);await new Promise(r=>setTimeout(r,30));assert.equal(calls.length,1);
  assert.throws(()=>jobs.getAvatarJob(owner,"cancel-active-0001"),e=>e.status===404);
 });
 await reset();
 await check("Durable per-owner and global daily ceilings, replay after process loss, corrupt ledger fail closed",async()=>{
  await Promise.all(Array.from({length:2},(_,i)=>ledger.reserveAvatar(owner,"budget-"+i,"job-"+i)));
  await assert.rejects(ledger.reserveAvatar(owner,"budget-3","job-3"),e=>e.status===429);
  for(let i=0;i<3;i++)await ledger.reserveAvatar("other-"+i,"one","job");
  await assert.rejects(ledger.reserveAvatar("last","one","job"),e=>e.status===429);
  assert.equal(await ledger.reserveAvatar(owner,"budget-0","new-job"),"job-0");
  await store.withLocalStore(s=>{s.avatarLedger.global="corrupt"});
  await assert.rejects(ledger.reserveAvatar("another","one","job"),e=>e.status===503);
 });
 await reset();
 await check("Deleting a collection revokes capability and cancels pending frames",async()=>{
  mode="hold";release=undefined;await call(route,"POST",token,body("revoke-request-0001"));while(!release)await new Promise(r=>setTimeout(r,5));
  assert.equal((await call(ownerRoute,"DELETE",token)).status,200);await new Promise(r=>setTimeout(r,30));
  assert.equal(calls.length,1);assert.equal((await call(status,"GET",token)).status,401);
 });
 report.passed=true;
} catch(error){report.failure=error.stack;process.exitCode=1;}
finally{fs.writeFileSync(path.join(root,".impeccable/review/avatar-security.json"),JSON.stringify(report,null,2));console.info(JSON.stringify(report));}})();
