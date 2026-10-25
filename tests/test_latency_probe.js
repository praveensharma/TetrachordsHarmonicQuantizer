const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../tools/latency_live_probe.js'),'utf8');
const output=[],c=vm.createContext({jsarguments:['latency_live_probe.js','worker','matched'],
 Global:function(){return {};},outlet:(...a)=>output.push(a)});
vm.runInContext(source,c);
const names=['quant-bypass-rota','quant-rota','quant-batched-rota'];
for(let i=0;i<3;i++){
 output.length=0;c.configure(i);
 assert(output.some(a=>a[0]===0&&a[1]===2),'all matched trials must use quantizer path');
 assert(output.some(a=>a[0]===4&&a[1]==='routeafter'&&a[2]===2),'same ROTA route for all trials');
 assert(output.some(a=>a[1]==='bypass'&&a[2]===(i===0?1:0)));
 assert(output.some(a=>a[1]==='probebatch'&&a[2]===(i===2?1:0)));
 assert.equal(c.cases.filter(n=>n===names[i]).length,3,'balanced repeat blocks');
}
const production=fs.readFileSync(path.join(__dirname,'../Harmonic_Quantizer/harmonic_quantizer.js'),'utf8');
assert(!production.includes('probeBatchOutput'),'experimental batching must not enter production');
console.log('Matched probe: identical route, balanced bypass/quantized/list trials; production output unchanged.');
