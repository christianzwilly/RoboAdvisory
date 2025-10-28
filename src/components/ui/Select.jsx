import React from 'react'
export function Select({ value, onValueChange, children, className='' }){
  return <select value={value} onChange={e=>onValueChange?.(e.target.value)} className={["w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none", className].join(' ')}>{children}</select>
}
export function SelectTrigger({ children, ...props }){ return <div {...props}>{children}</div> }
export function SelectContent({ children, ...props }){ return <div {...props}>{children}</div> }
export function SelectValue({ children }){ return <>{children}</> }
export function SelectItem({ value, children }){ return <option value={value}>{children}</option> }
export default { Select, SelectItem, SelectTrigger, SelectContent, SelectValue }
