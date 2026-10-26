import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BrianInstantTools from '../../src/components/BrianInstantTools/BrianInstantTools.jsx';
function Fixture(){
  const [language,setLanguage]=useState('vi');
  const [user,setUser]=useState('teacher-a');
  return <>
    <nav id="fixture-controls">
      <button type="button" data-testid="lang" onClick={()=>setLanguage(x=>x==='vi'?'en':'vi')}>{language==='vi'?'EN':'VI'}</button>
      <button type="button" data-testid="user" onClick={()=>setUser(x=>x==='teacher-a'?'teacher-b':'teacher-a')}>Switch account</button>
    </nav>
    <BrianInstantTools key={user} currentUser={{id:user,role:'teacher'}} language={language}/>
  </>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
