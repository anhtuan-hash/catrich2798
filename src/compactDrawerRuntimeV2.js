/*
 * Brian English — Compact Drawer Runtime V2
 * Covers named drawers/modals plus legacy portal overlays whose inner panel has
 * no conventional class name. Scans only changed subtrees after first boot.
 */

const STYLE_ID = 'bes-compact-drawer-v2-style';
const SHADOW_STYLE_ATTR = 'data-bes-compact-drawer-v2-style';
const INSTALL_FLAG = '__BES_COMPACT_DRAWER_RUNTIME_V2__';
const observedRoots = new WeakSet();
const queuedRoots = new Set();
let frame = 0;

const SHELL_SELECTOR = [
  'dialog',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '.launcher-link-form',
  '.launcher-link-manager',
  '.shared-chatbot-drawer-v1167',
  '.android-detail-panel',
  '[class$="-drawer"]','[class*="-drawer "]',
  '[class$="-sheet"]','[class*="-sheet "]',
  '[class$="-dialog"]','[class*="-dialog "]',
  '[class$="-modal"]','[class*="-modal "]',
].join(',');

const BACKDROP_SELECTOR = [
  '[class$="-backdrop"]','[class*="-backdrop "]',
  '[class$="-scrim"]','[class*="-scrim "]',
  '[class$="-overlay"]','[class*="-overlay "]',
  '[data-modal-backdrop]','[data-dialog-backdrop]',
].join(',');

const SKIP_SELECTOR = [
  '[data-bes-compact-drawer="off"]',
  '[data-bes-drawer-size="wide"]','[data-bes-drawer-size="full"]',
  '[data-bes-modal-size="wide"]','[data-bes-modal-size="full"]',
  '.fullscreen','.full-screen','.is-fullscreen',
  '.wide-modal','.wide-dialog','.modal-full','.dialog-full',
].join(',');

const css = `
:where(.bes-compact-overlay){
  --bes-cd-width:600px;
  --bes-cd-side-width:440px;
  --bes-cd-pad-x:17px;
  --bes-cd-control-h:43px;
  box-sizing:border-box!important;
  width:min(var(--bes-cd-width),calc(100vw - 32px))!important;
  max-width:min(var(--bes-cd-width),calc(100vw - 32px))!important;
  max-height:min(730px,86dvh)!important;
  border-radius:17px!important;
  overscroll-behavior:contain!important;
}
:where(.bes-compact-overlay:not(.bes-compact-side-drawer)){overflow:auto!important}
:where(.bes-compact-overlay.bes-compact-side-drawer){
  --bes-cd-width:var(--bes-cd-side-width);
  width:min(var(--bes-cd-side-width),calc(100vw - 20px))!important;
  max-width:min(var(--bes-cd-side-width),calc(100vw - 20px))!important;
  max-height:calc(100dvh - 20px)!important;
}
:where(.bes-compact-overlay-header){padding:13px var(--bes-cd-pad-x)!important;gap:10px!important}
:where(.bes-compact-overlay-body){padding:14px var(--bes-cd-pad-x)!important;gap:12px!important;overflow:auto!important;overscroll-behavior:contain!important}
:where(.bes-compact-overlay-footer){padding:10px var(--bes-cd-pad-x) 12px!important;gap:8px!important}
:where(.bes-compact-overlay-header) :where(h1,h2,h3,[class$="-title"],[class*="-title "]){
  margin-block:0!important;font-size:clamp(1.22rem,1.8vw,1.46rem)!important;line-height:1.17!important;letter-spacing:-.024em!important
}
:where(.bes-compact-overlay-header) :where(p,small,[class$="-subtitle"],[class*="-subtitle "]){
  margin-block:.15rem 0!important;font-size:.86rem!important;line-height:1.38!important
}
:where(.bes-compact-overlay) :where(
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]),select
){
  min-height:var(--bes-cd-control-h)!important;height:auto!important;padding:8px 11px!important;border-radius:10px!important;font-size:.94rem!important;line-height:1.34!important
}
:where(.bes-compact-overlay) textarea{min-height:78px!important;padding:9px 11px!important;border-radius:10px!important;font-size:.94rem!important;line-height:1.4!important}
:where(.bes-compact-overlay) :where(label,[class$="-field"]>span,[class*="-field "]>span,[class$="-label"],[class*="-label "]){font-size:.88rem!important;line-height:1.28!important}
:where(.bes-compact-overlay) :where([class$="-field"],[class*="-field "]){gap:5px!important}
:where(.bes-compact-overlay) :where(button,[role="button"]){min-height:39px!important}
:where(.bes-compact-overlay) :where([class$="-close"],[class*="-close "],button[aria-label*="close" i],button[aria-label*="đóng" i]){
  width:35px!important;min-width:35px!important;height:35px!important;min-height:35px!important;padding:0!important;border-radius:10px!important
}

/* Teaching Tool Hub linked-site editor */
:where(.bes-compact-overlay.launcher-link-form,.bes-compact-overlay.launcher-link-manager){
  width:min(600px,calc(100vw - 32px))!important;max-width:min(600px,calc(100vw - 32px))!important;max-height:min(700px,86dvh)!important
}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-header{padding:14px 17px 12px!important}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-content{grid-template-columns:minmax(0,1fr) 175px!important;gap:13px!important;padding:14px 17px!important}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-fields{gap:10px!important}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-field{gap:5px!important}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-field input{min-height:43px!important;padding:8px 11px!important}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-preview{gap:7px!important;padding:11px!important;border-radius:14px!important}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-note{margin:0 17px 11px!important;padding:8px 10px!important}
:where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-footer{padding:10px 17px 12px!important}

:where(.shared-chatbot-drawer-v1167.bes-compact-side-drawer,.android-detail-panel.bes-compact-side-drawer){
  width:min(440px,calc(100vw - 20px))!important;max-width:min(440px,calc(100vw - 20px))!important
}

@media(max-width:699px){
  :where(.bes-compact-overlay){--bes-cd-pad-x:13px;--bes-cd-control-h:42px;width:calc(100vw - 14px)!important;max-width:calc(100vw - 14px)!important;max-height:calc(100dvh - 14px)!important;border-radius:15px!important}
  :where(.bes-compact-overlay.bes-compact-side-drawer){width:calc(100vw - 10px)!important;max-width:calc(100vw - 10px)!important;max-height:calc(100dvh - 10px)!important}
  :where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-content{grid-template-columns:minmax(0,1fr)!important}
  :where(.bes-compact-overlay.launcher-link-form) .launcher-link-form-preview{display:none!important}
}
`;

