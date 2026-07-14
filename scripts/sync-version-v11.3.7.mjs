import fs from 'node:fs';
const version='11.3.7';
const generatedAt=new Date().toISOString();
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,{
  version,
  releaseName:'Animated Home App Constellation',
  runtimeCore:'2.3.7',
  schemaVersion:'11.3.5',
  requiresSql:false,
  requiredMigration:null,
  animatedHomeAppConstellation:true,
  pointerParallaxCards:true,
  homepageMotionPaths:true,
  expandedEnglishSkillCards:true,
  listeningLab:true,
  grammarBuilder:true,
  writingStudio:true,
  pronunciationCoach:true,
  generatedAt,
});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,{
  version,
  release:'Animated Home App Constellation',
  runtime:'2.3.7',
  schema:'11.3.5',
  requiresSql:false,
  requiredMigration:null,
  animatedHomeAppConstellation:true,
  pointerParallaxCards:true,
  homepageMotionPaths:true,
  expandedEnglishSkillCards:true,
  listeningLab:true,
  grammarBuilder:true,
  writingStudio:true,
  pronunciationCoach:true,
  generatedAt,
});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
