import { readFileSync, writeFileSync } from 'node:fs';

const path='src/familypilot.html';
let source=readFileSync(path,'utf8');
const corrected="function saveObligationPayment(){const selectedDate=$('obligationPayDate').value,occurredAt=selectedDate===dateInputValue(now())?now():dateFromInput(selectedDate),result=obligationApi.payOccurrence(state,obligationActionOccurrenceId,{amount:Number($('obligationPayAmount').value.trim().replace(',','.')),occurredAt},state.currentMemberId,now());";

if(source.includes(corrected)){
  console.log(JSON.stringify({status:'SKIPPED',reason:'same-day payment timestamp already corrected'},null,2));
  process.exit(0);
}

const original="function saveObligationPayment(){const result=obligationApi.payOccurrence(state,obligationActionOccurrenceId,{amount:Number($('obligationPayAmount').value.trim().replace(',','.')),occurredAt:dateFromInput($('obligationPayDate').value)},state.currentMemberId,now());";
const index=source.indexOf(original);
if(index<0)throw new Error('same-day payment correction anchor missing');
if(source.indexOf(original,index+original.length)>=0)throw new Error('same-day payment correction anchor is not unique');
source=source.slice(0,index)+corrected+source.slice(index+original.length);
writeFileSync(path,source);
console.log(JSON.stringify({status:'APPLIED',correction:'today uses current timestamp instead of noon'},null,2));
