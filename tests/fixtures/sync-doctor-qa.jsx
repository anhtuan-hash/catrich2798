// Never compiled into the Production Vite entrypoint. No real sessions or credentials.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import SyncDoctor from '../../src/pages/SyncDoctor.jsx';

const fixtureUsers={
  admin:{id:'11111111-1111-4111-8111-111111111111',role:'admin'},
  head:{id:'22222222-2222-4222-8222-222222222222',role:'department_head'},
  teacher:{id:'33333333-3333-4333-8333-333333333333',role:'teacher'},
  guest:null
};
function Fixture(){
  const [role,setRole]=useState('admin');
  const [language,setLanguage]=useState('vi');
  return <>
    <header className="qa-toolbar" aria-label="Synthetic account controls">
      {Object.keys(fixtureUsers).map(r=><button key={r} type="button"
        data-testid={'role-'+r} aria-pressed={role===r} onClick={()=>setRole(r)}>{r}</button>)}
      <button type="button" data-testid="change-language" onClick={()=>setLanguage(l=>l==='vi'?'en':'vi')}>
        {language==='vi'?'English':'Tiếng Việt'}
      </button>
    </header>
    <SyncDoctor currentUser={fixtureUsers[role]} language={language}/>
  </>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
