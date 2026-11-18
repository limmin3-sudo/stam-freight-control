import glass from './assets/division/glass-ui-approved.png';
import './approved-glass.css';
// Approved material sheet, displayed directly; no procedural replacement frame.
export function ApprovedGlass({kind='normal'}:{kind?:'normal'|'gold'|'panel'}){
 const [x,y,w,h]=kind==='panel'?[867,116,653,776]:kind==='gold'?[22,545,819,255]:[22,233,819,249];
 return <span className="approved-glass" data-material={kind} aria-hidden="true"><img src={glass} alt="" draggable="false" style={{width:`${1536/w*100}%`,height:`${1024/h*100}%`,left:`${-x/w*100}%`,top:`${-y/h*100}%`}}/></span>;
}
