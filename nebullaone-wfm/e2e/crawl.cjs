const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const S=process.env.OUT||'.';
const routes=['/vm/overview','/vm/registry','/vm/approvals','/vm/compliance','/vm/holds','/vm/requisitions','/vm/rfq','/vm/blanket-orders','/vm/price-lists','/vm/purchase-orders','/vm/goods-receipts','/vm/service-receipts','/vm/invoices','/vm/scorecard','/vm/portal','/vm/settings','/cl/overview','/cl/onboarding','/cl/contracts','/cl/kickoff','/cl/work-orders','/cl/change-orders','/cl/attendance','/cl/measurement-book','/cl/ra-bills','/cl/financial-security','/cl/labor-rates','/cl/performance','/cl/safety','/cl/closeout','/cl/final-settlement','/cl/release','/admin/audit'];
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1000}});
 let errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>{ if(m.type()==='error' && !m.text().includes('CERT')) errs.push('CONSOLE '+m.text()); });
 p.on('response',r=>{ if(r.url().includes('/api/') && r.status()>=400) errs.push('HTTP '+r.status()+' '+r.url()); });
 await p.goto((process.env.BASE_URL||'http://localhost:5173')+'/'); await p.fill('input[type=email]','admin@nebullaone.in'); await p.fill('input[type=password]','nebulla123'); await p.click('button:has-text("Sign in")'); await p.waitForTimeout(1500);
 for(const r of routes){ errs=[];
  await p.goto((process.env.BASE_URL||'http://localhost:5173')+r); await p.waitForTimeout(1800);
  const txt=await p.evaluate(()=>document.querySelector('main')?.innerText||'');
  const recs=(txt.match(/(\d+)\s*(of \d+ )?records/)||[])[0]||'';
  await p.screenshot({path:S+'/shots/'+r.replace(/\//g,'_')+'.png'});
  console.log((errs.length?'✗ ':'✓ ')+r.padEnd(26)+recs+' '+errs.slice(0,3).join(' | '));
 }
 await b.close();})();
