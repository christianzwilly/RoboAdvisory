import React from 'react'
export function Label({ className='', ...props }){ return <label className={['text-sm text-gray-600', className].join(' ')} {...props} /> }
export default Label
