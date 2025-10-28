import React, { useState } from 'react'
export function Dialog({ children }){ return <>{children}</> }
export function DialogTrigger({ children }){ return <>{children}</> }
export function DialogContent({ children }){ return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">{children}</div></div> }
export function DialogHeader({ children }){ return <div className="mb-4">{children}</div> }
export function DialogTitle({ children }){ return <h3 className="text-lg font-semibold">{children}</h3> }
export function DialogDescription({ children }){ return <p className="text-sm text-gray-500">{children}</p> }
export default { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription }
