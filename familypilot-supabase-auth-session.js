(()=>{'use strict';
const root=typeof window!=='undefined'?window:globalThis;
if(root.FamilyPilotSupabaseAuthSession)return;
const KEY='familypilot-supabase-auth-session-v1', UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=async r=>{if(!r||!r.ok)return null;try{return await r.json()}catch{return null}};
function createAuthSession(o={}){
  let url;try{url=new URL(o.projectUrl)}catch{throw new TypeError('invalid_auth_configuration')}
  if(url.protocol!=='https:'||url.hostname!=='ojweurengruhsvtmphct.supabase.co'||url.pathname!=='/'||url.search||url.hash||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(o.publishableKey||''))throw new TypeError('invalid_auth_configuration');
  const fetchImpl=o.fetchImpl||root.fetch, storage=o.sessionStorage||root.sessionStorage, now=o.now||(()=>Date.now());
  if(typeof fetchImpl!=='function'||!storage)throw new TypeError('invalid_auth_configuration');
  let session=null;try{const raw=storage.getItem(KEY);if(raw)session=JSON.parse(raw)}catch{session=null}
  const valid=s=>s&&typeof s.access_token==='string'&&typeof s.refresh_token==='string'&&UUID.test(s.user?.id||s.user_id||'');
  const save=s=>{session=s?Object.freeze({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:Number(s.expires_at)||0,user:{id:s.user?.id||s.user_id,email:s.user?.email||s.email||''}}):null;if(session)storage.setItem(KEY,JSON.stringify(session));else storage.removeItem(KEY)};
  const request=async(path,body,token)=>{const headers={'apikey':o.publishableKey,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;try{return await fetchImpl(url.origin+path,{method:'POST',headers,body:JSON.stringify(body)})}catch{return null}};
  async function signIn(email,password){const d=await json(await request('/auth/v1/token?grant_type=password',{email,password}));if(!d||!d.access_token||!d.refresh_token||!valid(d))return Object.freeze({ok:false,error:'auth_failed'});save(d);return Object.freeze({ok:true,userId:session.user.id})}
  async function signUp(email,password){const d=await json(await request('/auth/v1/signup',{email,password}));if(!d)return Object.freeze({ok:false,error:'auth_failed'});if(!d.access_token)return Object.freeze({ok:true,status:'email_confirmation_required'});if(!valid(d))return Object.freeze({ok:false,error:'auth_failed'});save(d);return Object.freeze({ok:true,userId:session.user.id})}
  async function refreshSession(){if(!session)return Object.freeze({ok:false,error:'no_session'});const old=session.refresh_token,d=await json(await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:old}));if(!d||!d.access_token||!d.refresh_token||!valid(d)){save(null);return Object.freeze({ok:false,error:'refresh_failed'})}save(d);return Object.freeze({ok:true,userId:session.user.id})}
  async function currentSession(){if(!session)return null;if(session.expires_at&&session.expires_at*1000<=now())return (await refreshSession()).ok?session:null;return session}
  return Object.freeze({signUp,signIn,refreshSession,currentSession,async getAccessToken(){const s=await currentSession();return s?.access_token||null},async getAuthUserId(){const s=await currentSession();return s?.user?.id||null},async signOut(){save(null);return Object.freeze({ok:true})},authStatus:async()=>{const s=await currentSession();return Object.freeze({signedIn:Boolean(s),userEmail:s?.user?.email||null})}})
}
root.FamilyPilotSupabaseAuthSession=Object.freeze({KEY,createAuthSession});
})();
