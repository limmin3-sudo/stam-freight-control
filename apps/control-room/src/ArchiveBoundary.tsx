import {Component,type ReactNode} from 'react';
// A failed optional page bundle must leave the surrounding navigation usable.
export class ArchiveBoundary extends Component<{en:boolean;children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="archive-load-state" role="alert"><p>{this.props.en?'The reference page could not open. Please reload.':'자료 화면을 열지 못했습니다. 새로고침해서 다시 시도해 주세요.'}</p><button type="button" onClick={()=>location.reload()}>{this.props.en?'Reload':'새로고침'}</button></div>:this.props.children;}
}
