import {Node,view} from 'cc';
import {PilotUI} from './PilotUI';
import {LIBRARY_LEVELS} from './shared/js/library/LibraryLevels';

// Grey-box rainy library. Task 8 fills in the menu, round screen and dialogs.
export class LibraryView{
 u:PilotUI;
 constructor(private host:any){const s=view.getVisibleSize();this.u=new PilotUI(host.canvas,s.width,s.height,host.safeTop,host.safeBottom);this.render()}
 render(){const s=view.getVisibleSize();this.u.destroy();this.u=new PilotUI(this.host.canvas,s.width,s.height,this.host.safeTop,this.host.safeBottom);this.u.box(this.u.root,undefined,0);this.u.text(`雨后森林图书馆 · ${LIBRARY_LEVELS.length} 关`,this.u.root).setPosition(0,0)}
 update(_dt:number){}
 destroy(){this.u.destroy()}
}
