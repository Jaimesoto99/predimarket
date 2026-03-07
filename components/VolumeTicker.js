import { useEffect, useState } from "react"

export default function VolumeTicker({ volume }) {

  const [display, setDisplay] = useState(volume)

  useEffect(() => {

    const interval = setInterval(() => {

      setDisplay((v) =>
        v + Math.floor(Math.random() * 50)
      )

    }, 3000)

    return () => clearInterval(interval)

  }, [])

  return (

    <span className="text-xs text-gray-500">
      Vol ${display}
    </span>

  )

}