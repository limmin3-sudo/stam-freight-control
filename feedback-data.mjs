// Only counts are admitted; never forward arbitrary page/context/error objects.
export function feedbackDiagnostics(value={}){
 const result={};
 for(const key of ['contracts','readyContracts','pendingContracts'])
  if(Number.isInteger(value?.[key])&&value[key]>=0&&value[key]<=100000)result[key]=value[key];
 return result;
}
