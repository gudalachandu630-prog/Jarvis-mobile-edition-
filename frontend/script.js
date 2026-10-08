// ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key');
if(!API_KEY){ API_KEY = prompt('Enter your Gemini API Key:'); if(API_KEY)
localStorage.setItem('jarvis_key', API_KEY); }
const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];
// ===== 2. MEMORY =====
let MEMORY = [];
try {
const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
if (Array.isArray(storedMemory)) {
MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof
m.text === 'string' && !(m.role === 'model' && /^(?:Your strong password:|ఇదిగో strong
password:)/i.test(m.text)));
if (MEMORY.length !== storedMemory.length) localStorage.setItem('jarvis_memory',
JSON.stringify(MEMORY));
} else {
localStorage.removeItem('jarvis_memory');
}
} catch (e) {
localStorage.removeItem('jarvis_memory');
}
function saveMemory(){ localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY)); }
const chat=document.getElementById('chat');
const input=document.getElementById('msg');
const micBtn=document.getElementById('mic-btn');
const clearBtn=document.getElementById('clear-btn');
const camBtn=document.getElementById('cam-btn');
const imgInput=document.getElementById('img-input');
MEMORY.forEach(m=> add((m.role==='user'?'YOU: ':'J.A.R.V.I.S: ')+m.text,
m.role==='user'?'user':'ai'));
// ===== 3. TOOLS (THE HANDS) — 15 TOOLS =====
async function fetchToolJson(url, options={}, timeoutMs=10000){
const controller=typeof AbortController==='function'?new AbortController():null;
const timeoutId=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
try{
const response=await fetch(url,{...options,...(controller?{signal:controller.signal}:{})});
