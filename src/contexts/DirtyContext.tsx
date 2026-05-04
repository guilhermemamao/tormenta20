import { createContext, useContext, useRef } from 'react'

interface DirtyContextType {
  isDirtyRef: React.MutableRefObject<boolean>
}

const DirtyContext = createContext<DirtyContextType>({
  isDirtyRef: { current: false }
})

export function DirtyProvider({ children }: { children: React.ReactNode }) {
  const isDirtyRef = useRef(false)
  return (
    <DirtyContext.Provider value={{ isDirtyRef }}>
      {children}
    </DirtyContext.Provider>
  )
}

export function useDirty() {
  return useContext(DirtyContext)
}
