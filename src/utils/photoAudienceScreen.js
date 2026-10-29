// Only QRvote's official public big-screen URLs can be embedded.
export const DEFAULT_HALLOWEEN_SCREEN='https://qrvote.org/c/halloween-showcase-ry29/screen';
export const HALLOWEEN_ALBUM_ID='e1fc3295-2c5d-4e05-8538-b9a7aeef5a67';

export function normalizeAudienceScreenUrl(value) {
  const input=String(value??'').trim();
  if (!input || input.length>500) throw new Error('Hãy nhập đường link QRvote hợp lệ (tối đa 500 ký tự).');
  const candidate=/^https?:\/\//i.test(input)?input:'https://'+input;
  let url;
  try{url=new URL(candidate);}catch{throw new Error('Đường link không hợp lệ.');}
  if(url.protocol!=='https:' || !['qrvote.org','www.qrvote.org'].includes(url.hostname) ||
      url.username || url.password || (url.port && url.port!=='443')) {
    throw new Error('Chỉ cho phép đường link công khai https://qrvote.org.');
  }
  const match=url.pathname.match(/^\/c\/([a-z0-9-]+)(?:\/screen)?\/?$/i);
  if(!match) throw new Error('Hãy dán link cuộc bình chọn QRvote hoặc link /screen.');
  return 'https://qrvote.org/c/'+match[1].toLowerCase()+'/screen';
}
