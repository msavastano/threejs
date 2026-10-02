import re,json,html
t=open('approx_pos.html' if False else '/home/claude/solar-system/approx_pos.html',encoding='utf-8',errors='ignore').read()
t=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S)
t=re.sub(r'<[^>]+>',' ',t); t=html.unescape(t)
lines=[l.strip() for l in t.splitlines()]
def parse(start_marker,end_marker):
    i=t.find(start_marker); j=t.find(end_marker,i)
    seg=[l.strip() for l in t[i:j].splitlines() if l.strip()]
    res={};k=0
    names=['Mercury','Venus','EM Bary','Mars','Jupiter','Saturn','Uranus','Neptune']
    while k<len(seg):
        for n in names:
            if seg[k].startswith(n+' ') and re.fullmatch(r'[-+0-9.eE\s]+',seg[k][len(n):]):
                v0=list(map(float,seg[k].split()[len(n.split()):]))
                v1=list(map(float,seg[k+1].split()))
                assert len(v0)==6 and len(v1)==6,(n,v0,v1)
                res[n]=[[a,b] for a,b in zip(v0,v1)]  # [value, rate] for a,e,I,L,peri,node
        k+=1
    return res
t1=parse('Table 1','EM Bary = Earth')
t2=parse('Table 2a','EM Bary = Earth')
# table 2b
i=t.find('Table 2b'); seg=[l.strip() for l in t[i:].splitlines() if l.strip()]
t2b={}
for l in seg:
    for n in ['Jupiter','Saturn','Uranus','Neptune']:
        if l.startswith(n+' '): t2b[n]=list(map(float,l.split()[1:5]))
assert len(t1)==8 and len(t2)==8 and len(t2b)==4
json.dump({'table1':t1,'table2a':t2,'table2b':t2b},open('/home/claude/solar-system/data/jpl_elements.json','w'),indent=1)
print('ok',len(t1),len(t2),t2b['Neptune'])
