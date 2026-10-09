import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePortfolioFile,portfolioReadiness,PORTFOLIO_TYPES} from '../src/features/assessmentStudio/portfolioCore.js';
import {TWO_TIER_SAMPLE,TWO_TIER_POST_SAMPLE,validateTwoTierSetup,makeTwoTierRecord,twoTierBackup} from '../src/features/assessmentStudio/twoTierCore.js';
import {SAMPLE_QUESTIONS,validateDiagnosticConfig,scoreDiagnosticRecord,diagnosticBackup} from '../src/features/assessmentStudio/diagnosticCore.js';

const common={teacher:'Ms. A',className:'12.6',date:'2026-10-09'};
function twoTierData(demo=false){
 const meta={...common,title:'Two-Tier Assessment',objective:'Grammar reasoning'};
 const {meta:_,...config}=validateTwoTierSetup({meta,preRaw:TWO_TIER_SAMPLE,postRaw:TWO_TIER_POST_SAMPLE,repeat:false});
 return JSON.parse(twoTierBackup({
  meta,config,roster:[{code:'S01',name:'Nguyễn Văn A'}],
  records:[makeTwoTierRecord({code:'S01',phase:'pre',answers:'BA CA AA',config}),
           makeTwoTierRecord({code:'S01',phase:'post',answers:'BB CC CC',config})],
  adjustment:{finding:'Wrong rules',action:'Teach verb complements',implementedDate:'2026-10-10',
   evidence:'Lesson plan 12.6',comparability:'Same targets and count',reflection:'Compared same student'},
  demo
 }));
}
function diagnosticData(){
 const meta={...common,title:'DiagnosticScan',objective:'Gerund and infinitive'};
 const {meta:_,...config}=validateDiagnosticConfig({meta,preRaw:SAMPLE_QUESTIONS,postRaw:'',useSamePost:true});
 return JSON.parse(diagnosticBackup({
  meta,config,roster:[{code:'S01',name:'Nguyễn Văn A'}],
  records:[scoreDiagnosticRecord({code:'S01',phase:'pre',answers:'AAAAA',config}),
           scoreDiagnosticRecord({code:'S01',phase:'post',answers:'BCABC',config})],
  adjustment:{finding:'Infinitive errors',action:'Remedial practice',date:'2026-10-11',evidence:'Worksheet',
   reflection:'Better on follow-up',comparability:'Repeated questions may cause memory effect'},
  demo:false,revisions:[],draft:{preRaw:SAMPLE_QUESTIONS,postRaw:'',samePost:true}
 }));
}
test('two independent verified backup types produce a provisional complete portfolio',()=>{
 const one=validatePortfolioFile(twoTierData()),two=validatePortfolioFile(diagnosticData());
 assert.equal(one.type,'two-tier');
 assert.equal(two.type,'diagnostic');
 assert.equal(one.complete,true);
 assert.equal(two.complete,true);
 assert.equal(one.pairedCount,1);
 assert.equal(one.preAverage,0);
 assert.equal(one.postAverage,100);
 const summary=portfolioReadiness([one,two],{teacher:'Ms. A',term:'Học kỳ I',year:'2026–2027'});
 assert.equal(summary.complete,true);
 assert.equal(summary.eligibleCount,2);
 assert.equal(summary.distinctTypes,2);
 assert.equal(summary.hasInterventions,2);
});
test('one unique tool is insufficient for 3-point documentation checklist',()=>{
 const one=validatePortfolioFile(twoTierData());
 const summary=portfolioReadiness([one,one],{teacher:'Ms. A',term:'Học kỳ I',year:'2026–2027'});
 assert.equal(summary.complete,false);
 assert.equal(summary.distinctTypes,1);
});
test('DEMO and missing teacher identification cannot satisfy checks',()=>{
 const demo=validatePortfolioFile(twoTierData(true));
 const diagnostic=validatePortfolioFile(diagnosticData());
 assert.equal(demo.demo,true);
 assert.equal(demo.complete,false);
 assert.equal(portfolioReadiness([demo,diagnostic],{teacher:'Ms. A',term:'Học kỳ I',year:'2026–2027'}).complete,false);
 assert.equal(portfolioReadiness([validatePortfolioFile(twoTierData()),diagnostic],{teacher:'',term:'Học kỳ I',year:'2026–2027'}).complete,false);
});
test('invalid imported marks or incompatible file are rejected rather than counted',()=>{
 const forged=diagnosticData();
 forged.records[0].score=99;
 assert.throws(()=>validatePortfolioFile(forged),/thay đổi/);
 assert.throws(()=>validatePortfolioFile({format:'UNKNOWN'}),/Không nhận dạng/);
});
test('normalized portfolio never retains pupil names or individual answers',()=>{
 const summary=validatePortfolioFile(twoTierData());
 assert.doesNotMatch(JSON.stringify(summary),/Nguyễn Văn A/);
 assert.equal('roster' in summary,false);
 assert.equal('records' in summary,false);
 assert.equal(Object.keys(PORTFOLIO_TYPES).length,4);
});
test('Evidence Portfolio UI is lazy-loaded inside existing BRIAN launcher without AI',()=>{
 const main=readFileSync(new URL('../src/pages/AssessmentPreview.jsx',import.meta.url),'utf8');
 const core=readFileSync(new URL('../src/features/assessmentStudio/portfolioCore.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/features/assessmentStudio/EvidencePortfolio.jsx',import.meta.url),'utf8');
 assert.match(main,/EvidencePortfolio = lazy/);
 assert.match(main,/Hồ sơ minh chứng/);
 assert.match(ui,/BRIAN_EVIDENCE_PORTFOLIO/);
 assert.doesNotMatch(core+ui,/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|gemini|openrouter|supabase/i);
});
