'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..'),driver=process.argv[process.argv.indexOf('--driver')+1];
const source=fs.readFileSync(path.join(root,'tests/reference/harmonic_quantizer_legacy.js'),'utf8');
function run(name,ops){
 let now=0;const timers=new Set(),shared={},out=[],contexts=[],expected=[];
 function Task(fn,owner){this.fn=fn;this.owner=owner;this.schedule=ms=>{this.due=now+ms*1000;timers.add(this);};this.cancel=()=>timers.delete(this);this.repeat=()=>{};}
 for(let owner=0;owner<4;owner++){
  const c=vm.createContext({Task,inlet:0,Global:function(k){return shared[k]||(shared[k]={});},
   Date:class extends Date{constructor(){super(now/1000);}},arrayfromargs:a=>Array.from(a),
   outlet(i,...bytes){if(i===0)for(const b of bytes.flat())out.push([owner,b]);},messnamed(){},patcher:{getnamed(){return null;}}});
  vm.runInContext(source,c);c.init();c.mode('nearest');contexts.push(c);
 }
 function advance(target){for(let i=0;i<100000;i++){
  const t=[...timers].filter(t=>t.due<=target).sort((a,b)=>a.due-b.due)[0];
  if(!t){now=target;return;}now=t.due;timers.delete(t);t.fn.call(t.owner);
 }throw Error('scheduler loop');}
 const lines=[];
 for(const [owner,time,op,...args] of ops){
  advance(time);const c=contexts[owner];
  switch(op){
   case 'advance':break;
   case 'msg':args.forEach(b=>c.msg_int(b));break;
   case 'field':{const [version,root,mask]=args;c.apply_valid_notes([version,root,'midi',...Array.from({length:12},(_,n)=>n).filter(n=>mask&(1<<n))]);break;}
   case 'hold':c.inputbehavior(args[0]?'hold':'follow');break;
   case 'register':c.registermode(args[0]?'free':'limited');break;
   case 'change':c.timing(['immediate','nextnote','nextbar'][args[0]]);break;
   case 'same':c.samepitch(args[0]);break;
   case 'mode':c.mode(['nearest','chordnearest','harmonizer','chromatic','up','down','melody','statefulnearest'][args[0]]);break;
   default:c[op](...args);
  }
  expected.push([...out]);out.length=0;lines.push([owner,time,op,...args].join(' '));
 }
 const r=spawnSync(driver,[],{input:lines.join('\n')+'\n',encoding:'utf8',maxBuffer:32*1024*1024});
 assert.equal(r.status,0,r.stderr);const actual=r.stdout.trim().split('\n').map(JSON.parse);
 for(let i=0;i<expected.length;i++)assert.deepStrictEqual(actual[i],expected[i],`${name}: ${i} ${JSON.stringify(ops[i])}`);
 console.log(`Timed JS/C++ parity: ${name} (${ops.length} operations) passed.`);
}
for(const separation of [0,50,100])for(const hold of [0,1])for(const mode of [0,6,7]){
 const ops=[];for(let p=0;p<4;p++)for(const [op,...values] of [['change',0],['register',1],['field',1,0,0xab5],['ensemble',1],['part',p+1],['separation',separation],['hold',hold],['stability',20],['mode',mode]])ops.push([p,0,op,...values]);
 let time=1000,version=1;
 for(let cycle=0;cycle<16;cycle++){
  for(let p=0;p<4;p++)ops.push([p,time,'msg',144,60+(cycle%5),100]);
  // Releases shorter than a window must stay paired; Hold ignores them.
  for(let p=0;p<4;p++)ops.push([p,time+1000,'msg',128,60+(cycle%5),0]);
  ops.push([0,time+25000,'advance']);
  time+=30000;
  if(cycle%4===0)for(let p=0;p<4;p++)ops.push([p,time,'field',++version,cycle%12,cycle%2?0x5ad:0xab5]);
 }
 for(let p=0;p<4;p++)ops.push([p,time+100000,'panic']);
 run(`separation=${separation}, hold=${hold}, mode=${mode}`,ops);
}
