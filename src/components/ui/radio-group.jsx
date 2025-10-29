import React, { createContext, useContext } from 'react'
const Ctx = createContext(null)
export function RadioGroup({ value, onValueChange, children }){
  return <Ctx.Provider value={{value, onValueChange}}><div role="radiogroup" className="space-y-2">{children}</div></Ctx.Provider>
}
export function RadioGroupItem({ value, id, children }){
  const ctx = useContext(Ctx)
  const checked = ctx?.value === value
  return <div className="flex items-center gap-2">
    <input id={id||value} type="radio" checked={checked} onChange={() => ctx?.onValueChange?.(value)} className="h-4 w-4 text-red-600" />
    <label htmlFor={id||value} className="text-sm">{children}</label>
  </div>
}
export default { RadioGroup, RadioGroupItem }
