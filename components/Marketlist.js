import MarketCard from "./MarketCard"

export default function MarketList({ markets }) {

  return (
    <div className="grid md:grid-cols-3 gap-4">

      {markets.map((m) => (
        <MarketCard key={m.id} market={m} />
      ))}

    </div>
  )
}