function classText(element){return typeof element?.className==='string'?element.className:''}

function skipped(element){
  return Boolean(element?.matches?.(SKIP_SELECTOR)||element?.closest?.('[data-bes-compact-drawer="off"]'));
}

function looksViewportBackdrop(element){
  if(!(element instanceof HTMLElement))return false;
  const style=getComputedStyle(element);
  if(style.position!=='fixed')return false;
  const rect=element.getBoundingClientRect();
  return rect.width>=window.innerWidth*.9&&rect.height>=window.innerHeight*.86;
}

function markSection(element,type){
  if(element instanceof HTMLElement&&!element.classList.contains(`bes-compact-overlay-${type}`))element.classList.add(`bes-compact-overlay-${type}`);
}

function markDirectSections(shell){
  Array.from(shell.children||[]).forEach((child)=>{
    const token=`${child.tagName||''} ${classText(child)}`.toLowerCase();
    if(/\b(header|heading|head)\b|[-_](header|heading|head)(?:[-_\s]|$)/.test(token))markSection(child,'header');
    else if(/\b(footer)\b|[-_]footer(?:[-_\s]|$)/.test(token))markSection(child,'footer');
    else if(/\b(body|content|main|scroll|log|messages|fields|form-content)\b|[-_](body|content|main|scroll|log|messages|fields|form-content)(?:[-_\s]|$)/.test(token))markSection(child,'body');
  });
  shell.querySelectorAll?.('.launcher-link-form-header').forEach((node)=>markSection(node,'header'));
  shell.querySelectorAll?.('.launcher-link-form-content').forEach((node)=>markSection(node,'body'));
  shell.querySelectorAll?.('.launcher-link-form-footer').forEach((node)=>markSection(node,'footer'));
}

