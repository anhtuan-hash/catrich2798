import React from 'react';
// An optional 3D scene must never unmount Brian's Gallery, editor, or 2D exhibit list.
export default class GalleryRenderBoundary extends React.Component {
 constructor(props){super(props);this.state={error:null};}
 static getDerivedStateFromError(error){return{error:String(error?.message||error)};}
 componentDidCatch(error,info){console.warn('[Gallery WebGL error isolated]',error?.message||error,info?.componentStack?.slice(0,200));}
 render(){
  if(!this.state.error)return this.props.children;
  const vi=this.props.language!=='en';
  return <section role="alert" className="big-canvas-error" style={{minHeight:190,position:'relative',borderRadius:12}}>
   <h3>{vi?'Không thể mở phòng 3D':'3D room unavailable'}</h3>
   <p>{vi?'Bạn vẫn có thể xem hiện vật ở danh sách 2D.':'The accessible 2D exhibit list remains available.'}</p>
   {this.props.onFallback?<button type="button" onClick={this.props.onFallback}>{vi?'Xem danh sách 2D':'Open 2D list'}</button>:null}
  </section>;
 }
}
