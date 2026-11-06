// Legacy zero defaults represent missing evidence. An explicitly reviewed zero
// remains a known zero; no reward is inferred from SCU or our flight ETA.
export function hasReward(mission){if(mission.reward==null||String(mission.reward).trim()==='')return false;const value=Number(mission.reward);return Number.isSafeInteger(value)&&value>=0&&(value>0||mission._rewardKnown===true)&&!mission._rewardEstimated;}
export function rewardSummary(missions){const confirmed=missions.filter(hasReward);return {amount:confirmed.reduce((n,m)=>n+Number(m.reward),0),known:confirmed.length,unknown:missions.length-confirmed.length,total:missions.length,complete:confirmed.length===missions.length};}
