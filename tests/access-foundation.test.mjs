import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../data/questions.mjs";
import { emptyProgress, STORAGE_KEY } from "../engine.mjs";
import { resolveMembership, authorizePrivateLab } from "../server/entitlements.mjs";
import { ProgressImportError, normalizeProgress, mergeProgress } from "../server/progress-sync.mjs";
import { createAccessApi } from "../server/access-api.mjs";

const now = new Date("2026-10-23T18:00:00.000Z");
const issuer = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example";
const clientId = "cloudops-client-123";
const ids = new Set(QUESTIONS.map(q => q.id));
const proLab = "pro-iam-stateful-01";
const paid = (subject="alice") => ({
  provider: "stripe", source:"verified_stripe_webhook", status:"active", subject,
  currentPeriodEnd:"2026-11-23T00:00:00.000Z",
  providerVerifiedAt:"2026-10-23T16:00:00.000Z",
  cancelAtPeriodEnd:false
});
const sample = QUESTIONS.find(q=>q.track==="practitioner");
const another = QUESTIONS.find(q=>q.track==="security");
const attempt = (question=sample, finishedAt="2026-10-23T16:00:00.000Z")=>({
  track:question.track, mode:"practice", correct:1,total:1,percent:100,finishedAt,
  byDomain:{[question.domain]:{correct:1,total:1}}
});
const progress = (extra={})=>({
  version:1,attempts:[attempt()],bookmarks:[sample.id],missed:[another.id],...extra
});
const apiEvent = (method,path,subject=null,body=null,extra={})=>({
  rawPath:path, headers:{"content-type":"application/json"}, isBase64Encoded:false,
  requestContext:{http:{method},...(subject ? {authorizer:{jwt:{claims:{
    sub:subject,iss:issuer,client_id:clientId,token_use:"access",username:"user-"+subject
  }}}}:{})},
  ...(body!==null?{body:JSON.stringify(body)}:{}),...extra
});
const body = response => JSON.parse(response.body);
function harness({subscriptions={},beforeMerge=null}={}) {
  const data = new Map();
  const calls = {get:[],merge:[],subscriptions:[]};
  const api = createAccessApi({issuer,clientId,allowedQuestionIds:ids,
    privateLabIds:[proLab],now:()=>now,
    async getProgress(sub){calls.get.push(sub);return data.get(sub)??null;},
    async mergeProgressAtomic(sub,guest){calls.merge.push(sub);
      if(beforeMerge)await beforeMerge();
      const result=mergeProgress(data.get(sub)??emptyProgress(),guest,ids,{now});
      data.set(sub,result);return result;
    },
    async getSubscription(sub){calls.subscriptions.push(sub);return subscriptions[sub]??null;}
  });
  return {api,data,calls};
}

