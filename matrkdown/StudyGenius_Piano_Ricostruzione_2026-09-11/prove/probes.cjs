const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || path.join(__dirname, 'repository/StudyGenius'));
const crypto = require('node:crypto');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-manifest.json'), 'utf8'));
const expected = new Map(manifest.files.map(f => [f.path, f.sha256]));
const quiet = {log(){},warn(){},error(){}};
function load(rel, mocks = {}) {
  const filename = path.join(root, rel);
  const sandbox = {module:{exports:{}}, console:quiet, Buffer, setTimeout, clearTimeout, __dirname:path.dirname(filename)};
  sandbox.require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (['path','os','crypto','assert'].includes(name)) return require(name);
    if (name === 'fs-extra') return {existsSync:()=>false};
    if (name === 'child_process') return {execSync:()=>{throw new Error('Process execution disabled in audit');}};
    throw new Error('Unmocked dependency: '+name);
  };
  const bytes = fs.readFileSync(filename);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected.get('StudyGenius/' + rel), 'Source differs from audited snapshot: ' + rel);
  vm.createContext(sandbox);
  vm.runInContext(bytes.toString('utf8'), sandbox, {filename,timeout:3000});
  return {api:sandbox.module.exports, sandbox};
}
async function main() {
  const results=[];
  const prompt = load('src/services/promptService.js', {
    '../config':{PROMPTS_DIR:'/unused',PREFERENCES_FILE:'/unused'},
    '../core/promptCompiler':{PromptCompiler:class {}},
    '../config/subjects':{getDefaultGenericPrompt:()=>''}
  }).api;
  const missing=['getUserPreferences','saveUserPreferences','saveCustomPrompt','getDefaultGenericPrompt'].filter(k=>typeof prompt[k]!=='function');
  assert.equal(missing.length,4);results.push({id:'P01',observation:'Four imports used by configRoutes are absent from promptService exports',missing});
  const diagram=load('src/rendering/diagramEngine.js');
  const ln=diagram.api.safeEvaluateMath('ln(e)',1);
  assert.equal(ln,0);results.push({id:'P02',expression:'ln(e)',expected:1,actual:ln});
  const div=diagram.api.safeEvaluateMath('1/x',0);
  assert.equal(div,0);results.push({id:'P03',expression:'1/x at x=0',expected:'undefined / gap',actual:div});
  diagram.api.safeEvaluateMath('(globalThis.auditMarker=7,1)',0);
  assert.equal(diagram.sandbox.auditMarker,7);results.push({id:'P04',observation:'Expression changed a harmless VM global marker; evaluator does not isolate expressions',actual:7});
  const coverage=load('src/core/coverageMatrix.js').api.evaluateCoverage({chapters:[{chapterId:'c1',requiredNodes:['n1']}]},{nodes:[{id:'n1',label:'Gauss'}]},'Gauss');
  assert.equal(coverage.chapters[0].items[0].verified,true);results.push({id:'P05',input:'Gauss (only a label, no explanation)',verified:coverage.chapters[0].items[0].verified,coverage:coverage.overallCoverage});
  // The real schemas module has an independently confirmed syntax error.
  // Stub only initial validation to probe transitionPhase in isolation.
  const schemas={validateJobState:()=>({valid:true})};
  const jobs=load('src/core/jobState.js',{'./schemas':schemas}).api;
  const job=jobs.initJobState('audit','Fisica');jobs.transitionPhase(job,'NON_EXISTENT_PHASE');
  assert.equal(job.currentPhase,'NON_EXISTENT_PHASE');results.push({id:'P06',observation:'State transition accepts a phase outside PHASES',actual:job.currentPhase});
  const {AcademicCritics}=load('src/verification/critics.js').api;
  const critic=new AcademicCritics({},async()=>({choices:[{message:{content:JSON.stringify({passed:false,truthScore:0,issues:['incorrect formula']})}}]}));
  const report=await critic.runFullCriticAudit('Sample educational text. '.repeat(40));
  assert.equal(report.mathCritic.passed,true);results.push({id:'P07',providerResponse:{passed:false,truthScore:0,issues:['incorrect formula']},applicationReport:report});
  const ledger=load('src/core/visualLedger.js').api;
  ledger.getDefaultLedger().detect('v1',{required:true});ledger.getDefaultLedger().accept('v1');
  const before=ledger.getDefaultLedger().getAll().length;ledger.resetDefaultLedger();const after=ledger.getDefaultLedger().getAll().length;
  assert.equal(before,1);assert.equal(after,0);results.push({id:'P08',observation:'Same reset then get sequence used by orchestrator clears previous visual records',before,after});
  let fail=false;
  const loop=load('src/rendering/visualFeedbackLoop.js',{
    sharp:()=>({png:()=>({toBuffer:async()=>Buffer.from('mock-png')})}),puppeteer:{},
    './svgSanitizer':{sanitizeSvg:s=>({svg:s,safe:true})},
    './svgGeometryAnalyzer':{analyzeSvgGeometry:async()=>({collisionCount:0,clippingCount:0,elementsCount:1,collisions:[],clippings:[]})},
    './svgPatchEngine':{applyStructuredPatches:()=>{throw new Error('No patches expected');}},
    './visualGroundTruth':{createVisualGroundTruth:o=>o,inferGroundTruthFromContext:()=>({visualId:'v1'})},
    '../prompts/visualCriticPrompts':{buildSemanticReviewerPrompt:()=>'',buildBlindExaminerPrompt:()=>''},
    '../services/googleAIStudioAccessManager':{defaultAccessManager:{getBestAvailableModel:()=> 'mock-model'}},
    '../services/aiService':{callGeminiRole:async()=>{if(fail) throw new Error('simulated network failure');return {text:JSON.stringify({scores:{scientificAccuracy:100,semanticClarity:100,readability:100},criticalIssuesCount:1,majorIssuesCount:0,issues:[]})};}},
    '../config':{VISUAL_QA_CONFIG:{mode:'standard',maxMicroRepairs:3}}
  }).api;
  const optimized=await loop.optimizeDiagram('<svg/>',{visualId:'v1',diagramType:'concept_map'},{mode:'standard'});
  assert.equal(optimized.passed,true);results.push({id:'P09',observation:'One critical issue remains but optimizer returns passed=true via bestCandidate score',criticalIssues:1,passed:optimized.passed,score:optimized.overallScore});
  fail=true;const blind=await loop.runBlindFinalReview(Buffer.from('mock-png'),{visualId:'v1'});
  assert.equal(blind.approved,true);results.push({id:'P10',observation:'Network failure in final visual review yields approval',...blind});
  const output={scope:'Isolated probes of unchanged repository modules; I/O and external providers mocked; no external API calls',node:process.version,results};
  fs.writeFileSync(path.join(__dirname,'probe-results-reproduced.json'),JSON.stringify(output,null,2));
  console.log(JSON.stringify(output,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
