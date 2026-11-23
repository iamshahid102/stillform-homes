import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--no-sandbox']});
const pg = await b.newPage();
await pg.setViewport({width:1440,height:900,deviceScaleFactor:1});
pg.on('pageerror',e=>console.log('pageerror',e.message.slice(0,120)));
try{ await pg.goto('https://stillform.homes',{waitUntil:'networkidle2',timeout:60000}); }catch(e){ console.log('nav',e.message); }
await new Promise(r=>setTimeout(r,4500));
const info = await pg.evaluate(()=>{
  const cs = getComputedStyle(document.body);
  const secs = [...document.querySelectorAll('main section, main > div, header, footer')].slice(0,30).map(el=>{
    const r=el.getBoundingClientRect(), s=getComputedStyle(el);
    return {tag:el.tagName, cls:(el.className||'').toString().slice(0,50), id:el.id, top:Math.round(r.top+scrollY), h:Math.round(r.height), bg:s.backgroundColor};
  });
  const heads = [...document.querySelectorAll('h1,h2,h3')].slice(0,14).map(h=>{const s=getComputedStyle(h);return{t:h.tagName,size:s.fontSize,lh:s.lineHeight,ls:s.letterSpacing,ff:s.fontFamily.slice(0,50),w:s.fontWeight,tt:s.textTransform,c:s.color}});
  const faces=[...document.fonts].map(f=>({fam:f.family,w:f.weight,st:f.style}));
  const fr=[]; for(const sh of document.styleSheets){ try{ for(const r of sh.cssRules){ if(r.cssText&&r.cssText.includes('@font-face')) fr.push(r.cssText.replace(/url\([^)]*\)/g,'url(..)').slice(0,180)); } }catch(e){} }
  return {ht:document.documentElement.scrollHeight, sw:document.documentElement.scrollWidth, body:{ff:cs.fontFamily,bg:cs.backgroundColor,c:cs.color,fs:cs.fontSize}, secs, heads, faces:faces.slice(0,14), fr:fr.slice(0,10)};
});
console.log(JSON.stringify(info,null,1).slice(0,5000));
const H=info.ht;
for(let i=0;i<10;i++){
  const y=Math.round((H-900)*i/9);
  await pg.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);
  await new Promise(r=>setTimeout(r,1400));
  await pg.screenshot({path:'.cache/ref/ref-'+i+'.png'});
  console.log('shot',i,y);
}
await b.close();
