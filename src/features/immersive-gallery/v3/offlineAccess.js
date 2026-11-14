// Set only by the self-contained offline entry point. Online authorization
// remains entirely on the server; this adapter never grants server access.
let runtime=null;
export const getMuseumOffline=()=>runtime;
export function installMuseumOffline(value){
 if(runtime)throw new Error('An offline archive is already open.');
 runtime=value;
}
