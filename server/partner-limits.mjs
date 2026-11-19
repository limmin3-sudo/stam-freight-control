const standardMini={inputRate:750,outputRate:4500,maxInput:400000};
export const maxPerMinute=5;

function usd(value){
 if(!/^\d{1,6}(\.\d{1,2})?$/.test(value))throw Error('Invalid partner budget');
 return Math.round(Number(value)*100)*10000000;
}

function pricing(model,env){
 if(model==='gpt-5.4-mini')return standardMini;
 const config={
  inputRate:Number(env.STAM_PARTNER_INPUT_NANODOLLARS),
  outputRate:Number(env.STAM_PARTNER_OUTPUT_NANODOLLARS),
  maxInput:Number(env.STAM_PARTNER_MAX_INPUT_TOKENS)
 };
 if(!Object.values(config).every(n=>Number.isSafeInteger(n)&&n>0))throw Error('Missing model pricing');
 return config;
}

export function partnerLimits(env,model,maxOutput){
 const rates=pricing(model,env);
 const ceiling=rates.maxInput*rates.inputRate+maxOutput*rates.outputRate;
 const funded=usd(env.STAM_PARTNER_FUNDED_USD??'8');
 const monthly=usd(env.STAM_PARTNER_MONTHLY_USD??'8');
 if(!Number.isSafeInteger(ceiling))throw Error('Invalid partner request ceiling');
 return {rates,ceiling,funded,monthly};
}
