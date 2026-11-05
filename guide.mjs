// The manual opens only on request, in this tab. The partner introduction remains separate.
export function createGuide(button,{beforeNavigate=()=>true}={}){
 function open(id=''){if(beforeNavigate()===false)return;try{sessionStorage.setItem('stam-guide-return','1');}catch{}location.assign('./guide.html'+(id?'#'+encodeURIComponent(id):''));}
 if(button)button.onclick=()=>open();
 return {open,openOnce(){}};
}
