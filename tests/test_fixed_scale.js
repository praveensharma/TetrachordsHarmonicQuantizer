const fs=require('fs'),vm=require('vm'),assert=require('assert');
let output=[],ui=[];
const c={outlet:(...args)=>output.push(args),Task:function(){this.schedule=()=>{};this.cancel=()=>{};},
 patcher:{getnamed:name=>({message:(...args)=>ui.push([name,...args])})}};
vm.createContext(c);vm.runInContext(fs.readFileSync('native/max/fixed_scale_setup.js','utf8'),c);c.setup();
assert(output.some(a=>JSON.stringify(a)==='[1,"mode","scale-nearest"]'));
assert(output.some(a=>JSON.stringify(a)==='[1,"registermode","free"]'));
assert(output.some(a=>JSON.stringify(a)==='[0,"validnotes",1,0,"midi",0,2,4,5,7,9,11]'));
assert(ui.some(a=>JSON.stringify(a)==='["quantizer_mode","int",1]'));
assert(output.every(a=>['validnotes','chord','mode','registermode','timing','inputbehavior','samepitch','ensemble','separation'].includes(a[1])));
console.log('Fixed scale initializer: controls only, C major, nearest/free/follow');
