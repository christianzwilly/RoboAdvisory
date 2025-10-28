import React, { useState } from 'react'
import OCBCFlow from './ocbc/OCBCOnboardingFlow.jsx'

export default function App(){
  const [mode, setMode] = useState('web')
  return <div className="min-h-screen">
    <OCBCFlow />
  </div>
}
