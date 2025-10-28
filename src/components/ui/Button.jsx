import React from 'react'
export function Button({ className='', variant='default', size='default', ...props }){
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2';
  const variants = {
    default: 'bg-[var(--ocbc-red,#d71920)] text-white hover:opacity-90',
    outline: 'border border-gray-300 hover:bg-gray-50',
    ghost: 'hover:bg-gray-100',
    secondary: 'bg-gray-900 text-white hover:bg-black'
  };
  return <button className={[base, variants[variant]||variants.default, className].join(' ')} {...props} />
}
export default Button
