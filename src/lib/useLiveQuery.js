import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export function useLiveQuery(queryFn, deps = []) {
  const [data, setData] = useState(undefined)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    try {
      const result = await queryFn()
      setData(result)
    } catch (e) {
      console.error('useLiveQuery:', e)
    }
  }, deps)

  useEffect(() => {
    run()
    const channel = supabase
      .channel('live-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public' }, run)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [run])

  return data
}