function applyCompactClass(shell,{force=false}={}){
  if(!(shell instanceof HTMLElement)||skipped(shell))return;
  if(!force&&!shell.matches?.(SHELL_SELECTOR))return;
  if(looksViewportBackdrop(shell)&&Array.from(shell.children||[]).some((child)=>child.matches?.(SHELL_SELECTOR)))return;

  if(!shell.classList.contains('bes-compact-overlay'))shell.classList.add('bes-compact-overlay');
  const token=`${classText(shell)} ${shell.getAttribute('data-variant')||''}`;
  const side=/(^|[-_\s])(drawer|sheet)([-_\s]|$)|shared-chatbot-drawer|android-detail-panel/i.test(token);
  shell.classList.toggle('bes-compact-side-drawer',side);
  markDirectSections(shell);
}

function boundedBackdropChild(backdrop){
  if(!looksViewportBackdrop(backdrop)||skipped(backdrop))return null;
  const visibleChildren=Array.from(backdrop.children||[]).filter((child)=>{
    if(!(child instanceof HTMLElement))return false;
    const style=getComputedStyle(child);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;
    const rect=child.getBoundingClientRect();
    return rect.width>=300&&rect.width<=Math.min(900,window.innerWidth*.86)&&rect.height>=140&&rect.height<=window.innerHeight*.94;
  });
  if(visibleChildren.length!==1)return null;
  return visibleChildren[0];
}

function classifyBackdrop(backdrop){
  if(!(backdrop instanceof HTMLElement)||!backdrop.matches?.(BACKDROP_SELECTOR))return;
  const child=boundedBackdropChild(backdrop);
  if(child)applyCompactClass(child,{force:true});
}

function ensureDocumentStyle(){
  let style=document.getElementById(STYLE_ID);
  if(!style){style=document.createElement('style');style.id=STYLE_ID;style.textContent=css}
  if(document.head?.lastElementChild!==style)document.head?.append(style);
}

function ensureShadowStyle(root){
  if(!(root instanceof ShadowRoot))return;
  let style=root.querySelector(`style[${SHADOW_STYLE_ATTR}]`);
  if(!style){style=document.createElement('style');style.setAttribute(SHADOW_STYLE_ATTR,'true');style.textContent=css;root.append(style)}
  else if(root.lastElementChild!==style)root.append(style);
}

function scan(root){
  if(!root)return;
  if(root instanceof Document)ensureDocumentStyle();
  if(root instanceof ShadowRoot)ensureShadowStyle(root);

  const queryRoot=root instanceof Document||root instanceof ShadowRoot||root instanceof Element?root:null;
  if(!queryRoot?.querySelectorAll)return;
  if(root instanceof HTMLElement){applyCompactClass(root);classifyBackdrop(root)}
  queryRoot.querySelectorAll(SHELL_SELECTOR).forEach((node)=>applyCompactClass(node));
  queryRoot.querySelectorAll(BACKDROP_SELECTOR).forEach((node)=>classifyBackdrop(node));
  queryRoot.querySelectorAll('*').forEach((node)=>{
    if(node.shadowRoot){observe(node.shadowRoot);scan(node.shadowRoot)}
  });
}

function flush(){
  frame=0;
  const roots=Array.from(queuedRoots);queuedRoots.clear();
  roots.forEach((root)=>{try{scan(root)}catch(error){console.warn('[CompactDrawerV2] scan skipped',error)}});
}

function schedule(root=document){
  queuedRoots.add(root||document);
  if(frame)return;
  frame=requestAnimationFrame(flush);
}

function observe(root){
  if(!root||observedRoots.has(root))return;
  observedRoots.add(root);
  const observer=new MutationObserver((records)=>{
    records.forEach((record)=>{
      if(record.type==='attributes'){schedule(record.target);return}
      record.addedNodes.forEach((node)=>{if(node.nodeType===Node.ELEMENT_NODE)schedule(node)});
    });
  });
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','open','aria-modal','role']});
}

export function installCompactDrawerRuntimeV2(){
  if(typeof window==='undefined'||window[INSTALL_FLAG])return;
  window[INSTALL_FLAG]=true;
  const start=()=>{ensureDocumentStyle();observe(document.documentElement);schedule(document)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('hashchange',()=>schedule(document));
  window.addEventListener('resize',()=>schedule(document),{passive:true});
  window.addEventListener('load',()=>schedule(document),{once:true});
  window.addEventListener('bes:appearance-changed',()=>schedule(document));
  window.BESCompactDrawer=Object.freeze({version:2,rescan:()=>schedule(document),maxModalWidth:600,maxSideDrawerWidth:440});
}

installCompactDrawerRuntimeV2();
