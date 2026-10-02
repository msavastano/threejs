import sys, json, time, subprocess, os, re, mimetypes
from playwright.sync_api import sync_playwright
ROOT='/home/claude/solar-system'
PORT=8765
srv=subprocess.Popen(['python3','-m','http.server',str(PORT),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
url=sys.argv[1] if len(sys.argv)>1 else f'http://127.0.0.1:{PORT}/index.html'
steps=json.loads(sys.argv[2]) if len(sys.argv)>2 else []
out=os.environ.get('OUT','/tmp/claude-0/-home-claude/408a3945-fc2c-5faa-b6ac-d229dbb18190/scratchpad')
os.makedirs(out,exist_ok=True)
msgs=[]
def cdn(route):
    u=route.request.url
    m=re.search(r'three@0\.160\.0/(.*)$',u)
    f=os.path.join(ROOT,'node_modules/three',m.group(1))
    if os.path.exists(f): route.fulfill(path=f,content_type='text/javascript')
    else: route.abort()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'])
    for name,w,h in [('desktop',1280,800),('phone',390,760)] if os.environ.get('PHONE') else [('desktop',1280,800)]:
        pg=b.new_page(viewport={'width':w,'height':h})
        pg.on('console',lambda m: msgs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror',lambda e: msgs.append(f'[pageerror] {e}'))
        pg.route(re.compile(r'https://cdn\.jsdelivr\.net/npm/three@0\.160\.0/.*'),cdn)
        pg.add_init_script('window.__noAdapt=true;'); pg.goto(url); pg.wait_for_timeout(3500)
        for i,st in enumerate(steps):
            if st.get('js'): print('js->',pg.evaluate(st['js']))
            if st.get('wait'): pg.wait_for_timeout(st['wait'])
            if st.get('shot'): pg.screenshot(path=f"{out}/{name}_{st['shot']}.png"); print('shot',f"{name}_{st['shot']}")
        pg.close()
    b.close()
srv.terminate()
print('\n'.join(msgs[:40]))
