import { useEffect, useState } from "react"
import MarketCard from "./MarketCard"

export default function InfiniteMarkets({ markets }) {

  const [visible, setVisible] = useState(12)

  const loadMore = () => {
    setVisible((v) => v + 12)
  }

  useEffect(() => {

    const handleScroll = () => {

      if (
        window.innerHeight + window.scrollY
        >= document.body.offsetHeight - 400
      ) {
        loadMore()
      }

    }

    window.addEventListener("scroll", handleScroll)

    return () =>
      window.removeEventListener("scroll", handleScroll)

  }, [])

  return (

    <div className="grid md:grid-cols-3 gap-4">

      {markets.slice(0, visible).map((m) => (
        <MarketCard key={m.id} market={m} />
      ))}

    </div>

  )
}