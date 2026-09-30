const H=require('./lib');
(async()=>{const {b,p}=await H.open();await H.go(p,'/productivity/vendor-management/registry');await H.click(p,'Register vendor',{dlg:false});
for (const lab of ['State','Country','Currency']) { const el=await H.field(p,lab); await el.scrollIntoViewIfNeeded(); await el.click(); await H.sleep(300);
console.log(lab, await p.evaluate(()=>[...document.querySelectorAll('[role=listbox]')].map(l=>l.innerText.slice(0,80).replace(/\n/g,' | '))), await el.getAttribute('aria-expanded')); await p.keyboard.press('Escape').catch(()=>{}); await H.sleep(200);} await b.close();})();
