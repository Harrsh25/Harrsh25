import sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t = open(os.path.join(root, 'src/template.html')).read()
app = open(os.path.join(root, 'src/app.js')).read()
assert '</script' not in app.lower().replace('<\\/script', ''), 'raw </script> in bundle'
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
out = os.path.join(root, 'dist/NebullaOne-WFM.html')
open(out, 'w').write(t.replace('/*__APP_BUNDLE__*/', app))
print('built', out, os.path.getsize(out))
