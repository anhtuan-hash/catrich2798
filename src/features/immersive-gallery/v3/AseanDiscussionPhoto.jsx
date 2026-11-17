import React,{useState} from 'react';
import './AseanDiscussionPhoto.css';

const imageUrl='https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Ngo_Mon.jpg/960px-Ngo_Mon.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org';
const sourceUrl='https://commons.wikimedia.org/wiki/File:Ngo_Mon.jpg';
const t=(language,vi,en)=>language==='en'?en:vi;

export default function AseanDiscussionPhoto({language,fallback,imageSource=imageUrl}){
 const [unavailable,setUnavailable]=useState(false);
 return <figure className="asean-discussion-photo" data-testid="asean-discussion-photo" lang={language}>
  {unavailable&&fallback?fallback:<img src={imageSource} width="960" height="317" decoding="async" loading="lazy" referrerPolicy="no-referrer" onError={fallback?()=>setUnavailable(true):undefined}
   alt={t(language,'Ngọ Môn nhìn từ quảng trường trước Hoàng thành Huế','The Meridian Gate seen from the square in front of Huế Imperial City')}/>}
  <figcaption>
   <a href={sourceUrl} target="_blank" rel="noreferrer">{t(language,'Ngọ Môn, Huế','Meridian Gate, Huế')}</a>
   {' · '}{t(language,'Ảnh Lưu Ly · Wikimedia Commons','Photo by Lưu Ly · Wikimedia Commons')}
   {imageSource!==imageUrl&&<> {' · '}<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>
    {' · '}{t(language,'Cắt khung khi hiển thị','Cropped for display')}</>}
  </figcaption>
 </figure>;
}