test("progress source schema stays compatible with existing local browser storage",()=>{
  assert.equal(STORAGE_KEY,"aws-cert-lab-progress-v1");
  assert.deepEqual(Object.keys(emptyProgress()).sort(),["attempts","bookmarks","missed","version"]);
  const result=normalizeProgress(progress(),ids);
  assert.deepEqual(result.bookmarks,[sample.id]);
  assert.deepEqual(result.missed,[another.id]);
  assert.equal(result.attempts[0].percent,100);
  assert.deepEqual(Object.keys(result),["version","attempts","missed","bookmarks"]);
});
test("normalization rejects malformed or oversized work instead of quietly resetting user progress",()=>{
  for(const bad of [null,{},[],{...progress(),version:2},
    {...progress(),attempts:Array(31).fill(attempt())},
    {...progress(),bookmarks:Array(601).fill(sample.id)}]){
    assert.throws(()=>normalizeProgress(bad,ids),ProgressImportError);
  }
});
test("progress normalizer excludes forged question IDs and invalid attempts",()=>{
  const forged=progress({bookmarks:["admin","__proto__",sample.id,sample.id],missed:[another.id,"none"],
    attempts:[attempt(), {...attempt(),percent:999},
      {...attempt(),track:"not-a-track"}, {...attempt(),byDomain:{"__proto__":{correct:1,total:1}}}]});
  const normalized=normalizeProgress(forged,ids);
  assert.deepEqual(normalized.bookmarks,[sample.id]);
  assert.deepEqual(normalized.missed,[another.id]);
  assert.equal(normalized.attempts.length,1);
});
test("re-import merges attempts and bookmarks idempotently and respects the 30-attempt cap",()=>{
  const guest=progress();
  const first=mergeProgress(emptyProgress(),guest,ids,{now});
  assert.deepEqual(mergeProgress(first,guest,ids,{now}),first);
  const later=progress({attempts:[attempt(another,"2026-10-23T17:00:00.000Z")],
    bookmarks:[another.id],missed:[sample.id]});
  const both=mergeProgress(first,later,ids,{now});
  assert.equal(both.attempts.length,2);
  assert.deepEqual(both.bookmarks,[another.id,sample.id].sort());
  assert.equal(mergeProgress(both,later,ids,{now}).attempts.length,2);
  const multiple=Array.from({length:30},(_,i)=>attempt(sample,
    new Date(Date.UTC(2026,8,1+i,18,0,0)).toISOString()));
  const capped=mergeProgress(progress({attempts:multiple}),progress(),ids,{now});
  assert.equal(capped.attempts.length,30);
});
test("legacy timed attempts survive normalization, import, and account API round trips",async()=>{
  const legacy=progress({attempts:[{...attempt(),mode:"timed"}]});
  assert.equal(normalizeProgress(legacy,ids).attempts[0].mode,"timed");
  const merged=mergeProgress(emptyProgress(),legacy,ids,{now});
  assert.equal(merged.attempts[0].mode,"timed");
  const {api}=harness();
  const result=await api(apiEvent("POST","/api/v1/progress/import","alice",{importConsent:true,progress:legacy}));
  assert.equal(result.statusCode,200);
  const fetched=await api(apiEvent("GET","/api/v1/progress","alice"));
  assert.equal(fetched.statusCode,200);
  assert.equal(body(fetched).progress.attempts[0].mode,"timed");
});
test("future-dated browser imports cannot evict an account's saved history",()=>{
  const saved=progress({attempts:[attempt(sample,"2026-10-20T18:00:00.000Z")]});
  const fakeFuture=Array.from({length:30},(_,i)=>attempt(sample,
    new Date(Date.UTC(2099,0,1+i,12,0,0)).toISOString()));
  const hostile=progress({attempts:fakeFuture});
  const snapshot=JSON.stringify(saved);
  assert.throws(()=>mergeProgress(saved,hostile,ids,{now}),
    e=>e instanceof ProgressImportError && e.code==="future_attempt_timestamp");
  assert.equal(JSON.stringify(saved),snapshot, "failed import must not mutate account history");
  const nearFuture=progress({attempts:[attempt(sample,"2026-10-23T18:04:00.000Z")]});
  assert.equal(mergeProgress(saved,nearFuture,ids,{now}).attempts.length,2);
});
test("an unauthenticated visitor remains a guest and cannot read account progress",async()=>{
  const {api,calls}=harness();
  assert.deepEqual(body(await api(apiEvent("GET","/api/v1/me"))),{authenticated:false,tier:"guest"});
  const request=apiEvent("GET","/api/v1/progress",null,null,{
    headers:{authorization:"Bearer forged-jwt-with-pro-flag"}
  });
  const result=await api(request);
  assert.equal(result.statusCode,401);
  assert.equal(body(result).error,"auth_required");
  assert.deepEqual(calls.get,[]);
});
test("member identity requires Gateway context, matching issuer, access token and client ID",async()=>{
  const {api}=harness();
  for(const key of ["iss","token_use","client_id","sub"]){
    const input=apiEvent("GET","/api/v1/progress","alice");
    input.requestContext.authorizer.jwt.claims[key]=key==="sub"?"../bob":"WRONG";
    assert.equal((await api(input)).statusCode,401,key);
  }
  assert.equal((await api(apiEvent("GET","/api/v1/progress","alice"))).statusCode,200);
});
test("Cognito machine-to-machine access tokens cannot be mistaken for real learner accounts",async()=>{
  const {api,calls}=harness({subscriptions:{alice:paid()}});
  const token=apiEvent("GET","/api/v1/me","alice");
  delete token.requestContext.authorizer.jwt.claims.username;
  assert.deepEqual(body(await api(token)),{authenticated:false,tier:"guest"});
  assert.deepEqual(calls.subscriptions,[]);
  const paidReq=apiEvent("GET","/api/v1/labs/"+proLab+"/access","alice");
  delete paidReq.requestContext.authorizer.jwt.claims.username;
  assert.equal((await api(paidReq)).statusCode,401);
});
test("no subscription, unverified source or different account cannot elevate Free to Pro",()=>{
  assert.equal(resolveMembership({}).tier,"guest");
  assert.equal(resolveMembership({verifiedSubject:"alice",now}).tier,"free");
  for(const subscription of [
    {...paid(),subject:"bob"},
    {...paid(),provider:"unknown"},
    {...paid(),source:"browser_local_storage"},
    {...paid(),status:"past_due"},
    {...paid(),currentPeriodEnd:"2026-10-21T00:00:00.000Z"},
    {...paid(),providerVerifiedAt:"2026-09-01T00:00:00.000Z"},
    {...paid(),providerVerifiedAt:"2026-11-29T00:00:00.000Z"},
    {...paid(),currentPeriodEnd:"invalid"}
  ])assert.equal(resolveMembership({verifiedSubject:"alice",subscription,now}).tier,"free");
});
test("verified active Pro can retain access until paid-through after scheduled cancellation",()=>{
  const membership=resolveMembership({verifiedSubject:"alice",subscription:{
    ...paid(),cancelAtPeriodEnd:true
  },now});
  assert.equal(membership.tier,"pro");
  assert.equal(membership.paidThrough,"2026-11-23T00:00:00.000Z");
  assert.equal(resolveMembership({verifiedSubject:"alice",subscription:{
    ...paid(),status:"canceled"
  },now}).tier,"free");
});
test("private lab authorization fails closed for guests, Free, unknown lab, expired and mismatched entitlements",()=>{
  const args={labId:proLab,privateLabIds:[proLab],now};
  assert.deepEqual(authorizePrivateLab(args),{allowed:false,status:401,reason:"auth_required"});
  assert.equal(authorizePrivateLab({...args,verifiedSubject:"alice"}).status,403);
  assert.equal(authorizePrivateLab({...args,verifiedSubject:"alice",subscription:paid("bob")}).status,403);
  assert.equal(authorizePrivateLab({...args,verifiedSubject:"alice",subscription:paid("alice"),
    labId:"future-secret-lab"}).status,404);
  assert.deepEqual(authorizePrivateLab({...args,verifiedSubject:"alice",subscription:paid()}),
    {allowed:true,status:200,reason:"entitled"});
});
test("GET /me only displays gateway-authenticated identity and provider-resolved tier",async()=>{
  const {api,calls}=harness({subscriptions:{alice:paid()}});
  const out=body(await api(apiEvent("GET","/api/v1/me","alice")));
  assert.equal(out.tier,"pro");
  assert.equal(out.authenticated,true);
  assert.equal("stripeCustomerId" in out,false);
  assert.deepEqual(calls.subscriptions,["alice"]);
});
test("guest progress import explicitly requires account sign-in and opt-in",async()=>{
  const {api,calls}=harness();
  const path="/api/v1/progress/import";
  assert.equal((await api(apiEvent("POST",path,null,{importConsent:true,progress:progress()}))).statusCode,401);
  assert.equal(body(await api(apiEvent("POST",path,"alice",{progress:progress()}))).error,"consent_required");
  assert.deepEqual(calls.merge,[]);
});
test("import ignores no client-controlled identity; forged tier or userId is denied",async()=>{
  const {api,calls}=harness();
  for(const data of [
    {importConsent:true,progress:progress(),tier:"pro"},
    {importConsent:true,progress:progress(),userId:"bob"},
    {importConsent:true,progress:progress(),subject:"bob"},
    {importConsent:true,progress:progress(),subscription:paid()}
  ]){
    const out=await api(apiEvent("POST","/api/v1/progress/import","alice",data));
    assert.equal(out.statusCode,400);
  }
  assert.deepEqual(calls.merge,[]);
});
test("import enforces JSON body, 64KB bound and rejects missing/invalid payload",async()=>{
  const {api}=harness();
  const url="/api/v1/progress/import";
  const data={importConsent:true,progress:progress()};
  const cases=[
    apiEvent("POST",url,"alice",data,{headers:{"content-type":"text/plain"}}),
    apiEvent("POST",url,"alice",data,{isBase64Encoded:true}),
    apiEvent("POST",url,"alice",data,{body:"not json"}),
    apiEvent("POST",url,"alice",data,{body:" ".repeat(64*1024+1)}),
    apiEvent("POST",url,"alice",{...data,progress:{...progress(),version:0}})
  ];
  for(const input of cases)assert.equal((await api(input)).statusCode>=400,true);
});
test("import belongs only to verified Cognito subject and is idempotent",async()=>{
  const {api,calls}=harness();
  const payload={importConsent:true,progress:progress()};
  const url="/api/v1/progress/import";
  const a=body(await api(apiEvent("POST",url,"alice",payload)));
  assert.deepEqual(a.summary,{attempts:1,bookmarks:1,missed:1});
  const twice=body(await api(apiEvent("POST",url,"alice",payload)));
  assert.deepEqual(twice.summary,a.summary);
  const alice=body(await api(apiEvent("GET","/api/v1/progress","alice")));
  const bob=body(await api(apiEvent("GET","/api/v1/progress","bob")));
  assert.equal(alice.progress.attempts.length,1);
  assert.equal(bob.progress.attempts.length,0);
  assert.deepEqual(calls.merge,["alice","alice"]);
});
test("the API rejects a future-clock import and preserves the saved account",async()=>{
  const {api,data}=harness();
  const path="/api/v1/progress/import";
  await api(apiEvent("POST",path,"alice",{importConsent:true,progress:progress()}));
  const before=structuredClone(data.get("alice"));
  const bad=progress({attempts:[attempt(sample,"2099-01-01T00:00:00.000Z")]});
  const response=await api(apiEvent("POST",path,"alice",{importConsent:true,progress:bad}));
  assert.equal(response.statusCode,400);
  assert.equal(body(response).error,"future_attempt_timestamp");
  assert.equal(JSON.stringify(data.get("alice")),JSON.stringify(before),
    "rejected import must preserve the stored account data byte-for-byte");
});
test("premium status endpoint does not serve a scenario, its answers or a client unlock token",async()=>{
  const {api}=harness({subscriptions:{alice:paid()}});
  const url="/api/v1/labs/"+proLab+"/access";
  assert.equal((await api(apiEvent("GET",url))).statusCode,401);
  assert.equal((await api(apiEvent("GET",url,"bob"))).statusCode,403);
  const entitled=await api(apiEvent("GET",url,"alice"));
  assert.equal(entitled.statusCode,200);
  assert.deepEqual(body(entitled),{entitled:true,labId:proLab});
  assert.equal(entitled.headers["cache-control"],"no-store");
  assert.equal((await api(apiEvent("GET","/api/v1/labs/unknown-lab/access","alice"))).statusCode,404);
});
test("unexpected database failure returns limited 503 without exposing credentials",async()=>{
  const api=createAccessApi({issuer,clientId,allowedQuestionIds:ids,
    privateLabIds:[proLab],now:()=>now,
    async getProgress(){throw new Error("secrets: private-database-password");},
    async mergeProgressAtomic(){throw new Error("private error");},
    async getSubscription(){throw new Error("STRIPE_SECRET_KEY=123");}
  });
  const result=await api(apiEvent("GET","/api/v1/me","alice"));
  assert.equal(result.statusCode,503);
  assert.doesNotMatch(result.body,/secret|STRIPE|password/i);
  assert.equal((await api(apiEvent("GET","/api/v1/progress","alice"))).statusCode,503);
});
test("nonconfigured security boundary cannot be deployed accidentally",()=>{
  assert.throws(()=>createAccessApi(),/not_configured/);
  assert.throws(()=>createAccessApi({issuer:"http://insecure",clientId,
    allowedQuestionIds:ids,privateLabIds:[],getProgress:()=>{},getSubscription:()=>{},
    mergeProgressAtomic:()=>{}}),/not_configured/);
});
test("API has no wildcard cross-origin headers and prevents unknown URLs",async()=>{
  const {api}=harness();
  assert.equal((await api(apiEvent("GET","/other","alice"))).statusCode,404);
  assert.equal((await api(apiEvent("POST","/api/v1/me","alice"))).statusCode,405);
  assert.equal((await api(apiEvent("POST","/api/v1/labs/"+proLab+"/access","alice"))).statusCode,405);
  assert.equal("access-control-allow-origin" in (await api(apiEvent("GET","/api/v1/me","alice"))).headers,false);
});
