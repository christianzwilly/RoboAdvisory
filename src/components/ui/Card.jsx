import React from 'react'
export function Card({ className='', children }){ return <div className={'bg-white rounded-xl shadow-sm border border-gray-200 '+className}>{children}</div>}
export function CardHeader({ className='', children }){ return <div className={'px-5 pt-5 '+className}>{children}</div>}
export function CardTitle({ className='', children }){ return <h3 className={'text-lg font-semibold '+className}>{children}</h3>}
export function CardDescription({ className='', children }){ return <p className={'text-sm text-gray-500 '+className}>{children}</p>}
export function CardContent({ className='', children }){ return <div className={'px-5 pb-5 '+className}>{children}</div>}
export default { Card, CardHeader, CardTitle, CardContent, CardDescription }
