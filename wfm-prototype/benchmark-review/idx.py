import json, os, re, glob, sys
S=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# ERPNext doctype fields
erp=[]
for f in glob.glob(S+'/erp/*.json'):
    try: d=json.load(open(f))
    except Exception: continue
    for x in d.get('fields',[]):
        if x.get('fieldtype') in ('Section Break','Column Break','Tab Break'): continue
        erp.append((d.get('name',os.path.basename(f)), x.get('fieldname',''), x.get('label',''), x.get('fieldtype',''), x.get('options','') if x.get('fieldtype') in ('Select','Link','Table') else ''))
# Odoo fields
odo=[]
for f in glob.glob(S+'/odoo/*.py'):
    src=open(f).read(); model=re.findall(r"_(?:name|inherit)\s*=\s*['\[]\s*'?([\w.]+)",src)
    for m in re.finditer(r"^\s+(\w+)\s*=\s*fields\.(\w+)\(([^)]*)",src,re.M):
        s=re.search(r"string=['\"]([^'\"]+)",m.group(3)) or re.match(r"\s*['\"]([^'\"]+)['\"]",m.group(3))
        odo.append((os.path.basename(f).replace('.py',''),m.group(1),s.group(1) if s else '',m.group(2),''))
for f in glob.glob(S+'/odoo/*.xml'):
    for m in re.finditer(r'<field name="(\w+)"[^>]*?(?:string="([^"]+)")?',open(f).read()):
        odo.append((os.path.basename(f),m.group(1),m.group(2) or '','view',''))
# NebullaOne original crawl labels
neb=[]
for f in glob.glob(S+'/deep.jsonl.*'):
    for l in open(f):
        r=json.loads(l)
        if r.get('kind') not in ('page','dialog') and 'fields' not in r: continue
        t=r.get('title','')
        for k in ('fields','listboxes','groups'):
            for x in r.get(k,[]) or []:
                lab=x.get('label') if isinstance(x,dict) else str(x)
                neb.append((os.path.basename(f)[11:],t,k,lab or ''))
        for tb in r.get('tables',[]) or []:
            for c in tb.get('cols',[]): neb.append((os.path.basename(f)[11:],t,'col',c.get('name','')))
        for k in ('displays','texts','buttons'):
            for x in r.get(k,[]) or []:
                neb.append((os.path.basename(f)[11:],t,k,(x if isinstance(x,str) else json.dumps(x))[:160]))
json.dump({'erp':erp,'odoo':odo,'neb':neb},open(S+'/rv/idx.json','w'))
print(len(erp),len(odo),len(neb))
