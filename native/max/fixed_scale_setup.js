// Test-only CONTROL initializer. Never generates melodic MIDI or note events.
autowatch=1;inlets=1;outlets=2;
var setupTask=null;
function setup(){
 var defaults={quantizer_mode:1,register_mode:1,harmony_change:0,root_gravity:0,
  input_behavior:0,same_pitch:0,ensemble_group:0,ensemble_separation:0};
 for(var name in defaults){var object=this.patcher.getnamed(name);if(object)object.message('int',defaults[name]);}
 // Explicit commands also make the effective engine settings unambiguous.
 outlet(1,'mode','scale-nearest');outlet(1,'registermode','free');
 outlet(1,'timing','immediate');outlet(1,'inputbehavior','follow');
 outlet(1,'samepitch','legato');outlet(1,'ensemble',0);outlet(1,'separation',0);
 outlet(0,'validnotes',1,0,'midi',0,2,4,5,7,9,11);
 outlet(0,'chord',1,0,48,52,55,60);
}
function loadbang(){setupTask=new Task(setup,this);setupTask.schedule(1500);}
function notifydeleted(){if(setupTask)setupTask.cancel();}
