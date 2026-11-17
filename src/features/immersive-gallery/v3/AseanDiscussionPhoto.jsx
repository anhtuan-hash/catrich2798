import React from 'react';
import './AseanDiscussionPhoto.css';

const imageUrl='https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Ngo_Mon.jpg/960px-Ngo_Mon.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org';
const sourceUrl='https://commons.wikimedia.org/wiki/File:Ngo_Mon.jpg';
const t=(language,vi,en)=>language==='en'?en:vi;

export default function AseanDiscussionPhoto({language}){
 return <figure className="asean-discussion-photo" data-testid="asean-discussion-photo" lang={language}>
  <img src={imageUrl} width="960" height="317" decoding="async" loading="lazy" referrerPolicy="no-referrer"
   alt={t(language,'Ngọ Môn nhìn từ quảng trường trước Hoàng thành Huế','The Meridian Gate seen from the square in front of Huế Imperial City')}/>
  <figcaption>
   <a href={sourceUrl} target="_blank" rel="noreferrer">{t(language,'Ngọ Môn, Huế','Meridian Gate, Huế')}</a>
   {' · '}{t(language,'Ảnh Lưu Ly · Wikimedia Commons','Photo by Lưu Ly · Wikimedia Commons')}
  </figcaption>
 </figure>;
}
