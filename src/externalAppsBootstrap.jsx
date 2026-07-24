import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import ExternalAppsIntegration from './components/ExternalAppsIntegration.jsx';
import {initializeAuthSession,subscribeToAuthChanges} from './utils/auth.js';
function Bootstrap(){const[user,setUser]=useState(null),[language,setLanguage]=useState(()=>localStorage.getItem('bet-language')||'vi');useEffect(()=>{let active=true;initializeAuthSession().then(u=>active&&setUser(u)).catch(()=>{});const un=subscribeToAuthChanges(u=>active&&setUser(u));const o=new MutationObserver(()=>setLanguage(document.documentElement.lang==='en'?'en':'vi'));o.observe(document.documentElement,{attributes:true,attributeFilter:['lang','data-language']});return()=>{active=false;un?.();o.disconnect();};},[]);return <ExternalAppsIntegration currentUser={user} language={language}/>;}
const host=document.createElement('div');host.id='bes-external-apps-root';document.body.appendChild(host);createRoot(host).render(<Bootstrap/>);
