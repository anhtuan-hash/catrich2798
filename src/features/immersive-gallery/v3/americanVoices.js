// Prefer authentic en-US system voices; never silently switch to a British or other accent.
const normalizedLang=value=>String(value||'').toLowerCase().replace(/_/g,'-');
export const isAmericanVoice=voice=>normalizedLang(voice?.lang)==='en-us';
export function rankAmericanVoices(voices){
 const priority=[
  /microsoft (aria|jenny|guy|ava|andrew|emma)/i,
  /google us english/i,
  /samantha|alex|ava \(premium\)|allison|zoe|nathan/i,
  /natural|neural|enhanced|premium/i
 ];
 return (Array.isArray(voices)?voices:[]).filter(isAmericanVoice).sort((a,b)=>{
  const rank=voice=>{
   const name=String(voice.name||'');
   const index=priority.findIndex(re=>re.test(name));
   return (index<0?priority.length:index)*10+(voice.localService?0:1);
  };
  return rank(a)-rank(b)||String(a.name).localeCompare(String(b.name));
 });
}
