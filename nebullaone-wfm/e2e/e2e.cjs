const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const S=process.env.OUT||'.'; const U='http://localhost:5173';
async function login(b, email){ const p=await b.newPage({viewport:{width:1500,height:950}}); p.on('dialog',d=>d.accept()); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(U); await p.fill('input[type=email]',email); await p.fill('input[type=password]','nebulla123'); await p.click('button:has-text("Sign in")'); await p.waitForTimeout(1500); return p; }
const ok=(c,m)=>console.log((c?'✓ ':'✗ ')+m);
(async()=>{
 const b=await chromium.launch();
 // 1. Vendor portal: accept a work order
 let p=await login(b,'ramesh@shreebalaji.in');
 ok((await p.textContent('body')).includes('Supplier portal'),'vendor lands on supplier portal');
 await p.click('button:has-text("Work orders")'); await p.waitForTimeout(500);
 await p.getByRole('button',{name:'Accept',exact:true}).click(); await p.waitForTimeout(1500);
 ok(!(await p.getByRole('button',{name:'Accept',exact:true}).count()),'vendor accepted WO-002 in the portal');
 const leaked=(await p.textContent('body')).includes('Deccan Steel');
 ok(!leaked,'vendor sees no other vendors’ data'); await p.screenshot({path:S+'/e2e_portal.png'}); await p.close();
 // 2. Finance: payment blocked by compliance, override with reason
 p=await login(b,'finance@nebullaone.in');
 await p.goto(U+'/vm/invoices'); await p.waitForTimeout(1500);
 await p.click('text="RA-005"'); await p.waitForTimeout(800);
 await p.click('button:has-text("Record payment")'); await p.waitForTimeout(400);
 await p.fill('input:below(:text("UTR / cheque no."))','UTR778899'); await p.click('button:has-text("Save")'); await p.waitForTimeout(1200);
 const txt=await p.textContent('[role=dialog]:last-of-type');
 ok(/Blocked by vendor controls/.test(txt) && /Contractor's All Risk/.test(txt),'payment stopped by compliance gate with reason shown');
 await p.fill('textarea[placeholder="Reason for overriding"]','CAR policy renewed; certificate received by email, upload pending'); await p.click('button:has-text("with override")'); await p.waitForTimeout(1500);
 ok((await p.textContent('body')).includes('Paid'),'finance override recorded and bill paid'); await p.screenshot({path:S+'/e2e_pay.png'}); await p.close();
 // 3. PM: labour rate below minimum wage refused
 p=await login(b,'pm@nebullaone.in');
 await p.goto(U+'/cl/labor-rates'); await p.waitForTimeout(1200); await p.click('button:has-text("New rate")'); await p.waitForTimeout(300);
 const f=async(l,v)=>p.fill(`input:below(:text("${l}"))`,v);
 await f('Trade','Painter'); await p.selectOption('select:below(:text("Skill"))','Semi-skilled'); await f('Region / zone','Mumbai (Zone I)');
 await f('Statutory minimum wage','640'); await f('Rate (₹/day)','600'); await f('Effective from','2026-10-01');
 await p.click('button:has-text("Save")'); await p.waitForTimeout(1000);
 ok(/below the statutory minimum wage/.test(await p.textContent('[role=dialog]')),'below-minimum-wage rate refused with explanation');
 await p.screenshot({path:S+'/e2e_rate.png'});
 console.log('page errors:', p.errs.length); await b.close();
})().catch(e=>{console.error('E2E FAILED',e.message);process.exit(1)});
