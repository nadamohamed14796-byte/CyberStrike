export type ApiSource={endpoint:string;method:string;source:"swagger"|"js"|"observed"}

export function diffApiSources(items:ApiSource[]){
  const grouped=new Map<string,ApiSource[]>()
  for(const item of items){
    const endpoint=item.endpoint
    const values=grouped.get(endpoint)??[]
    values.push({...item,method:item.method.toUpperCase()})
    grouped.set(endpoint,values)
  }

  const signals:string[]=[]
  for(const [endpoint,values] of grouped){
    const documented=values.filter(item=>item.source==="swagger")
    const javascript=values.filter(item=>item.source==="js")
    const observed=values.filter(item=>item.source==="observed")

    if(javascript.some(item=>!documented.some(spec=>spec.method===item.method))){
      signals.push("JS_ONLY_ENDPOINT:"+endpoint)
    }
    if(observed.some(item=>!documented.some(spec=>spec.method===item.method))){
      signals.push("OBSERVED_ONLY_ENDPOINT:"+endpoint)
    }

    const methods=new Set(values.map(item=>item.method))
    if(methods.size>1)signals.push("METHOD_MISMATCH:"+endpoint)
  }
  return [...new Set(signals)]
}
