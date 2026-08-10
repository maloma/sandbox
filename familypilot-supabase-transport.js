(()=>{
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  if(root.FamilyPilotSupabaseTransport)return;

  const SHA256_HEX=/^[a-f0-9]{64}$/;
  const error=code=>Object.freeze({ok:false,error:code});
  const usableText=value=>typeof value==='string'&&value.trim().length>0;
  const validSafeInteger=value=>Number.isSafeInteger(value)&&value>=0;
  const validRowInteger=value=>Number.isInteger(value)&&value>=1;
  const isPublishableKey=value=>typeof value==='string'&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(value.trim());
  const responseOk=response=>Boolean(response)&&((typeof response.ok==='boolean'&&response.ok)||(typeof response.status==='number'&&response.status>=200&&response.status<300));
  const freezeRow=row=>Object.freeze({
    householdId:row.household_id,
    revision:row.revision,
    stateSchemaVersion:row.state_schema_version,
    payload:row.payload,
    payloadSha256:row.payload_sha256,
    updatedAt:row.updated_at,
    updatedBy:row.updated_by,
  });
  function mapRow(row){
    if(!row||typeof row!=='object'||Array.isArray(row)
      ||!usableText(row.household_id)||!validRowInteger(row.revision)
      ||!validRowInteger(row.state_schema_version)||typeof row.payload!=='string'
      ||!SHA256_HEX.test(row.payload_sha256||'')||!validSafeInteger(row.updated_at)
      ||!usableText(row.updated_by))return null;
    return freezeRow(row);
  }
  function createConfiguration(options){
    const projectUrl=options?.projectUrl,publishableKey=options?.publishableKey;
    if(!usableText(projectUrl)||!isPublishableKey(publishableKey)
      ||typeof options?.getAccessToken!=='function')throw new TypeError('invalid_transport_configuration');
    let url;
    try{url=new URL(projectUrl)}catch{throw new TypeError('invalid_transport_configuration')}
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'
      ||!url.hostname.endsWith('.supabase.co')||url.hostname==='supabase.co')throw new TypeError('invalid_transport_configuration');
    const fetchImpl=options.fetchImpl===undefined?root.fetch:options.fetchImpl;
    if(typeof fetchImpl!=='function')throw new TypeError('invalid_transport_configuration');
    return Object.freeze({baseUrl:url.href.replace(/\/$/,''),publishableKey:publishableKey.trim(),getAccessToken:options.getAccessToken,fetchImpl});
  }
  async function accessToken(configuration){
    let token;
    try{token=await configuration.getAccessToken()}catch{return null}
    return usableText(token)?token.trim():null;
  }
  async function providerRequest(configuration,url,init){
    const token=await accessToken(configuration);
    if(!token)return{token:null};
    const headers=Object.assign({'apikey':configuration.publishableKey,'Authorization':`Bearer ${token}`,'Accept':'application/json'},init.headers||{});
    try{return{token,response:await configuration.fetchImpl(url,Object.assign({},init,{headers}))}}catch{return{token,response:null}}
  }
  function createTransport(options={}){
    const configuration=createConfiguration(options);
    async function read(householdId){
      if(!usableText(householdId))return error('remote_read_failed');
      const query=new URLSearchParams({household_id:`eq.${householdId.trim()}`,select:'household_id,revision,state_schema_version,payload,payload_sha256,updated_at,updated_by'});
      const result=await providerRequest(configuration,`${configuration.baseUrl}/rest/v1/familypilot_remote_state?${query.toString()}`,{method:'GET'});
      if(!result.token)return error('auth_session_unavailable');
      if(!result.response)return error('remote_read_failed');
      if(result.response.status===401||result.response.status===403)return error('remote_authorization_failed');
      if(!responseOk(result.response))return error('remote_read_failed');
      let body;
      try{body=await result.response.json()}catch{return error('remote_read_failed')}
      if(!Array.isArray(body)||body.length>1)return error('remote_read_failed');
      if(body.length===0)return Object.freeze({ok:true,row:null});
      const row=mapRow(body[0]);
      return row?Object.freeze({ok:true,row}):error('remote_read_failed');
    }
    async function compareAndSwap(input){
      if(!input||typeof input!=='object')return error('remote_compare_and_swap_failed');
      const body={
        p_household_id:input.householdId,
        p_expected_revision:input.expectedRevision,
        p_revision:input.revision,
        p_state_schema_version:input.stateSchemaVersion,
        p_payload:input.payload,
        p_payload_sha256:input.payloadSha256,
        p_updated_at:input.updatedAt,
        p_updated_by:input.updatedBy,
      };
      const result=await providerRequest(configuration,`${configuration.baseUrl}/rest/v1/rpc/familypilot_compare_and_swap_state`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!result.token)return error('auth_session_unavailable');
      if(!result.response)return error('remote_compare_and_swap_failed');
      if(result.response.status===401||result.response.status===403)return error('remote_authorization_failed');
      if(!responseOk(result.response))return error('remote_compare_and_swap_failed');
      let providerResult;
      try{providerResult=await result.response.json()}catch{return error('remote_compare_and_swap_failed')}
      if(!providerResult||typeof providerResult!=='object'||Array.isArray(providerResult))return error('remote_compare_and_swap_failed');
      if(providerResult.ok===false&&providerResult.error==='revision_conflict'
        &&(providerResult.currentRevision===null||validSafeInteger(providerResult.currentRevision)))return Object.freeze({ok:false,error:'revision_conflict',currentRevision:providerResult.currentRevision});
      const row=providerResult.ok===true?mapRow(providerResult.row):null;
      return row?Object.freeze({ok:true,row}):error('remote_compare_and_swap_failed');
    }
    return Object.freeze({read,compareAndSwap});
  }
  root.FamilyPilotSupabaseTransport=Object.freeze({createTransport});
})(typeof window!=='undefined'?window:globalThis);
