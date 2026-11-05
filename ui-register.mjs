// Formal wording for interface copy. Partner dialogue keeps its own register.
const forms=[['해 주세요','하십시오'],['해주십시오','해 주십시오'],['해주세요','하십시오'],['해 두세요','해 두십시오'],['하세요','하십시오'],['보세요','보십시오'],['주세요','주십시오'],['고르세요','선택하십시오'],['바꾸세요','바꾸십시오'],['누르세요','누르십시오'],['넣으세요','넣으십시오'],['적으세요','적으십시오'],['보여요','표시됩니다']];
export function formalUi(text){let value=String(text);for(const [from,to] of forms)value=value.split(from).join(to);return value;}
