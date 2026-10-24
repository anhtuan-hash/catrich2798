import React from 'react';
import { createRoot } from 'react-dom/client';
import FocusSceneEditor from '../../src/components/BrianFocus/FocusSceneEditor.jsx';
const ID='dQw4w9WgXcQ';
const scene={
  mediaType:'youtube',mediaPath:'youtube:'+ID,
  youtubeUrl:'https://www.youtube.com/watch?v='+ID,
  dimPercent:20,mediaFit:'cover',updatedAt:'2026-10-24',
};
createRoot(document.querySelector('#root')).render(
  <FocusSceneEditor language="vi" currentUser={{id:'test',role:'admin',provider:'supabase'}}
    scene={scene} onClose={()=>{}} onPublished={()=>{}}/>
);
