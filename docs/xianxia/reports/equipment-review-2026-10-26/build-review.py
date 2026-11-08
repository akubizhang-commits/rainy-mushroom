from pathlib import Path
import re,html
root=Path(__file__).resolve().parents[2]
files=[('overview','设计总览',root/'21-equipment-detail-review.md'),('rules','上限与属性',root/'equipment/01-budget-and-rules.md'),('catalog','七职业36件目录',root/'equipment/02-class-catalog.md'),('numbers','数值验证',root/'equipment/03-numeric-validation.md'),('economy','获取与成长',root/'equipment/04-economy-and-progression.md'),('delivery','开发与验收',root/'equipment/05-production-and-qa.md')]
ids={p.resolve():i for i,_,p in files}
def inline(text,current):
 text=html.escape(text)
 def link(m):
  label,target=m.groups();dest=(current.parent/html.unescape(target)).resolve()
  if dest in ids:return f'<a href="#{ids[dest]}" data-doc="{ids[dest]}">{label}</a>'
  return label
 text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,text)
 text=re.sub(r'`([^`]+)`',r'<code>\1</code>',text)
 text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
 return text

def render(text,current):
 lines=text.splitlines();out=[];table=[];lst=None;fenced=False;code=[]
 def close_table():
  if table:
   rows=[]
   for n,row in enumerate(table):
    if all(re.fullmatch(r':?-{2,}:?',x.strip()) for x in row):continue
    tag='th' if n==0 else 'td';rows.append('<tr>'+''.join(f'<{tag}>{inline(x.strip(),current)}</{tag}>' for x in row)+'</tr>')
   out.append('<div class="table"><table>'+''.join(rows)+'</table></div>');table.clear()
 def close_list():
  nonlocal lst
  if lst:out.append(f'</{lst}>');lst=None
 for line in lines:
  line=line.strip()
  if line.startswith('```'):
   close_table();close_list()
   if fenced:out.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');code.clear()
   fenced=not fenced;continue
  if fenced:code.append(line);continue
  if line.startswith('|') and line.endswith('|'):
   close_list();table.append(line[1:-1].split('|'));continue
  close_table()
  if not line:close_list();continue
  h=re.match(r'^(#{1,6})\s+(.*)',line)
  li=re.match(r'^(?:([-*])\s+|\d+\.\s+)(.*)',line)
  if h:
   close_list();n=len(h[1]);out.append(f'<h{n}>{inline(h[2],current)}</h{n}>')
  elif li:
   typ='ul' if li[1] else 'ol'
   if lst!=typ:close_list();out.append('<'+typ+'>');lst=typ
   out.append('<li>'+inline(li[2],current)+'</li>')
  else:close_list();out.append('<p>'+inline(line,current)+'</p>')
 close_table();close_list();return '\n'.join(out)
nav=''.join(f'<a href="#{i}" data-doc="{i}">{label}</a>' for i,label,p in files)
articles=''.join(f'<article id="{i}" {"" if n==0 else "hidden"}>{render(p.read_text(),p)}</article>' for n,(i,label,p) in enumerate(files))
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>全职业装备详细设计</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f3ed;color:#20372e;font:16px/1.8 system-ui,sans-serif}header{padding:26px 30px;background:#183c30;color:#f0f2df}header p{margin:0;color:#cbdbc9}header strong{font-size:25px}main{max-width:1420px;margin:auto;display:grid;grid-template-columns:200px minmax(0,1fr);gap:30px;padding:28px}nav{align-self:start;position:sticky;top:20px;display:flex;flex-direction:column;gap:5px}a{color:#285f4b}nav a{padding:8px 12px;border-radius:6px;text-decoration:none}nav a[aria-current=true]{background:#d8e4d5;font-weight:700}article{min-width:0;max-width:1120px}article[hidden]{display:none}h1{font-size:29px;line-height:1.4;margin-top:0}h2{font-size:23px;margin-top:32px}h3{font-size:19px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#e6e9df;padding:14px}code{background:#e6e9df;border-radius:3px;padding:1px 4px;overflow-wrap:anywhere}.table{overflow-x:auto;margin:20px 0}table{border-collapse:collapse;width:100%;font-size:15px;min-width:600px}th,td{border:1px solid #cad4c6;padding:11px 13px;text-align:left;vertical-align:top}th{background:#e1e9db}tr:nth-child(even){background:#fbfbf6}li{margin:5px 0}button{min-height:44px;font:inherit;border:1px solid #cbd8c4;background:#e3e9db;color:#234a37;border-radius:6px;padding:5px 14px;cursor:pointer}footer{border-top:1px solid #cad4c6;padding:20px 28px;color:#61745f}.tools{margin-top:15px}a:focus-visible,button:focus-visible{outline:3px solid #ad790a;outline-offset:3px}@media(max-width:760px){header{padding:20px 16px}main{display:block;padding:18px 14px}nav{position:static;flex-direction:row;flex-wrap:wrap;margin-bottom:26px;gap:3px}nav a{padding:8px;font-size:15px}h1{font-size:25px}}@media print{header,nav,footer{display:none}main{display:block;padding:0}article[hidden]{display:block}article{page-break-before:always}article:first-child{page-break-before:auto}.table{overflow:visible}table{min-width:0;font-size:10px}h2{break-after:avoid}tr{break-inside:avoid}}
</style><header><strong>全职业装备详细设计</strong><p>下品 · 中品 · 上品 · 极品 ／ 四品质 · 七职业36件装备 · 整套预算低于30%</p><div class="tools"><button id="print">打印完整评审稿</button></div></header><main><nav aria-label="文档目录">'''+nav+'</nav><section>'+articles+'''</section></main><footer>设计提案 v3 · 2026-10-26 · 数值契约数学验证与玩法验证分开；本轮未改正式游戏。</footer><script>
function show(id){if(!document.getElementById(id))id='overview';document.querySelectorAll('article').forEach(a=>a.hidden=a.id!==id);document.querySelectorAll('nav a').forEach(a=>a.setAttribute('aria-current',String(a.dataset.doc===id)));}window.addEventListener('hashchange',()=>{show(location.hash.slice(1));window.scrollTo(0,0)});show(location.hash.slice(1)||'overview');document.getElementById('print').onclick=()=>window.print();
</script></html>'''
(root/'equipment-review.html').write_text(page)
print('Rendered',len(files),'documents')
