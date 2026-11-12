/** Decorate the existing single panel without replacing controls, IDs or layout. */
export function arrangeGuideHolograms(root:HTMLElement){
 const panel=root.querySelector<HTMLElement>('.unified');
 const stage=root.querySelector<HTMLElement>('.stage');
 if(!panel||!stage)return;
 panel.classList.add('holo-plane');
 for(const name of ['surface','rim','reflection']){
  const layer=document.createElement('div');
  layer.className='holo-optics holo-optics-'+name;
  layer.setAttribute('aria-hidden','true');
  panel.prepend(layer);
 }
 const spacer=document.createElement('div');
 spacer.className='holo-scene-space';spacer.setAttribute('aria-hidden','true');
 stage.append(spacer);
 stage.dataset.holograms='unified';
}
