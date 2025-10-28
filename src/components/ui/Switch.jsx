import React from 'react'
export function Switch({ checked, onCheckedChange }){
  return <label className="inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" checked={checked} onChange={e=>onCheckedChange?.(e.target.checked)} />
    <div className="w-11 h-6 bg-gray-300 peer-checked:bg-[var(--ocbc-red,#d71920)] rounded-full relative transition-colors">
      <div className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-all peer-checked:translate-x-5" />
    </div>
  </label>
}
export default Switch
