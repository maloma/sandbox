import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath='src/familypilot.html';
const indexPath='index.html';
const sourceScopePath='src/familypilot-scope.js';
const rootScopePath='familypilot-scope.js';
const sourceAnalyticsPath='src/familypilot-analytics-state.js';
const rootAnalyticsPath='familypilot-analytics-state.js';

const source=readFileSync(sourcePath,'utf8');
const index=readFileSync(indexPath,'utf8');
const scopeModule=readFileSync(sourceScopePath,'utf8');
const rootScope=readFileSync(rootScopePath,'utf8');
const analyticsModule=readFileSync(sourceAnalyticsPath,'utf8');
const rootAnalytics=readFileSync(rootAnalyticsPath,'utf8');

if(!source.includes('<script src="./familypilot-scope.js"></script>'))throw new Error('FamilyPilot scope module tag is missing');
if(!source.includes('<script src="./familypilot-analytics-state.js"></script>'))throw new Error('Analytics state module tag is missing');

const changed={html:index!==source,scope:rootScope!==scopeModule,analytics:rootAnalytics!==analyticsModule};
if(changed.html)writeFileSync(indexPath,source,'utf8');
if(changed.scope)writeFileSync(rootScopePath,scopeModule,'utf8');
if(changed.analytics)writeFileSync(rootAnalyticsPath,analyticsModule,'utf8');

console.log(JSON.stringify({
  status:'PASS',
  byteIdempotent:true,
  changed,
  html_artifacts:[sourcePath,indexPath],
  scope_artifacts:[sourceScopePath,rootScopePath],
  analytics_artifacts:[sourceAnalyticsPath,rootAnalyticsPath]
},null,2));