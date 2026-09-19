// The official privacy popup must also be enabled and declared in the WeChat console.
export function copyPublicLink(api,url){
 if(!/^https:\/\//.test(url))return Promise.resolve('invalid')
 if(typeof api?.requirePrivacyAuthorize!=='function'||typeof api?.setClipboardData!=='function')return Promise.resolve('unsupported')
 return new Promise(resolve=>{
  let authorizationHandled=false,settled=false
  const finish=status=>{if(!settled){settled=true;resolve(status)}}
  try{api.requirePrivacyAuthorize({success:()=>{
   if(authorizationHandled)return;authorizationHandled=true
   try{api.setClipboardData({data:url,success:()=>finish('copied'),fail:()=>finish('failed')})}catch{finish('failed')}
  },fail:()=>{if(authorizationHandled)return;authorizationHandled=true;finish('denied')}})}catch{finish('failed')}
 })
}
