import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import '../../src/styles/v1093.css';
import '../../src/styles/v1095.css';
import '../../src/styles/v1096.css';
import '../../src/styles/v1097.css';
import '../../src/styles/v1098.css';
import '../../src/styles/v1099.css';
import '../../src/styles/v1120.css';
import '../../src/styles/v1131.css';
import '../../src/styles/v1132.css';
import '../../src/styles/v1133.css';
import '../../src/styles/v1136.css';
import '../../src/styles/v1137.css';
import '../../src/styles/v1154.css';
import '../../src/styles/v1158.css';
import '../../src/styles/v1159.css';
import '../../src/styles/GlobalMotionSystem.css';
import '../../src/styles/GlobalFontSystem.css';
import '../../src/styles/GlobalRegionalFontSystem.css';
import '../../src/styles/GlobalOuterHorizontalAlignment.css';
import '../../src/styles/ThreeFloatingActions.css';
import '../../src/styles/UnifiedBubbleMotion.css';
import '../../src/styles/BrianFloatingGlow.css';
import Footer from '../../src/components/Footer.jsx';
import MuseumLabApp from '../../src/features/immersive-gallery/v3/MuseumLabApp.jsx';
const data={profile:{id:'qa',role:'admin'},creatorSettings:{enabled:false},assignments:[
{id:'qa-1',title:'Our Climate Action Museum',class_scope:'11.4',deadline_at:'2026-11-19T17:00:00Z'}
],groups:[{id:'qa-g1',assignment_id:'qa-1',state:'submitted'},{id:'qa-g2',assignment_id:'qa-1',state:'editing'}],reviews:[]};
const transport=async()=>data;
createRoot(document.getElementById('root')).render(<div className="app-shell metro-shell metro-clean-system" data-route="tool" data-tool="immersive-gallery">
<div style={{padding:8,background:'white',textAlign:'center'}} data-testid="qa-harness">QA ONLY · SYNTHETIC LESSON DATA</div>
<MuseumLabApp currentUser={{id:'qa',name:'QA'}} transport={transport}/><Footer language="vi" route="tool"/>
</div>);
