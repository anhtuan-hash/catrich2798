import fs from 'node:fs';
const required=['src/config/version.js','src/pages/LessonArchitect.jsx','src/components/LessonArchitectCurriculumBuilder.jsx','src/utils/lessonArchitectCurriculum.js','src/styles/v1131.css','api/public-reference-text.js','public/version.json','public/release-manifest.json'];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.3.1'||version.version!=='11.3.1'||version.runtimeCore!=='2.3.1'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
const source=fs.readFileSync('src/utils/lessonArchitectCurriculum.js','utf8');
for(const marker of ['LESSON PLAN','I. OBJECTIVES','WORKSHEET','Answer key:','Circular No. 02/2025/TT-BGDĐT','validateEnglishLessonOutput','downloadLessonZip']){if(!source.includes(marker)){console.error(`✗ missing English lesson marker: ${marker}`);failed++;}}
if(/subject:\s*'Tin học'|bookSeries:\s*'Kết nối tri thức'|firstLessonTitle:\s*'Hệ điều hành'/.test(source)){console.error('✗ obsolete Informatics preset remains');failed++;}else console.log('✓ obsolete Informatics preset removed');
if(failed) process.exit(1);
console.log('V11.3.1 release guard passed.');
