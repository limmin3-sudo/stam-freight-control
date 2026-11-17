// Spreadsheet applications may interpret formulas even after leading whitespace.
export function csvCell(value:unknown){return '"'+String(value??'').replace(/^\s*[=+@-]/,"'"+'$&').replaceAll('"','""')+'"';}
export function tradeDownload(name:string,value:unknown){
 const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:typeof value==='string'?'text/csv;charset=utf-8':'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
