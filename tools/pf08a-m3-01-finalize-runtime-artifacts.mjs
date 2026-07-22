import { readFileSync, writeFileSync } from 'node:fs';

const sourceFile='src/familypilot.html';
const publishedFile='index.html';
const obligationUiFile='familypilot-obligations-ui-v2.js';
const debtUiFile='familypilot-debts-ui.js';
const obligationStart='/* pf08a-m3-02-inline-ui:start */';
const obligationEnd='/* pf08a-m3-02-inline-ui:end */';
const debtStart='/* pf08a-m2-01-inline-ui:start */';
const debtEnd='/* pf08a-m2-01-inline-ui:end */';
const finalAnchor='\nsyncCategoryVisualViewport();\nrenderAll();\n})();';
const obligationScript='<script src="./familypilot-obligations.js"></script>';
const debtScript='<script src="./familypilot-debts.js"></script>';
const planMarker='<meta name="familypilot-package" content="plan-obligations-foundation-v1">';
const debtMarker='<meta name="familypilot-package" content="debt-chains-principal-v1">';

let html=readFileSync(sourceFile,'utf8');
const obligationUi=readFileSync(obligationUiFile,'utf8').trim();
const debtUi=readFileSync(debtUiFile,'utf8').trim();

if(!html.includes(planMarker))throw new Error('Obligations package marker is missing');
if(!html.includes(obligationScript))throw new Error('Obligations module script anchor is missing');

if(!html.includes(debtMarker))html=html.replace(planMarker,`${planMarker}\n${debtMarker}`);
if(!html.includes(debtScript))html=html.replace(obligationScript,`${obligationScript}\n${debtScript}`);

function replaceOrInsertBlock(source,startMarker,endMarker,content,anchor){
  const block=`${startMarker}\n${content}\n${endMarker}`;
  const start=source.indexOf(startMarker),end=source.indexOf(endMarker);
  if(start>=0||end>=0){
    if(start<0||end<0||end<start)throw new Error(`${startMarker} markers are inconsistent`);
    return source.slice(0,start)+block+source.slice(end+endMarker.length);
  }
  const first=source.indexOf(anchor);
  if(first<0)throw new Error(`Canonical app finalization anchor missing for ${startMarker}`);
  if(source.indexOf(anchor,first+anchor.length)>=0)throw new Error(`Canonical app finalization anchor is not unique for ${startMarker}`);
  return source.slice(0,first)+`\n${block}\n`+source.slice(first);
}

html=replaceOrInsertBlock(html,obligationStart,obligationEnd,obligationUi,finalAnchor);
html=replaceOrInsertBlock(html,debtStart,debtEnd,debtUi,finalAnchor);

writeFileSync(sourceFile,html);
writeFileSync(publishedFile,html);
console.log(JSON.stringify({status:'PASS',sourceFile,publishedFile,obligationUiFile,debtUiFile,obligationInline:true,debtInline:true,debtScript:true,bytes:Buffer.byteLength(html)},null,2));
