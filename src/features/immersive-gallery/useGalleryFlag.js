import {useEffect,useState} from 'react';
import {getGalleryEnabled} from './galleryData.js';
export const GALLERY_FLAG_EVENT='bes-gallery-flag-changed';
// Fail closed: while loading or if SQL is not installed, Gallery stays hidden.
export function useGalleryFlag(user) {
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{
  let alive=true;
  const refresh=()=>getGalleryEnabled().then(value=>{if(alive)setEnabled(value===true);}).catch(()=>{if(alive)setEnabled(false);});
  if(!user?.id){setEnabled(false);return undefined;}
  refresh();window.addEventListener(GALLERY_FLAG_EVENT,refresh);
  return ()=>{alive=false;window.removeEventListener(GALLERY_FLAG_EVENT,refresh);};
 },[user?.id]);
 return enabled;
}
