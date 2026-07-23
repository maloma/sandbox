import { mkdirSync, writeFileSync, unlinkSync, existsSync, readFileSync, readdirSync, rmdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
const chunkDir='tools/.m3-03-payload';
const encoded=readdirSync(chunkDir).sort().map(name=>readFileSync(`${chunkDir}/${name}`,'utf8')).join('');
const payload=JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString('utf8'));
for(const [path,content] of Object.entries(payload)){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content,'utf8')}
for(const name of readdirSync(chunkDir))unlinkSync(`${chunkDir}/${name}`);rmdirSync(chunkDir);
const self='tools/pf08a-m3-03-bootstrap.mjs';if(existsSync(self))unlinkSync(self);
const temporary='.github/workflows/pf08a-m3-03-bootstrap.yml';if(existsSync(temporary))unlinkSync(temporary);
console.log(JSON.stringify({status:'PASS',written:Object.keys(payload).length,temporaryBootstrapRemoved:true},null,2));
