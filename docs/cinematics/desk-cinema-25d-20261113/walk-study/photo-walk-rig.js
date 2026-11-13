import {legReferences,toRig,walkAt,WALK,walkDuration} from './walk-solver.mjs';

const W=887,H=1774;
const left=[[940,188,337],[990,183,336],[1050,164,325],[1100,173,317],[1200,188,300],[1260,184,287],[1300,172,275],[1400,162,269],[1500,176,252],[1600,192,249],[1650,182,261],[1700,192,277],[1750,208,302],[1774,208,302]];
const right=[[940,333,514],[990,333,507],[1050,338,492],[1100,344,480],[1200,343,451],[1260,349,448],[1300,355,453],[1400,353,458],[1500,371,444],[1600,370,434],[1650,353,436],[1700,365,456],[1750,395,475],[1774,395,475]];
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// All visible pixels come from the user-approved entrance image. A continuous
// skinned strip bends at each knee/ankle; no sequence of newly generated faces.
export function createPhotoWalkRig(THREE,texture){
 const group=new THREE.Group(),root=new THREE.Group();group.add(root);
 const legs=[],hemPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),761);
 const material=()=>new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.02,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
 const uv=(x,y)=>[x/W,1-y/H];
 const makePatch=(outline,order)=>{
  const points=outline.map(p=>new THREE.Vector2(...toRig(p))),triangles=THREE.ShapeUtils.triangulateShape(points,[]).flat();
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(outline.flatMap(p=>[...toRig(p),0]),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(outline.flatMap(p=>uv(...p)),2));geometry.setIndex(triangles);
  const mesh=new THREE.Mesh(geometry,material());mesh.renderOrder=order;mesh.frustumCulled=false;return mesh;
 };
 const body=makePatch([[0,0],[W,0],[W,650],[0,650]],6);root.add(body);
 const arm=makePatch([[99,625],[188,625],[185,845],[184,956],[173,993],[160,1038],[146,1040],[119,1023],[103,984],[95,825]],8);
 const armPivot=new THREE.Group(),armOrigin=toRig([141,645]);arm.geometry.translate(-armOrigin[0],-armOrigin[1],0);armPivot.position.set(...armOrigin,0);armPivot.add(arm);root.add(armPivot);
 const skirtContour=[[630,235,455],[700,210,488],[800,178,507],[900,171,520],[950,176,513],[997,179,504]],skirtRest=[],skirtUvs=[],skirtIndices=[];
 const skirtRows=30,skirtCols=24;
 for(let row=0;row<=skirtRows;row++){
  const y=630+(997-630)*row/skirtRows;let k=0;while(k<skirtContour.length-2&&skirtContour[k+1][0]<y)k++;
  const a=skirtContour[k],b=skirtContour[k+1],t=(y-a[0])/(b[0]-a[0]),left=a[1]+(b[1]-a[1])*t,right=a[2]+(b[2]-a[2])*t;
  for(let col=0;col<=skirtCols;col++){const x=left+(right-left)*col/skirtCols;skirtRest.push(...toRig([x,y]),0);skirtUvs.push(...uv(x,y));}
 }
 for(let row=0;row<skirtRows;row++)for(let col=0;col<skirtCols;col++){const a=row*(skirtCols+1)+col,b=a+1,c=a+skirtCols+1,d=c+1;skirtIndices.push(a,b,c,b,d,c);}
 const skirtGeometry=new THREE.BufferGeometry();skirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skirtRest,3));skirtGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(skirtUvs,2));skirtGeometry.setIndex(skirtIndices);const skirt=new THREE.Mesh(skirtGeometry,material());skirt.renderOrder=5;skirt.frustumCulled=false;root.add(skirt);
 for(let leg=0;leg<2;leg++){
  const contour=leg?right:left,positions=[],uvs=[],indices=[],skinIndices=[],skinWeights=[];
  const rows=90,cols=10,start=contour[0][0],end=contour.at(-1)[0];
  const edge=y=>{let i=0;while(i<contour.length-2&&contour[i+1][0]<y)i++;const a=contour[i],b=contour[i+1],t=(y-a[0])/(b[0]-a[0]);return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];};
  for(let row=0;row<=rows;row++){
   const y=start+(end-start)*row/rows,[min,max]=edge(y);
   for(let col=0;col<=cols;col++){
    const x=min+(max-min)*col/cols;positions.push(...toRig([x,y]),0);uvs.push(...uv(x,Math.max(y,1005)));
    const knee=smooth(1215,1320,y),ankle=smooth(1580,1680,y);
    skinIndices.push(0,1,2,0);skinWeights.push(1-knee,knee*(1-ankle),ankle,0);
   }
  }
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;indices.push(a,b,c,b,d,c);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
  const reference=legReferences[leg],hip=new THREE.Bone(),knee=new THREE.Bone(),ankle=new THREE.Bone();
  hip.position.set(...reference.hip,0);knee.position.set(reference.knee[0]-reference.hip[0],reference.knee[1]-reference.hip[1],0);ankle.position.set(reference.ankle[0]-reference.knee[0],reference.ankle[1]-reference.knee[1],0);hip.add(knee);knee.add(ankle);
  const legMaterial=material();legMaterial.clippingPlanes=[hemPlane];const mesh=new THREE.SkinnedMesh(geometry,legMaterial);mesh.renderOrder=leg?2:3;mesh.frustumCulled=false;mesh.add(hip);root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([hip,knee,ankle]));
  legs.push({mesh,hip,knee,ankle,reference});
 }
 let current=null;
 const update=(time,rest=false)=>{
  if(rest){root.position.x=0;body.position.y=0;body.rotation.z=0;armPivot.position.y=armOrigin[1];armPivot.rotation.z=0;skirtGeometry.attributes.position.array.set(skirtRest);skirtGeometry.attributes.position.needsUpdate=true;for(const leg of legs){leg.hip.position.set(...leg.reference.hip,0);leg.hip.rotation.z=leg.knee.rotation.z=leg.ankle.rotation.z=0;}group.updateMatrixWorld(true);hemPlane.constant=root.localToWorld(new THREE.Vector3(0,761,0)).y;current={rest:true,distance:0};return current;}
  const pose=walkAt(time);root.position.x=pose.distance;body.position.y=pose.bob;
  armPivot.position.y=armOrigin[1]+pose.bob;armPivot.rotation.z=.06*Math.sin(2*Math.PI*(pose.time/WALK.period+WALK.initialPhase));
  const hemY=761+pose.bob,centers=pose.legs.map(leg=>{const u=(leg.hip[1]-hemY)/(leg.hip[1]-leg.knee[1]);return leg.hip[0]+(leg.knee[0]-leg.hip[0])*u+344;});
  const hemLeft=Math.min(179,Math.min(...centers)-82),hemRight=Math.max(504,Math.max(...centers)+94);
  const positions=skirtGeometry.attributes.position;
  for(let row=0;row<=skirtRows;row++)for(let col=0;col<=skirtCols;col++){
   const i=row*(skirtCols+1)+col,w=smooth(.25,1,row/skirtRows),u=col/skirtCols;
   positions.setXYZ(i,skirtRest[i*3]+((hemLeft-179)*(1-u)+(hemRight-504)*u)*w,skirtRest[i*3+1]+pose.bob,0);
  }
  positions.needsUpdate=true;
  for(let i=0;i<2;i++){
   const leg=legs[i],reference=leg.reference,target=pose.legs[i];
   const upperBind=Math.atan2(reference.knee[1]-reference.hip[1],reference.knee[0]-reference.hip[0]);
   const lowerBind=Math.atan2(reference.ankle[1]-reference.knee[1],reference.ankle[0]-reference.knee[0]);
   const upper=Math.atan2(target.knee[1]-target.hip[1],target.knee[0]-target.hip[0]);
   const lower=Math.atan2(target.ankle[1]-target.knee[1],target.ankle[0]-target.knee[0]);
   leg.hip.position.set(...target.hip,0);leg.hip.rotation.z=upper-upperBind;leg.knee.rotation.z=lower-lowerBind-leg.hip.rotation.z;
   leg.ankle.rotation.z=target.foot.pitch-leg.hip.rotation.z-leg.knee.rotation.z;
  }
  group.updateMatrixWorld(true);hemPlane.constant=root.localToWorld(new THREE.Vector3(0,761+pose.bob,0)).y;current=pose;return pose;
 };
 update(0,true);
 return {group,root,body,legs,update,get state(){return current;},duration:walkDuration(),dispose(){for(const mesh of [body,arm,skirt,...legs.map(l=>l.mesh)]){mesh.geometry.dispose();mesh.material.dispose();}legs.forEach(l=>l.mesh.skeleton.dispose());}};
}
