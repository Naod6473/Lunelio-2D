"""Vérifie que chaque robot et la sortie sont atteignables dans toutes les salles. Lancer après worlds.py."""
import json, os
from collections import deque
GROUND = "WS"   # ennemis au sol, comme GROUND_ENEMIES dans worlds.py
W=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'worlds.json'), encoding='utf-8'))
def check(m):
    R,C=17,30
    t=lambda r,c: m[r][c] if 0<=r<R and 0<=c<C else '#'
    solid=lambda r,c: t(r,c)=='#'
    sup=lambda r,c: t(r,c) in '#-'
    def stand(r,c): return not solid(r,c) and not solid(r-1,c) and sup(r+1,c)
    start=[(r,c) for r in range(R) for c in range(C) if m[r][c]=='P'][0]
    seen={start}; q=deque([start])
    while q:
        r,c=q.popleft()
        for r2 in range(1,16):
            for c2 in range(1,29):
                if (r2,c2) in seen or not stand(r2,c2): continue
                dy=r-r2; dx=abs(c2-c)
                ok=False
                if dy==0 and dx==1: ok=True
                elif 1<=dy<=3 and dx<=5:
                    # need clear column above start or target (crude headroom check)
                    ok = all(not solid(rr,c) for rr in range(r2-1,r)) or all(not solid(rr,c2) for rr in range(r2-1,r+1))
                elif dy<0 and dx<=7: ok=True
                elif dy==0 and dx<=4: ok=all(not solid(r,cc) for cc in range(min(c,c2),max(c,c2)+1))
                if ok: seen.add((r2,c2)); q.append((r2,c2))
    bad=[]
    for r in range(R):
        for c in range(C):
            ch=m[r][c]
            if ch in GROUND + 'E':
                if not any((r,cc) in seen for cc in (c-1,c,c+1)): bad.append((ch,r,c))
    return bad
for w in W:
    for i,rm in enumerate(w['rooms']):
        b=check(rm['map'])
        print(w['id'],i+1,rm['name'],'OK' if not b else b)
