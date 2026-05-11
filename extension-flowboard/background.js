const WS_URL='wss://flowboard.autoveoup.com/api/flow/ws';const CALLBACK_URL='https://flowboard.autoveoup.com/api/flow/callback';const FLOW_ORIGIN='https://aisandbox-pa.googleapis.com';const LABS_ORIGIN='https://labs.google';
let ws=null,flowKey=null,callbackSecret='',manualDisconnect=false,reconnectAttempts=0;const MAX_RECONNECT_DELAY=30000;
const metrics={tokenCapturedAt:0,requestCount:0,successCount:0,failedCount:0,lastError:''};

function connect(){if(ws&&ws.readyState===WebSocket.OPEN)return;if(manualDisconnect)return;try{ws=new WebSocket(WS_URL)}catch(e){scheduleReconnect();return}
ws.onopen=()=>{reconnectAttempts=0;sendWS({type:'extension_ready'});if(flowKey)sendWS({type:'token_captured',flowKey});chrome.alarms.create('token-refresh',{periodInMinutes:45});updateSidePanel()}
ws.onmessage=(event)=>{try{const msg=JSON.parse(event.data);if(msg.callback_secret){callbackSecret=msg.callback_secret;return}if(msg.method==='api_request'){handleApiRequest(msg);return}if(msg.method==='get_status'){sendWS({type:'status',metrics,flowKey:!!flowKey});return}}catch(e){console.warn('[FlowBoard] WS msg error:',e.message)}}
ws.onclose=()=>{ws=null;chrome.alarms.clear('token-refresh');updateSidePanel();scheduleReconnect()};ws.onerror=()=>{ws?.close()}}

function sendWS(data){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))}
function scheduleReconnect(){if(manualDisconnect)return;const delay=Math.min(1000*Math.pow(2,reconnectAttempts),MAX_RECONNECT_DELAY);reconnectAttempts++;setTimeout(connect,delay)}

chrome.webRequest.onBeforeSendHeaders.addListener((details)=>{if(details.initiator?.startsWith('chrome-extension://'))return;for(const h of details.requestHeaders||[]){if(h.name.toLowerCase()==='authorization'&&h.value?.startsWith('Bearer ')){const token=h.value.slice(7);if(token!==flowKey){flowKey=token;metrics.tokenCapturedAt=Date.now();chrome.storage.local.set({flowKey:token});sendWS({type:'token_captured',flowKey:token})}}break}},{urls:[FLOW_ORIGIN+'/*',LABS_ORIGIN+'/*']},['requestHeaders']);

async function handleApiRequest(msg){const{id,params}=msg;const{url,method='POST',headers:reqHeaders={},body,captchaAction}=params;if(!url.startsWith(FLOW_ORIGIN)){sendHTTP(id,400,{error:'Invalid URL'});return}
metrics.requestCount++;let captchaToken=null;if(captchaAction){try{captchaToken=await solveCaptcha(id,captchaAction)}catch(e){metrics.failedCount++;metrics.lastError='CAPTCHA_FAILED';sendHTTP(id,403,{error:'CAPTCHA_FAILED'});return}}
if(!flowKey){await ensureFlowTab();await sleep(3000);if(!flowKey){sendHTTP(id,503,{error:'NO_FLOW_TOKEN'});return}}
let fetchBody=undefined;if(body){const cloned=JSON.parse(JSON.stringify(body));if(captchaToken)injectCaptcha(cloned,captchaToken);fetchBody=JSON.stringify(cloned)}
try{const headers={...reqHeaders,authorization:'Bearer '+flowKey};const resp=await fetch(url,{method,headers,credentials:'include',body:fetchBody});const text=await resp.text();let data=null;try{data=JSON.parse(text)}catch{}
metrics.successCount++;sendHTTP(id,resp.status,data||text)}catch(e){metrics.failedCount++;metrics.lastError=e.message;sendHTTP(id,0,{error:e.message})}}

async function solveCaptcha(requestId,action){const tabs=await chrome.tabs.query({url:[LABS_ORIGIN+'/fx/tools/flow*',LABS_ORIGIN+'/fx/*/tools/flow*']});let tabId=tabs[0]?.id;if(!tabId){const tab=await chrome.tabs.create({url:LABS_ORIGIN+'/fx/tools/flow',active:false});tabId=tab.id;await sleep(5000)}
return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('CAPTCHA_TIMEOUT')),30000);chrome.tabs.sendMessage(tabId,{type:'GET_CAPTCHA',requestId,action},(response)=>{clearTimeout(timeout);if(chrome.runtime.lastError){chrome.scripting.executeScript({target:{tabId},files:['content.js']},()=>{setTimeout(()=>{chrome.tabs.sendMessage(tabId,{type:'GET_CAPTCHA',requestId,action},(r2)=>{if(chrome.runtime.lastError||!r2?.token)reject(new Error('CAPTCHA_FAILED'));else resolve(r2.token)})},1000)});return}if(response?.token)resolve(response.token);else reject(new Error('CAPTCHA_NO_TOKEN'))})})}

function injectCaptcha(body,token){if(body.clientContext?.recaptchaContext)body.clientContext.recaptchaContext.token=token;const reqs=body.requests;if(Array.isArray(reqs))for(const r of reqs){if(r.clientContext?.recaptchaContext)r.clientContext.recaptchaContext.token=token}}
async function ensureFlowTab(){const tabs=await chrome.tabs.query({url:[LABS_ORIGIN+'/fx/tools/flow*',LABS_ORIGIN+'/fx/*/tools/flow*']});if(!tabs.length)await chrome.tabs.create({url:LABS_ORIGIN+'/fx/tools/flow',active:false})}
async function sendHTTP(id,status,data){try{await fetch(CALLBACK_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Callback-Secret':callbackSecret},body:JSON.stringify({id,status,data})})}catch(e){sendWS({id,status,data})}}

chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{if(msg.type==='FLOWBOARD_DOWNLOAD'){chrome.downloads.download({url:msg.url,filename:msg.filename||'video.mp4'},(id)=>{sendResponse({downloadId:id})});return true}});

function updateSidePanel(){chrome.storage.local.set({flowboardStatus:{connected:!!(ws&&ws.readyState===WebSocket.OPEN),flowKey:!!flowKey,requestCount:metrics.requestCount,successCount:metrics.successCount,failedCount:metrics.failedCount}})}

chrome.runtime.onInstalled.addListener(()=>{chrome.alarms.create('keepAlive',{periodInMinutes:0.4});connect()});
chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create('keepAlive',{periodInMinutes:0.4});connect()});
chrome.alarms.onAlarm.addListener((alarm)=>{if(alarm.name==='keepAlive')sendWS({type:'ping'});if(alarm.name==='token-refresh'&&!flowKey){ensureFlowTab().then(()=>{setTimeout(async()=>{const tabs=await chrome.tabs.query({url:[LABS_ORIGIN+'/fx/tools/flow*']});if(tabs.length&&tabs[0].id)chrome.tabs.reload(tabs[0].id)},3000)})}});
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
