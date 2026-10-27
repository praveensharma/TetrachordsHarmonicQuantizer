// Test diagnostic accounting, not engine latency or MIDI hardware behavior.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function run(kind,boundary,empty=false){
 let report;
 const c={arrayfromargs:a=>Array.from(a),outlet(){},Task:function(){this.schedule=()=>{};this.cancel=()=>{};},
  File:function(){this.isopen=true;this.writeline=s=>{report=JSON.parse(s);};this.close=()=>{};}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('native/max/runtime_timing.js','utf8'),c);
 c.phases=[kind];c.begin();
 if(!empty){
  if(boundary){c.inputoff();if(kind!=='native')c.result(0,55,0);}
  c.source(10,100);c.result(10.01,55,100);c.inputoff();c.result(11,55,0);
 }
 c.collect();c.finish();return report;
}
assert.equal(run('wire',true).valid,true);
assert.equal(run('legacy',true).valid,true);
assert.equal(run('native',true).valid,true);
assert.equal(run('native',false).valid,true);
assert.equal(run('native',false,true).valid,false);
assert.equal(run('native',false).results[0].samples,1);
console.log('Native timing diagnostic accounting passed');
