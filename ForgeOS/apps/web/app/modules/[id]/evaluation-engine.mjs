export function parseEvaluationCases(text, maximum=100) {
  if(typeof text!=='string'||text.length>100000)throw new Error('Cases JSON must be at most 100,000 characters.');
  let cases;try{cases=JSON.parse(text);}catch{throw new Error('Enter a JSON array of objects with input and expected text.');}
  if(!Array.isArray(cases)||!cases.length||cases.length>maximum)throw new Error('Provide 1–'+maximum+' cases.');
  if(!cases.every(item=>item&&typeof item==='object'&&typeof item.input==='string'&&typeof item.expected==='string'&&item.input.length<=12000&&item.expected.length<=12000))throw new Error('Each case needs input and expected strings, at most 12,000 characters each.');
  return cases.map(item=>({input:item.input,expected:item.expected}));
}
export function evaluatePastedResponses(casesText, responsesText, format='lines') {
  const cases=parseEvaluationCases(casesText);
  if(typeof responsesText!=='string'||responsesText.length>100000)throw new Error('Candidate responses must be at most 100,000 characters.');
  let responses;
  if(format==='json'){try{responses=JSON.parse(responsesText);}catch{throw new Error('Candidate JSON must be an array of response strings.');}}
  else if(format==='lines')responses=responsesText.split(/\r?\n/);
  else throw new Error('Choose a supported candidate response format.');
  if(!Array.isArray(responses)||responses.length!==cases.length||!responses.every(value=>typeof value==='string'))throw new Error('Provide exactly one response for each case. Use JSON strings for multiline or empty responses.');
  return cases.map((item,index)=>({...item,actual:responses[index],passed:responses[index].trim()===item.expected.trim()}));
}
