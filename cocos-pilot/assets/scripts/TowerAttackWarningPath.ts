/** Explicit world-space vertices avoid Graphics.arc's opposite sweep convention. */
export function ordinarySectorPath(g:any,x:number,y:number,r:number,dir:number,half:number){
 g.moveTo(x,y);
 const steps=Math.max(12,Math.ceil(half*2/.08));
 for(let i=0;i<=steps;i++){
  const angle=dir-half+half*2*i/steps;
  g.lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r);
 }
 g.close();
}
